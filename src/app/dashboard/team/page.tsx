import Link from "next/link";
import { Users } from "lucide-react";
import { getOwnPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { listWorkspaces, seatUsage } from "@/lib/workspace";
import { CreateTeamForm, TeamManager, type TeamData } from "./TeamManager";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = (await getSessionUser())!;
  const [plan, workspaces] = await Promise.all([getOwnPlan(session.id), listWorkspaces(session.id)]);
  const teams = workspaces.filter((w) => w.type === "team");
  const canCreate = (plan?.maxSeats ?? 0) > 0 && !teams.some((t) => t.role === "OWNER");

  const data: TeamData[] = await Promise.all(
    teams.map(async (t) => {
      const canSee = t.role === "OWNER" || t.role === "ADMIN";
      const [members, invites, seats] = await Promise.all([
        prisma.workspaceMember.findMany({
          where: { workspaceId: t.id },
          select: { role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        }),
        canSee ? prisma.workspaceInvite.findMany({ where: { workspaceId: t.id }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
        seatUsage(t.id),
      ]);
      return {
        id: t.id,
        name: t.name,
        myRole: t.role,
        myId: session.id,
        seats,
        members: members.map((m) => ({ userId: m.user.id, name: m.user.name, email: m.user.email ?? "", role: m.role, joinedAt: m.createdAt.toISOString() })),
        invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString(), expired: i.expiresAt < new Date() })),
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Team</h2>
        <p className="text-sm text-muted-foreground">Invite people to a shared prompt library. Everyone on the team gets the Team plan&rsquo;s daily limits.</p>
      </div>

      {data.map((t) => (
        <TeamManager key={t.id} team={t} />
      ))}

      {canCreate && <CreateTeamForm seats={plan?.maxSeats ?? 0} planName={plan?.name ?? "your plan"} />}

      {data.length === 0 && !canCreate && (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-xl font-black tracking-tight text-foreground">Work together on prompts</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Team plans include a shared workspace: invite your colleagues by email, share a prompt library, and give everyone the Team plan&rsquo;s higher limits.
            You can also join a team when a manager invites you — check your email.
          </p>
          <Link href="/dashboard/subscription" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            See plans
          </Link>
        </div>
      )}
    </div>
  );
}
