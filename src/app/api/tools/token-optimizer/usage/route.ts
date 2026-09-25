import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { reportError } from "@/lib/error-report";

const TOOL = "token-optimizer";

export async function GET(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getTokenOptimizerLimit(subject);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Token Optimizer usage error:", error);
    void reportError(error, { source: "api", route: "/api/tools/token-optimizer/usage" });
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
