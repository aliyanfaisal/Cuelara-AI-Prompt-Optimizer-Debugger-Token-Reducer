import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText, isSupportedFile, UnsupportedFileTypeError } from "@/lib/rag/parse";
import { chunkText } from "@/lib/rag/chunk";
import { embedTexts, EMBEDDING_MODEL } from "@/lib/rag/embed";
import { callWithKeyRotation, NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { rankTopK } from "@/lib/rag/similarity";
import { saveDocument, DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { getContextExtractorLimits } from "@/lib/rag/limits";
import { hasReachedDailyLimit, consumeDailyLimit, getUsedToday, getRequestSubject } from "@/lib/rate-limit";
import { CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY } from "@/lib/tool-settings-keys";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { countPromptTokens } from "@/lib/token-count";

const DEFAULT_MAX_FILE_MB = 5;

async function getMaxFileBytes(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY } });
  const parsed = setting?.value ? parseInt(setting.value, 10) : NaN;
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_MB;
  return mb * 1024 * 1024;
}

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const { documentLimit, promptLimit } = await getContextExtractorLimits(subject);

    if (await hasReachedDailyLimit(subjectKey, DOCUMENT_TOOL, documentLimit)) {
      return NextResponse.json(
        { error: `You've used your ${documentLimit} free document${documentLimit === 1 ? "" : "s"} for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }
    if (await hasReachedDailyLimit(subjectKey, PROMPT_TOOL, promptLimit)) {
      return NextResponse.json(
        { error: `You've used your ${promptLimit} free prompts for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const rawText = formData.get("rawText");
    const searchQuery = formData.get("searchQuery");
    const depth = formData.get("depth");

    if (typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json({ error: "A search target is required." }, { status: 400 });
    }
    // aiTask is optional — the client omits it in "data only" mode, since it's only
    // used to build the prompt wrapper on the client, not for retrieval itself.

    const hasFile = file instanceof File && file.size > 0;
    const hasRawText = typeof rawText === "string" && rawText.trim().length > 0;
    if (!hasFile && !hasRawText) {
      return NextResponse.json({ error: "Provide a document or paste raw text." }, { status: 400 });
    }

    let sourceText: string;
    let filename: string;

    if (hasFile) {
      const uploadedFile = file as File;
      if (!isSupportedFile(uploadedFile.name)) {
        return NextResponse.json({ error: "Unsupported file type. Use PDF, TXT, CSV, MD, JSON, or DOCX." }, { status: 400 });
      }

      const maxBytes = await getMaxFileBytes();
      if (uploadedFile.size > maxBytes) {
        return NextResponse.json({ error: `File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit.` }, { status: 413 });
      }

      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      try {
        sourceText = await extractText(buffer, uploadedFile.name);
      } catch (err) {
        if (err instanceof UnsupportedFileTypeError) {
          return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
        }
        console.error("Context Extractor parse error:", err);
        return NextResponse.json({ error: "Could not read this document. It may be corrupted or password-protected." }, { status: 400 });
      }
      filename = uploadedFile.name;
    } else {
      sourceText = rawText as string;
      filename = "raw-text.txt";
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error: "No extractable text was found in the source." }, { status: 400 });
    }

    const chunks = chunkText(sourceText);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No extractable text was found in the source." }, { status: 400 });
    }

    const k = depth === "top5" ? 5 : 3;

    let chunkEmbeddings: number[][];
    let queryEmbeddings: number[][];
    try {
      [chunkEmbeddings, queryEmbeddings] = await callWithKeyRotation(
        "gemini",
        (apiKey) =>
          Promise.all([
            embedTexts(chunks.map((c) => c.content), "RETRIEVAL_DOCUMENT", apiKey),
            embedTexts([searchQuery], "RETRIEVAL_QUERY", apiKey),
          ]),
        { tool: DOCUMENT_TOOL, model: EMBEDDING_MODEL }
      );
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    const snippets = rankTopK(chunks, chunkEmbeddings, queryEmbeddings[0], Math.min(k, chunks.length));
    const originalTokens = Math.max(1, countPromptTokens(sourceText));

    const documentId = await saveDocument(subjectKey, filename, originalTokens, chunks, chunkEmbeddings);

    // Only counts against quota once the costly work has actually happened — uploading
    // a document spends both a "document" slot and a "prompt" slot (this first query).
    await Promise.all([consumeDailyLimit(subjectKey, DOCUMENT_TOOL), consumeDailyLimit(subjectKey, PROMPT_TOOL)]);

    const [documentsUsed, promptsUsed] = await Promise.all([
      getUsedToday(subjectKey, DOCUMENT_TOOL),
      getUsedToday(subjectKey, PROMPT_TOOL),
    ]);

    return NextResponse.json({
      documentId,
      originalTokens,
      snippets,
      isAuthenticated,
      documentsRemaining: Math.max(0, documentLimit - documentsUsed),
      documentsLimit: documentLimit,
      promptsRemaining: Math.max(0, promptLimit - promptsUsed),
      promptsLimit: promptLimit,
    });
  } catch (error) {
    console.error("Context Extractor error:", error);
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    // Every key in the rotation pool was tried and all hit a rate limit/quota/overload error.
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error)) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while processing your document." }, { status: 500 });
  }
}
