import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-debugger";

export async function GET(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptDebuggerLimit(subject);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Debugger usage error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-debugger/usage" });
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
