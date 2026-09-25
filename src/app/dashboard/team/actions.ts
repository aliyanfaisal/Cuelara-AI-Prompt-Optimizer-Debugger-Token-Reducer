"use server";

import { revalidatePath } from "next/cache";
import { hitAbuseLimit, formatWait } from "@/lib/abuse-limit";
import { sendTeamInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import * as team from "@/lib/workspace";

type Result = { success: true; message?: string } | { error: string };

const UNAUTHORIZED: Result = { error: "Please sign in again." };
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const done = (r: team.Result, message?: string): Result => (r.ok ? { success: true, message } : { error: r.error });
const refresh = () => revalidatePath("/dashboard", "layout");

export async function createTeam(name: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.createTeamWorkspace(me.id, name);
  refresh();
  return done(r, "Team created.");
}

export async function renameTeam(workspaceId: string, name: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.renameTeamWorkspace(me.id, workspaceId, name);
  refresh();
  return done(r);
}

export async function deleteTeam(workspaceId: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.deleteTeamWorkspace(me.id, workspaceId);
  refresh();
  return done(r, "Team deleted.");
}

/** Creates the invitation and emails it. The invitation is saved even if the email fails, so it can simply be re-sent. */
export async function inviteMember(workspaceId: string, email: string, role: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;

  // Stops one account from using invitations to spam addresses.
  const cap = await hitAbuseLimit({ scope: "team-invite", subject: me.id, limit: 20, windowSeconds: 24 * 60 * 60 });
  if (!cap.allowed) return { error: `You've sent a lot of invitations today. Try again in ${formatWait(cap.retryAfterSeconds)}.` };

  const created = await team.createInvite({ workspaceId, actorId: me.id, email, role });
  if (!created.ok) return { error: created.error };

  const inviter = await prisma.user.findUnique({ where: { id: me.id }, select: { name: true, email: true } });
  try {
    await sendTeamInviteEmail(created.invite.email, {
      workspaceName: created.invite.workspaceName,
      inviterName: inviter?.name || inviter?.email || "A teammate",
      role: created.invite.role,
      acceptUrl: `${APP_URL}/invite/${created.invite.token}`,
    });
  } catch (error) {
    console.error("Team invite email failed:", error);
    refresh();
    return { error: "The invitation was saved but the email couldn't be sent. Use “Resend” to try again." };
  }
  refresh();
  return { success: true, message: `Invitation sent to ${created.invite.email}.` };
}

export async function revokeInvite(inviteId: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.revokeInvite(me.id, inviteId);
  refresh();
  return done(r);
}

export async function removeTeamMember(workspaceId: string, userId: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.removeMember(me.id, workspaceId, userId);
  refresh();
  return done(r);
}

export async function changeTeamMemberRole(workspaceId: string, userId: string, role: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.changeMemberRole(me.id, workspaceId, userId, role);
  refresh();
  return done(r);
}

export async function leaveTeamWorkspace(workspaceId: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await team.leaveTeam(me.id, workspaceId);
  refresh();
  return done(r, "You left the team.");
}

/** Accepts an emailed invitation as the signed-in user. */
export async function acceptInviteAction(token: string): Promise<Result & { workspaceId?: string }> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
  if (!user?.email) return { error: "Your account has no email address." };
  const r = await team.acceptInvite(token, me.id, user.email);
  refresh();
  return r.ok ? { success: true, workspaceId: r.workspaceId } : { error: r.error };
}
