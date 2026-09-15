import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";

const TOOL = "token-optimizer";

export async function GET(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getTokenOptimizerLimit(isAuthenticated);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Token Optimizer usage error:", error);
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
