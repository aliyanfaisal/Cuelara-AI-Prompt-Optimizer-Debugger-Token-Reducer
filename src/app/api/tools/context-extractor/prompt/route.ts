import { NextResponse } from "next/server";
import { embedTexts, EMBEDDING_MODEL } from "@/lib/rag/embed";
import { rankTopK } from "@/lib/rag/similarity";
import { loadDocumentForSubject, DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { getContextExtractorLimits } from "@/lib/rag/limits";
import { hasReachedDailyLimit, consumeDailyLimit, getUsedToday, getRequestSubject } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { callWithKeyRotation, NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { sanitizeExtractorMeta, saveExtractorRun } from "@/lib/rag/history";
import { reportError } from "@/lib/error-report";

// Re-runs a different query against a document that was already uploaded, parsed,
// chunked and embedded — only the new query gets embedded here, so this only ever
// spends a "prompt" slot, never a "document" slot.
export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const { documentLimit, promptLimit } = await getContextExtractorLimits(subject);

    if (await hasReachedDailyLimit(subjectKey, PROMPT_TOOL, promptLimit)) {
      return NextResponse.json(
        { error: `You've used your ${promptLimit} free prompts for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { documentId, searchQuery, depth } = body ?? {};

    if (typeof documentId !== "string" || !documentId) {
      return NextResponse.json({ error: "Missing document reference." }, { status: 400 });
    }
    if (typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json({ error: "A search target is required." }, { status: 400 });
    }
    // aiTask is optional — only used client-side to build the prompt wrapper.

    const document = await loadDocumentForSubject(documentId, subjectKey);
    if (!document) {
      return NextResponse.json(
        { error: "This document is no longer available — please re-upload it to try another prompt.", expired: true },
        { status: 404 }
      );
    }

    const k = depth === "top5" ? 5 : 3;

    let queryEmbeddings: number[][];
    try {
      queryEmbeddings = await callWithKeyRotation(
        "gemini",
        (apiKey) => embedTexts([searchQuery], "RETRIEVAL_QUERY", apiKey),
        { tool: PROMPT_TOOL, model: EMBEDDING_MODEL }
      );
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }
    const snippets = rankTopK(document.chunks, document.chunkEmbeddings, queryEmbeddings[0], Math.min(k, document.chunks.length));

    await consumeDailyLimit(subjectKey, PROMPT_TOOL);
    await saveExtractorRun({
      userId: subject.userId,
      meta: sanitizeExtractorMeta(body?.history),
      searchQuery,
      depth: k === 5 ? "top5" : "top3",
      documentId,
      originalTokens: document.totalTokens,
      snippets,
    });

    const [documentsUsed, promptsUsed] = await Promise.all([
      getUsedToday(subjectKey, DOCUMENT_TOOL),
      getUsedToday(subjectKey, PROMPT_TOOL),
    ]);

    return NextResponse.json({
      documentId,
      originalTokens: document.totalTokens,
      snippets,
      isAuthenticated,
      documentsRemaining: Math.max(0, documentLimit - documentsUsed),
      documentsLimit: documentLimit,
      promptsRemaining: Math.max(0, promptLimit - promptsUsed),
      promptsLimit: promptLimit,
    });
  } catch (error) {
    console.error("Context Extractor prompt error:", error);
    void reportError(error, { source: "api", route: "/api/tools/context-extractor/prompt" });
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
    return NextResponse.json({ error: "Something went wrong while generating this prompt." }, { status: 500 });
  }
}
