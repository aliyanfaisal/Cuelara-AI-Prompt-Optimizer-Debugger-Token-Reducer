import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { historyToolLabel } from "@/lib/history";
import { extractInputText, extractResultText } from "@/lib/history-preview";
import { listWorkspaces } from "@/lib/workspace";

export const runtime = "nodejs";

const LIMIT = 20;

/** Recent runs across every tool, with just the reusable prompt text (see history-preview.ts), plus the
 * user's saved workspace prompts — used by "Insert from history" pickers so a tool's input can be filled
 * from something typed or generated elsewhere, without retyping it. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to reuse a previous run." }, { status: 401 });

  const workspaces = await listWorkspaces(user.id);

  const [runs, saved] = await Promise.all([
    prisma.toolRun.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: { id: true, tool: true, title: true, updatedAt: true, input: true, result: true },
    }),
    prisma.savedPrompt.findMany({
      where: { workspaceId: { in: workspaces.map((w) => w.id) } },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: { id: true, title: true, content: true, updatedAt: true },
    }),
  ]);

  const items = runs
    .map((r) => ({
      id: r.id,
      kind: "run" as const,
      tool: r.tool,
      label: historyToolLabel(r.tool),
      title: r.title,
      updatedAt: r.updatedAt,
      inputText: extractInputText(r.tool, r.input),
      resultText: extractResultText(r.tool, r.result),
    }))
    .filter((r) => r.inputText || r.resultText);

  const savedItems = saved.map((s) => ({
    id: s.id,
    kind: "saved" as const,
    tool: "workspace",
    label: "Workspace",
    title: s.title,
    updatedAt: s.updatedAt,
    inputText: null,
    resultText: s.content,
  }));

  return NextResponse.json({ items, savedItems }, { headers: { "Cache-Control": "no-store" } });
}
