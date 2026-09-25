import { NextResponse } from "next/server";
import { hitAbuseLimit } from "@/lib/abuse-limit";
import { reportError } from "@/lib/error-report";
import { getSessionUser } from "@/lib/session-user";
import { ensurePersonalWorkspace, savePrompt } from "@/lib/workspace";

const MAX_BODY_BYTES = 128 * 1024;

/** Saves a tool result into a workspace library — the personal one unless `workspaceId` names a team the user belongs to. */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Sign in to save prompts." }, { status: 401 });

    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "That prompt is too large to save." }, { status: 413 });
    const body = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    if (!body || typeof body.content !== "string") return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

    const limit = await hitAbuseLimit({ scope: "save-prompt", subject: me.id, limit: 60, windowSeconds: 60 * 60 });
    if (!limit.allowed) return NextResponse.json({ error: "You're saving prompts very quickly. Please wait a bit." }, { status: 429 });

    const workspaceId = typeof body.workspaceId === "string" && body.workspaceId ? body.workspaceId : (await ensurePersonalWorkspace(me.id)).id;
    const result = await savePrompt(me.id, workspaceId, {
      title: typeof body.title === "string" ? body.title : "",
      content: body.content,
      tags: body.tags,
      sourceTool: typeof body.tool === "string" ? body.tool : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ id: result.id, workspaceId });
  } catch (error) {
    console.error("Save prompt error:", error);
    void reportError(error, { source: "api", route: "/api/workspace/prompts" });
    return NextResponse.json({ error: "Couldn't save the prompt. Please try again." }, { status: 500 });
  }
}
