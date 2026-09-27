import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getRole } from "@/lib/workspace";
import { TeamSidebar } from "./TeamSidebar";

// Per-user and per-team, so it is never prerendered or indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Team", template: "%s | Team | Cuelara" }, robots: { index: false, follow: false } };

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const session = await getSessionUser();
  if (!session) {
    const raw = (await getServerSession(authOptions)) as { error?: string } | null;
    redirect(raw?.error === "SessionReplaced" ? "/login?error=SessionReplaced" : `/login?callbackUrl=/team/${teamId}`);
  }

  // The JWT can outlive the account (deleted or deactivated), so confirm the user still exists.
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isActive: true } });
  if (!user || !user.isActive) redirect("/login?error=Unauthorized+Access");

  // Only someone who actually belongs to this specific team workspace can see its dashboard —
  // getRole returns null for both "no such workspace" and "not a member", so both 404 the same way.
  const [role, workspace] = await Promise.all([
    getRole(session.id, teamId),
    prisma.workspace.findUnique({ where: { id: teamId }, select: { name: true, type: true } }),
  ]);
  if (!role || !workspace || workspace.type !== "team") notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 md:pt-32">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Team · you are {ROLE_LABEL[role].toLowerCase()}</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{workspace.name}</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <TeamSidebar teamId={teamId} role={role} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
