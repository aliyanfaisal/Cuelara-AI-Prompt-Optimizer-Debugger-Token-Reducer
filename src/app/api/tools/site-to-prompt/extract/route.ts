import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { getSiteToPromptLimits } from "@/lib/site-to-prompt/limits";
import { EXTRACT_TOOL, MAX_URL_LENGTH } from "@/lib/site-to-prompt/constants";
import { rawPageSchema } from "@/lib/site-to-prompt/schema";
import { buildDesignDna } from "@/lib/site-to-prompt/aggregate";

const MIN_SAMPLES = 5;
const MAX_BODY_BYTES = 2_000_000;

/** The extension measures the page in the user's browser; this route turns those measurements into the Design DNA. */
export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const { extractLimit } = await getSiteToPromptLimits(subject);

    if (await hasReachedDailyLimit(subjectKey, EXTRACT_TOOL, extractLimit)) {
      return NextResponse.json(
        { error: `You've used your ${extractLimit} free site analyses for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "That page produced too much data to analyse." }, { status: 413 });
    }

    const body = await req.json().catch(() => null);
    const parsed = rawPageSchema.safeParse(body?.raw);
    if (!parsed.success) return NextResponse.json({ error: "The page measurements were invalid. Please try again." }, { status: 400 });
    if (parsed.data.samples.length < MIN_SAMPLES) {
      return NextResponse.json(
        { error: "That page rendered almost nothing — it may need a login, still be loading, or block scripts. Try again once it has loaded." },
        { status: 422 }
      );
    }

    const url = typeof body?.url === "string" && body.url.length <= MAX_URL_LENGTH ? body.url : null;
    const dna = buildDesignDna(parsed.data, url);

    await consumeDailyLimit(subjectKey, EXTRACT_TOOL);
    const used = await getUsedToday(subjectKey, EXTRACT_TOOL);
    return NextResponse.json({
      dna,
      isAuthenticated,
      analysesRemaining: Math.max(0, extractLimit - used),
      analysesLimit: extractLimit,
    });
  } catch (error) {
    console.error("Site to Prompt extract error:", error);
    return NextResponse.json({ error: "Something went wrong while analysing that site." }, { status: 500 });
  }
}
