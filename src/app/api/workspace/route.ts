import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { listWorkspaces } from "@/lib/workspace";

/** The workspaces the signed-in user can save prompts into (their personal one plus any teams). */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Sign in to save prompts." }, { status: 401 });
  const workspaces = await listWorkspaces(me.id);
  return NextResponse.json({ workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, type: w.type })) });
}
