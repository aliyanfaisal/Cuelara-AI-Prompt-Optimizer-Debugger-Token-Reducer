import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getOwnPlan } from "@/lib/plans";

export const TEAM_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
/** Roles that can be handed out by an invitation (the owner is whoever created the team). */
export const INVITABLE_ROLES = ["ADMIN", "MEMBER"] as const;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_TEAM_NAME = 60;
export const MAX_PROMPT_TITLE = 120;
export const MAX_PROMPT_CONTENT = 30_000;
export const MAX_PROMPT_TAGS = 8;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

export const isTeamRole = (v: unknown): v is TeamRole => typeof v === "string" && (TEAM_ROLES as readonly string[]).includes(v);
export const isInvitableRole = (v: unknown): v is (typeof INVITABLE_ROLES)[number] => typeof v === "string" && (INVITABLE_ROLES as readonly string[]).includes(v);

// ---- permissions (pure) ------------------------------------------------------------------------------------------

export const canManageMembers = (role: TeamRole | null) => role === "OWNER" || role === "ADMIN";

/** Members edit their own prompts; owners and admins can edit anyone's. */
export const canEditPrompt = (role: TeamRole | null, authorId: string, userId: string) =>
  role === "OWNER" || role === "ADMIN" || (role === "MEMBER" && authorId === userId);

/** Admins manage plain members; only the owner manages admins (or anyone above their own rank). */
export function canRemoveMember(actor: TeamRole | null, target: TeamRole): boolean {
  if (target === "OWNER") return false;
  if (actor === "OWNER") return true;
  return actor === "ADMIN" && target === "MEMBER";
}

// ---- workspaces --------------------------------------------------------------------------------------------------

/** Every user has one private personal workspace, created the first time it is needed. */
export async function ensurePersonalWorkspace(userId: string) {
  const existing = await prisma.workspace.findFirst({ where: { userId, type: "personal" } });
  if (existing) return existing;
  return prisma.workspace.create({
    data: { name: "My prompts", type: "personal", userId, members: { create: { userId, role: "OWNER" } } },
  });
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  type: "personal" | "team";
  role: TeamRole;
}

export async function listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  await ensurePersonalWorkspace(userId);
  const rows = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { role: true, workspace: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows
    .map((r) => ({ id: r.workspace.id, name: r.workspace.name, type: (r.workspace.type === "team" ? "team" : "personal") as "team" | "personal", role: (isTeamRole(r.role) ? r.role : "MEMBER") as TeamRole }))
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "personal" ? -1 : 1));
}

export async function getRole(userId: string, workspaceId: string): Promise<TeamRole | null> {
  const m = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { role: true } });
  return m && isTeamRole(m.role) ? m.role : null;
}

/** Seats = the manager's plan seat cap; used counts people already in the team plus invitations still pending. */
export async function seatUsage(workspaceId: string): Promise<{ used: number; pending: number; max: number }> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { userId: true } });
  if (!ws) return { used: 0, pending: 0, max: 0 };
  const [plan, used, pending] = await Promise.all([
    getOwnPlan(ws.userId),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.workspaceInvite.count({ where: { workspaceId, expiresAt: { gt: new Date() } } }),
  ]);
  return { used, pending, max: plan?.maxSeats ?? 0 };
}

const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_TEAM_NAME);

/** A team workspace needs a plan that hosts teams, and each manager gets one team. */
export async function createTeamWorkspace(userId: string, name: string): Promise<Result<{ workspaceId: string }>> {
  const clean = cleanName(name);
  if (!clean) return fail("Give your team a name.");
  const plan = await getOwnPlan(userId);
  if (!plan || plan.maxSeats < 1) return fail("Your plan doesn't include a team workspace.");
  if (await prisma.workspace.findFirst({ where: { userId, type: "team" }, select: { id: true } })) return fail("You already manage a team.");
  const ws = await prisma.workspace.create({
    data: { name: clean, type: "team", userId, members: { create: { userId, role: "OWNER" } } },
    select: { id: true },
  });
  return { ok: true, workspaceId: ws.id };
}

