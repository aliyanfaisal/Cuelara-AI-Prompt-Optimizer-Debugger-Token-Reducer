import { NextResponse } from "next/server";
import { z } from "zod";
import { setReaction } from "@/lib/engagement";
import { REACTION_TYPES } from "@/lib/reactions";

export const runtime = "nodejs";

const bodySchema = z.object({
  subject: z.enum(["blog", "cookbook"]),
  subjectId: z.string().min(1),
  type: z.enum(REACTION_TYPES as [string, ...string[]]).nullable(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 422 });

  const { subject, subjectId, type } = parsed.data;
  const summary = await setReaction(subject, subjectId, type as Parameters<typeof setReaction>[2]);
  return NextResponse.json(summary);
}
