import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getIntelligenceScoreLimit } from "@/lib/intelligence-score/limits";

const TOOL = "intelligence-score";

export async function GET(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getIntelligenceScoreLimit(isAuthenticated);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Intelligence Score usage error:", error);
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
