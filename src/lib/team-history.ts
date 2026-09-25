import "server-only";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/workspace";

export type ToggleResult = { ok: true } | { ok: false; error: string };

/** A member opts their own runs in or out of the team's shared history. */
export async function setMemberShareHistory(userId: string, workspaceId: string, share: boolean): Promise<ToggleResult> {
  const { count } = await prisma.workspaceMember.updateMany({ where: { workspaceId, userId, workspace: { type: "team" } }, data: { shareHistory: share } });
  return count ? { ok: true } : { ok: false, error: "Team not found." };
}

/** The owner switches shared history on or off for the whole team. */
export async function setTeamSharedHistory(actorId: string, workspaceId: string, enabled: boolean): Promise<ToggleResult> {
  if ((await getRole(actorId, workspaceId)) !== "OWNER") return { ok: false, error: "Only the team owner can change this." };
  await prisma.workspace.updateMany({ where: { id: workspaceId, type: "team" }, data: { sharedHistory: enabled } });
  return { ok: true };
}

export interface TeamRun {
  id: string;
  tool: string;
  title: string;
  input: unknown;
  updatedAt: Date;
  memberId: string;
  memberName: string;
}

export interface TeamRunPage {
  enabled: boolean;
  runs: TeamRun[];
  total: number;
  members: { id: string; name: string }[];
}

/**
 * The team's shared history as the viewer sees it. Only runs from members who share, and only from the day each
 * joined onwards (what someone did before joining was never shared with this team). Null if the viewer isn't a member.
 */
export async function listTeamRuns(
  viewerId: string,
  workspaceId: string,
  opts: { tool?: string; memberId?: string; skip: number; take: number }
): Promise<TeamRunPage | null> {
  if (!(await getRole(viewerId, workspaceId))) return null;
  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, type: "team" },
    select: { sharedHistory: true, members: { select: { userId: true, shareHistory: true, createdAt: true, user: { select: { name: true, email: true } } } } },
  });
  if (!ws) return null;

  const sharing = ws.members.filter((m) => m.shareHistory);
  const nameOf = new Map(ws.members.map((m) => [m.userId, m.user.name || m.user.email || "Member"]));
  const members = sharing.map((m) => ({ id: m.userId, name: nameOf.get(m.userId)! }));
  if (!ws.sharedHistory || sharing.length === 0) return { enabled: ws.sharedHistory, runs: [], total: 0, members };

  const scope = opts.memberId ? sharing.filter((m) => m.userId === opts.memberId) : sharing;
  if (scope.length === 0) return { enabled: true, runs: [], total: 0, members };
  const where = {
    ...(opts.tool ? { tool: opts.tool } : {}),
    OR: scope.map((m) => ({ userId: m.userId, createdAt: { gte: m.createdAt } })),
  };
  const [rows, total] = await Promise.all([
    prisma.toolRun.findMany({ where, orderBy: { updatedAt: "desc" }, skip: opts.skip, take: opts.take, select: { id: true, tool: true, title: true, input: true, updatedAt: true, userId: true } }),
    prisma.toolRun.count({ where }),
  ]);
  return { enabled: true, runs: rows.map((r) => ({ id: r.id, tool: r.tool, title: r.title, input: r.input, updatedAt: r.updatedAt, memberId: r.userId, memberName: nameOf.get(r.userId) ?? "Member" })), total, members };
}

/**
 * A run the viewer may open: their own, or a teammate's that the team's shared history exposes to them (same rules as
 * listTeamRuns). Anything else looks exactly like a missing run.
 */
export async function getRunForViewer(id: string, viewerId: string) {
  const run = await prisma.toolRun.findUnique({ where: { id }, select: { id: true, tool: true, title: true, input: true, result: true, userId: true, createdAt: true } });
  if (!run) return null;
  const { userId: ownerId, createdAt, ...visible } = run;
  if (ownerId === viewerId) return visible;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: ownerId, shareHistory: true, workspace: { type: "team", sharedHistory: true, members: { some: { userId: viewerId } } } },
    select: { createdAt: true },
  });
  return membership && createdAt >= membership.createdAt ? visible : null;
}
