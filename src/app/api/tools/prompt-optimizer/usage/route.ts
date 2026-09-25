import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-optimizer";

export async function GET(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptOptimizerLimit(subject);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Optimizer usage error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-optimizer/usage" });
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
