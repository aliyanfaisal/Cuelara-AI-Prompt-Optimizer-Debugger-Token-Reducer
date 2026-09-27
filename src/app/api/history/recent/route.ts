import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { historyToolLabel } from "@/lib/history";
import { extractInputText, extractResultText } from "@/lib/history-preview";

export const runtime = "nodejs";

const LIMIT = 20;

/** Recent runs across every tool, with just the reusable prompt text (see history-preview.ts) — used by
 * "Insert from history" pickers so a tool's input can be filled from something typed or generated elsewhere. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to reuse a previous run." }, { status: 401 });

  const runs = await prisma.toolRun.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: LIMIT,
    select: { id: true, tool: true, title: true, updatedAt: true, input: true, result: true },
  });

  const items = runs
    .map((r) => ({
      id: r.id,
      tool: r.tool,
      label: historyToolLabel(r.tool),
      title: r.title,
      updatedAt: r.updatedAt,
      inputText: extractInputText(r.tool, r.input),
      resultText: extractResultText(r.tool, r.result),
    }))
    .filter((r) => r.inputText || r.resultText);

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
