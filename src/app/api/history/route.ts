import { NextResponse } from "next/server";
import { saveToolRun, titleFrom } from "@/lib/history";
import { getSessionUser } from "@/lib/session-user";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 600_000;

/**
 * Saves a run for a tool that never calls the server itself (Diff & Cost Estimate compares in the browser).
 * The other tools save their own runs inside their API routes, so only this tool is accepted here.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ saved: false }, { status: 200 }); // anonymous visitors simply aren't saved

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Too large to save." }, { status: 413 });

  let body: { tool?: unknown; basePrompt?: unknown; newPrompt?: unknown; historyId?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (body?.tool !== "compare-estimate") return NextResponse.json({ error: "Unsupported tool." }, { status: 400 });

  const basePrompt = typeof body.basePrompt === "string" ? body.basePrompt : "";
  const newPrompt = typeof body.newPrompt === "string" ? body.newPrompt : "";
  if (!basePrompt.trim() && !newPrompt.trim()) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const id = await saveToolRun({
    userId: user.id,
    tool: "compare-estimate",
    title: titleFrom(newPrompt || basePrompt),
    input: { basePrompt, newPrompt },
    result: { compared: true },
    historyId: body.historyId,
  });
  return NextResponse.json({ saved: id !== null, id });
}
