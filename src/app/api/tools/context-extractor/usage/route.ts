import { NextResponse } from "next/server";
import { DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { getContextExtractorLimits } from "@/lib/rag/limits";
import { getUsedToday, getRequestSubject } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const { documentLimit, promptLimit } = await getContextExtractorLimits(isAuthenticated);

    const [documentsUsed, promptsUsed] = await Promise.all([
      getUsedToday(subjectKey, DOCUMENT_TOOL),
      getUsedToday(subjectKey, PROMPT_TOOL),
    ]);

    return NextResponse.json({
      isAuthenticated,
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
