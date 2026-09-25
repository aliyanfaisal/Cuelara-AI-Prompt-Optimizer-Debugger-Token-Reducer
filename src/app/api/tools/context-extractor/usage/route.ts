import { NextResponse } from "next/server";
import { DOCUMENT_TOOL, PROMPT_TOOL } from "@/lib/rag/documents";
import { getContextExtractorLimits } from "@/lib/rag/limits";
import { getUsedToday, getRequestSubject } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-report";

export async function GET(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const { documentLimit, promptLimit } = await getContextExtractorLimits(subject);

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
    void reportError(error, { source: "api", route: "/api/tools/context-extractor/usage" });
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
