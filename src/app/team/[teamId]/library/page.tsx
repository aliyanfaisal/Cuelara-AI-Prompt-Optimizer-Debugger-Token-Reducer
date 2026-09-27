import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { historyToolLabel } from "@/lib/history";
import { PromptLibrary, type LibraryPrompt } from "@/app/dashboard/workspace/PromptLibrary";

export const metadata = { title: "Prompt Library" };

export default async function TeamLibraryPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getSessionUser())!;
  const { teamId } = await params;

  // Membership is already verified by the layout above this page.
  const [member, rows] = await Promise.all([
    prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: teamId, userId: session.id } }, select: { role: true } }),
    prisma.savedPrompt.findMany({
      where: { workspaceId: teamId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, content: true, tags: true, sourceTool: true, updatedAt: true, authorId: true, author: { select: { name: true, email: true } } },
    }),
  ]);

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
        <h2 className="text-xl font-bold text-foreground">Prompt Library</h2>
        <p className="text-sm text-muted-foreground">Your team&rsquo;s saved prompts. Use “Save to workspace” on any tool result to add one here.</p>
      </div>
      <PromptLibrary workspaceId={teamId} isTeam role={member?.role ?? "MEMBER"} userId={session.id} prompts={prompts} />
    </div>
  );
}
