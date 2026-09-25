import { NextResponse } from "next/server";
import { getRunForViewer } from "@/lib/team-history";
import { getSessionUser } from "@/lib/session-user";

export const runtime = "nodejs";

/** One of the signed-in user's own saved runs (or a teammate's shared one), so its tool page can show it without calling the tool again. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to open your history." }, { status: 401 });

  const { id } = await params;
  const run = await getRunForViewer(id, user.id);
  if (!run) return NextResponse.json({ error: "This history item no longer exists." }, { status: 404 });

  return NextResponse.json(run, { headers: { "Cache-Control": "no-store" } });
}
