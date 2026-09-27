import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { getOwnPlan } from "@/lib/plans";
import { getSessionUser } from "@/lib/session-user";
import { listWorkspaces } from "@/lib/workspace";
import { CreateTeamForm } from "./TeamManager";

export const metadata = { title: "Team" };

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };

export default async function TeamPage() {
  const session = (await getSessionUser())!;
  const [plan, workspaces] = await Promise.all([getOwnPlan(session.id), listWorkspaces(session.id)]);
  const teams = workspaces.filter((w) => w.type === "team");
  const canCreate = (plan?.maxSeats ?? 0) > 0 && !teams.some((t) => t.role === "OWNER");

  // Only one team? Skip the picker and go straight into its dedicated dashboard.
  if (teams.length === 1) redirect(`/team/${teams[0].id}`);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Team</h2>
        <p className="text-sm text-muted-foreground">Invite people to a shared prompt library. Everyone on the team gets the Team plan&rsquo;s daily limits.</p>
      </div>

      {teams.length > 0 && (
        <div className="space-y-3">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/team/${t.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="rounded-xl border border-border bg-muted/40 p-2.5 text-muted-foreground shrink-0 group-hover:text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground">You are {ROLE_LABEL[t.role]?.toLowerCase() ?? t.role.toLowerCase()}</div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}

      {canCreate && <CreateTeamForm seats={plan?.maxSeats ?? 0} planName={plan?.name ?? "your plan"} />}

      {teams.length === 0 && !canCreate && (
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
