import { NextResponse } from "next/server";
import { DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { getDailyLimit, getUsedToday, getClientIp } from "@/lib/rate-limit";
import { CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY } from "@/lib/tool-settings-keys";

const DEFAULT_DOCUMENT_DAILY_LIMIT = 2;
const DEFAULT_PROMPT_DAILY_LIMIT = 50;

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);

    const [documentLimit, promptLimit, documentsUsed, promptsUsed] = await Promise.all([
      getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT),
      getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, DEFAULT_PROMPT_DAILY_LIMIT),
      getUsedToday(ip, DOCUMENT_TOOL),
      getUsedToday(ip, PROMPT_TOOL),
    ]);

    return NextResponse.json({
      documentsRemaining: Math.max(0, documentLimit - documentsUsed),
      documentsLimit: documentLimit,
      promptsRemaining: Math.max(0, promptLimit - promptsUsed),
      promptsLimit: promptLimit,
    });
  } catch (error) {
    console.error("Context Extractor usage error:", error);
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
