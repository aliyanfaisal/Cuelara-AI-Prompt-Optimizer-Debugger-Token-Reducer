import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { historyToolLabel } from "@/lib/history";
import { listWorkspaces } from "@/lib/workspace";
import { PromptLibrary, type LibraryPrompt } from "./PromptLibrary";

export const metadata = { title: "Workspace" };

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const session = (await getSessionUser())!;
  const { w } = await searchParams;
  const workspaces = await listWorkspaces(session.id);
  // Only a workspace the user belongs to can be opened; anything else falls back to their personal one.
  const current = workspaces.find((x) => x.id === w) ?? workspaces[0];

  const rows = await prisma.savedPrompt.findMany({
    where: { workspaceId: current.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, tags: true, sourceTool: true, updatedAt: true, authorId: true, author: { select: { name: true, email: true } } },
  });
  const prompts: LibraryPrompt[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    sourceLabel: r.sourceTool ? historyToolLabel(r.sourceTool) : null,
    updatedAt: r.updatedAt.toISOString(),
    authorId: r.authorId,
    authorName: r.author.name || r.author.email || "Unknown",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Workspace</h2>
        <p className="text-sm text-muted-foreground">Your saved prompts. Use “Save to workspace” on any tool result to add one here.</p>
      </div>

      {workspaces.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Workspaces">
          {workspaces.map((x) => (
            <Link
              key={x.id}
              href={`/dashboard/workspace?w=${x.id}`}
              role="tab"
              aria-selected={x.id === current.id}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${x.id === current.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {x.type === "team" ? `👥 ${x.name}` : x.name}
            </Link>
          ))}
        </div>
      )}

      <PromptLibrary key={current.id} workspaceId={current.id} isTeam={current.type === "team"} role={current.role} userId={session.id} prompts={prompts} />
    </div>
  );
}