export async function renameTeamWorkspace(actorId: string, workspaceId: string, name: string): Promise<Result> {
  const clean = cleanName(name);
  if (!clean) return fail("Give your team a name.");
  if ((await getRole(actorId, workspaceId)) !== "OWNER") return fail("Only the team owner can rename it.");
  await prisma.workspace.updateMany({ where: { id: workspaceId, type: "team" }, data: { name: clean } });
  return { ok: true };
}

export async function deleteTeamWorkspace(actorId: string, workspaceId: string): Promise<Result> {
  if ((await getRole(actorId, workspaceId)) !== "OWNER") return fail("Only the team owner can delete it.");
  const { count } = await prisma.workspace.deleteMany({ where: { id: workspaceId, type: "team" } });
  return count ? { ok: true } : fail("Team not found.");
}

// ---- invitations -------------------------------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InvitePlan {
  token: string;
  email: string;
  role: (typeof INVITABLE_ROLES)[number];
  workspaceName: string;
}

/**
 * Creates (or refreshes, for a re-send) an invitation. Refuses when the actor can't manage members, the address is
 * already on the team, or every seat is taken (people already in + invitations still pending).
 */
export async function createInvite(params: { workspaceId: string; actorId: string; email: string; role: string }): Promise<Result<{ invite: InvitePlan }>> {
  const email = params.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return fail("Enter a valid email address.");
  if (!isInvitableRole(params.role)) return fail("Invalid role.");

  const [ws, actorRole] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: params.workspaceId }, select: { name: true, type: true } }),
    getRole(params.actorId, params.workspaceId),
  ]);
  if (!ws || ws.type !== "team") return fail("Team not found.");
  if (!canManageMembers(actorRole)) return fail("You don't have permission to invite people.");
  if (params.role === "ADMIN" && actorRole !== "OWNER") return fail("Only the team owner can invite admins.");

  const alreadyMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: params.workspaceId, user: { email: { equals: email, mode: "insensitive" } } },
    select: { id: true },
  });
  if (alreadyMember) return fail("That person is already on your team.");

  const existing = await prisma.workspaceInvite.findUnique({ where: { workspaceId_email: { workspaceId: params.workspaceId, email } } });
  const seats = await seatUsage(params.workspaceId);
  // Re-sending an invitation that already holds a seat doesn't need a free one.
  if (!existing && seats.used + seats.pending >= seats.max) {
    return fail(seats.max > 0 ? `Your plan includes ${seats.max} seats and all are in use or reserved by pending invitations.` : "Your plan doesn't include team seats.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId: params.workspaceId, email } },
    create: { workspaceId: params.workspaceId, email, role: params.role, token, invitedById: params.actorId, expiresAt },
    update: { role: params.role, token, invitedById: params.actorId, expiresAt },
  });
  return { ok: true, invite: { token, email, role: params.role, workspaceName: ws.name } };
}

export async function revokeInvite(actorId: string, inviteId: string): Promise<Result> {
  const invite = await prisma.workspaceInvite.findUnique({ where: { id: inviteId }, select: { workspaceId: true } });
  if (!invite) return { ok: true };
  if (!canManageMembers(await getRole(actorId, invite.workspaceId))) return fail("You don't have permission to do that.");
  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
  return { ok: true };
}

export interface InvitePreview {
  workspaceName: string;
  inviterName: string;
  email: string;
  role: string;
  expired: boolean;
}

export async function previewInvite(token: string): Promise<InvitePreview | null> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    select: { email: true, role: true, expiresAt: true, workspace: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } },
  });
  if (!invite) return null;
  return {
    workspaceName: invite.workspace.name,
    inviterName: invite.invitedBy.name || invite.invitedBy.email || "A teammate",
    email: invite.email,
    role: invite.role,
    expired: invite.expiresAt < new Date(),
  };
}

/** Joins the team. The signed-in account's email must be the one that was invited: the link alone isn't enough. */
export async function acceptInvite(token: string, userId: string, userEmail: string): Promise<Result<{ workspaceId: string }>> {
  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite) return fail("This invitation is no longer valid.");
  if (invite.expiresAt < new Date()) return fail("This invitation has expired. Ask your team manager to send a new one.");
  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    return fail(`This invitation was sent to ${invite.email}. Sign in with that account to accept it.`);
  }

  const already = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } } });
  if (!already) {
    // The invitation itself holds a seat, so only people who are actually in count against the cap here.
    const seats = await seatUsage(invite.workspaceId);
    if (seats.used >= seats.max) return fail("This team has no free seats right now. Ask the team manager.");
    await prisma.workspaceMember.create({ data: { workspaceId: invite.workspaceId, userId, role: invite.role } });
  }
  await prisma.workspaceInvite.delete({ where: { id: invite.id } });
  return { ok: true, workspaceId: invite.workspaceId };
}

