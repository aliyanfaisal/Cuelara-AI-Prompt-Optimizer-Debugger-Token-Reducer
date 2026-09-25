import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getSiteToPromptLimits } from "@/lib/site-to-prompt/limits";
import { EXTRACT_TOOL, PROMPT_TOOL } from "@/lib/site-to-prompt/constants";
import { reportError } from "@/lib/error-report";

export async function GET(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const { extractLimit, promptLimit } = await getSiteToPromptLimits(subject);
    const [extractUsed, promptUsed] = await Promise.all([getUsedToday(subjectKey, EXTRACT_TOOL), getUsedToday(subjectKey, PROMPT_TOOL)]);
    return NextResponse.json({
      isAuthenticated,
      analysesRemaining: Math.max(0, extractLimit - extractUsed),
      analysesLimit: extractLimit,
      promptsRemaining: Math.max(0, promptLimit - promptUsed),
      promptsLimit: promptLimit,
    });
  } catch (error) {
    console.error("Site to Prompt usage error:", error);
    void reportError(error, { source: "api", route: "/api/tools/site-to-prompt/usage" });
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
