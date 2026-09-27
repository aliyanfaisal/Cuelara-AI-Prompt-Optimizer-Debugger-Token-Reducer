import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getPoolToday } from "@/lib/team-analytics";
import { seatUsage, type TeamRole } from "@/lib/workspace";
import { TeamOverview, type TeamOverviewData } from "./TeamOverview";

export const metadata = { title: "Overview" };

export default async function TeamOverviewPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getSessionUser())!;
  const { teamId } = await params;

  // Membership (and that this workspace is a team) is already verified by the layout above this page.
  const [member, members, invites, seats, pool, ws] = await Promise.all([
    prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: teamId, userId: session.id } }, select: { role: true } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: teamId },
      select: { role: true, createdAt: true, shareHistory: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceInvite.findMany({ where: { workspaceId: teamId }, orderBy: { createdAt: "desc" } }),
    seatUsage(teamId),
    getPoolToday(teamId),
    prisma.workspace.findUnique({ where: { id: teamId }, select: { name: true, sharedHistory: true } }),
  ]);

  const myRole = (member?.role ?? "MEMBER") as TeamRole;
  const canSee = myRole === "OWNER" || myRole === "ADMIN";

  const data: TeamOverviewData = {
    id: teamId,
    name: ws?.name ?? "",
    myRole,
    myId: session.id,
    seats,
    pool,
    sharedHistory: ws?.sharedHistory ?? true,
    myShare: members.find((m) => m.user.id === session.id)?.shareHistory ?? true,
    members: members.map((m) => ({ userId: m.user.id, name: m.user.name, email: m.user.email ?? "", role: m.role, joinedAt: m.createdAt.toISOString() })),
    invites: canSee ? invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString(), expired: i.expiresAt < new Date() })) : [],
  };

  return <TeamOverview team={data} />;
}