// ---- members -----------------------------------------------------------------------------------------------------

export async function removeMember(actorId: string, workspaceId: string, targetUserId: string): Promise<Result> {
  const [actorRole, targetRole] = await Promise.all([getRole(actorId, workspaceId), getRole(targetUserId, workspaceId)]);
  if (!targetRole) return { ok: true };
  if (actorId === targetUserId) return fail("Use “Leave team” to remove yourself.");
  if (!canRemoveMember(actorRole, targetRole)) return fail("You don't have permission to remove that person.");
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } } });
  return { ok: true };
}

export async function leaveTeam(userId: string, workspaceId: string): Promise<Result> {
  const role = await getRole(userId, workspaceId);
  if (!role) return { ok: true };
  if (role === "OWNER") return fail("The owner can't leave. Delete the team instead, or ask support to transfer it.");
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } });
  return { ok: true };
}

export async function changeMemberRole(actorId: string, workspaceId: string, targetUserId: string, role: string): Promise<Result> {
  if (!isInvitableRole(role)) return fail("Invalid role.");
  if ((await getRole(actorId, workspaceId)) !== "OWNER") return fail("Only the team owner can change roles.");
  const targetRole = await getRole(targetUserId, workspaceId);
  if (!targetRole || targetRole === "OWNER") return fail("That person's role can't be changed.");
  await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } }, data: { role } });
  return { ok: true };
}

// ---- prompt library ----------------------------------------------------------------------------------------------

export function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const tag = t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30);
    if (tag) seen.add(tag);
  }
  return Array.from(seen).slice(0, MAX_PROMPT_TAGS);
}

export interface PromptInput {
  title: string;
  content: string;
  tags?: unknown;
  sourceTool?: string | null;
}

function validatePrompt(input: PromptInput): Result<{ title: string; content: string; tags: string[] }> {
  const content = input.content.trim();
  if (!content) return fail("The prompt can't be empty.");
  if (content.length > MAX_PROMPT_CONTENT) return fail(`Prompts can be up to ${MAX_PROMPT_CONTENT.toLocaleString()} characters.`);
  const title = (input.title.replace(/\s+/g, " ").trim() || content.replace(/\s+/g, " ").slice(0, 60)).slice(0, MAX_PROMPT_TITLE);
  return { ok: true, title, content, tags: cleanTags(input.tags) };
}

export async function savePrompt(userId: string, workspaceId: string, input: PromptInput): Promise<Result<{ id: string }>> {
  if (!(await getRole(userId, workspaceId))) return fail("You don't have access to that workspace.");
  const v = validatePrompt(input);
  if (!v.ok) return v;
  const created = await prisma.savedPrompt.create({
    data: { workspaceId, authorId: userId, title: v.title, content: v.content, tags: v.tags, sourceTool: input.sourceTool?.slice(0, 40) || null },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function updatePrompt(userId: string, promptId: string, input: PromptInput): Promise<Result> {
  const existing = await prisma.savedPrompt.findUnique({ where: { id: promptId }, select: { workspaceId: true, authorId: true } });
  if (!existing) return fail("Prompt not found.");
  if (!canEditPrompt(await getRole(userId, existing.workspaceId), existing.authorId, userId)) return fail("You can only edit your own prompts.");
  const v = validatePrompt(input);
  if (!v.ok) return v;
  await prisma.savedPrompt.update({ where: { id: promptId }, data: { title: v.title, content: v.content, tags: v.tags } });
  return { ok: true };
}

export async function deletePrompt(userId: string, promptId: string): Promise<Result> {
  const existing = await prisma.savedPrompt.findUnique({ where: { id: promptId }, select: { workspaceId: true, authorId: true } });
  if (!existing) return { ok: true };
  if (!canEditPrompt(await getRole(userId, existing.workspaceId), existing.authorId, userId)) return fail("You can only delete your own prompts.");
  await prisma.savedPrompt.delete({ where: { id: promptId } });
  return { ok: true };
}
