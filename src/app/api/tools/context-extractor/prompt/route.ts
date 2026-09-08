import { NextResponse } from "next/server";
import { embedTexts, getGeminiApiKey } from "@/lib/rag/embed";
import { rankTopK } from "@/lib/rag/similarity";
import { loadDocumentForIp, DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { hasReachedDailyLimit, consumeDailyLimit, getDailyLimit, getUsedToday, getClientIp } from "@/lib/rate-limit";
import { CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY } from "@/lib/tool-settings-keys";

const DEFAULT_DOCUMENT_DAILY_LIMIT = 2;
const DEFAULT_PROMPT_DAILY_LIMIT = 50;

// Re-runs a different query against a document that was already uploaded, parsed,
// chunked and embedded — only the new query gets embedded here, so this only ever
// spends a "prompt" slot, never a "document" slot.
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const promptLimit = await getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, DEFAULT_PROMPT_DAILY_LIMIT);
    if (await hasReachedDailyLimit(ip, PROMPT_TOOL, promptLimit)) {
      return NextResponse.json(
        { error: `You've used your ${promptLimit} free prompts for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { documentId, searchQuery, aiTask, depth } = body ?? {};

    if (typeof documentId !== "string" || !documentId) {
      return NextResponse.json({ error: "Missing document reference." }, { status: 400 });
    }
    if (typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json({ error: "A search target is required." }, { status: 400 });
    }
    if (typeof aiTask !== "string" || !aiTask.trim()) {
      return NextResponse.json({ error: "An AI task instruction is required." }, { status: 400 });
    }

    const document = await loadDocumentForIp(documentId, ip);
    if (!document) {
      return NextResponse.json(
        { error: "This document is no longer available — please re-upload it to try another prompt.", expired: true },
        { status: 404 }
      );
    }

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
    }

    const k = depth === "top5" ? 5 : 3;

    const queryEmbeddings = await embedTexts([searchQuery], "RETRIEVAL_QUERY", apiKey);
    const snippets = rankTopK(document.chunks, document.chunkEmbeddings, queryEmbeddings[0], Math.min(k, document.chunks.length));

    await consumeDailyLimit(ip, PROMPT_TOOL);

    const [documentLimit, documentsUsed, promptsUsed] = await Promise.all([
      getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT),
      getUsedToday(ip, DOCUMENT_TOOL),
      getUsedToday(ip, PROMPT_TOOL),
    ]);

    return NextResponse.json({
      documentId,
      originalTokens: document.totalTokens,
      snippets,
      documentsRemaining: Math.max(0, documentLimit - documentsUsed),
      documentsLimit: documentLimit,
      promptsRemaining: Math.max(0, promptLimit - promptsUsed),
      promptsLimit: promptLimit,
    });
  } catch (error) {
    console.error("Context Extractor prompt error:", error);
    return NextResponse.json({ error: "Something went wrong while generating this prompt." }, { status: 500 });
  }
}
