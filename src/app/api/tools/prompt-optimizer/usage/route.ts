import { NextResponse } from "next/server";
import { getRequestSubject, getUsedToday } from "@/lib/rate-limit";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";

const TOOL = "prompt-optimizer";

export async function GET(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getPromptOptimizerLimit(isAuthenticated);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Optimizer usage error:", error);
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
