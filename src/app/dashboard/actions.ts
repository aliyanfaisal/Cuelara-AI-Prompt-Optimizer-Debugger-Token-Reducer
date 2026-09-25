"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { isHistoryTool, pruneToolRuns } from "@/lib/history";
import { sendContactNotificationEmail, sendContactReceiptEmail, sendPlanChangeEmail } from "@/lib/email";
import { getEffectivePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";

type Result = { success: true; message?: string } | { error: string };

const UNAUTHORIZED: Result = { error: "Please sign in again." };

// ---------------------------------------------------------------------------------------------
// Tool history
// ---------------------------------------------------------------------------------------------

export async function deleteToolRun(id: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return UNAUTHORIZED;

  // Scoped to the caller, so another user's id deletes nothing.
  const { count } = await prisma.toolRun.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return { error: "That item was already deleted." };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function clearToolHistory(tool: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return UNAUTHORIZED;
  if (!isHistoryTool(tool)) return { error: "Unknown tool." };

  await prisma.toolRun.deleteMany({ where: { userId: user.id, tool } });
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfile(input: { name: string; email: string; currentPassword?: string }): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;

  const name = input.name.trim().slice(0, 100);
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Please enter your name." };
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: "Please enter a valid email address." };

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { email: true, password: true } });
  if (!user) return UNAUTHORIZED;

  if (email !== user.email?.toLowerCase()) {
    // Changing the sign-in email is sensitive, so it needs the current password.
    if (!input.currentPassword || !user.password || !(await bcrypt.compare(input.currentPassword, user.password))) {
      return { error: "Enter your current password to change your email address." };
    }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return { error: "That email address is already in use." };
    }
  }

  await prisma.user.update({ where: { id: session.id }, data: { name, email } });
  revalidatePath("/dashboard", "layout");
  return { success: true, message: "Profile updated." };
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;
  if (input.newPassword.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (input.newPassword.length > 200) return { error: "Your new password is too long." };

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { password: true } });
  if (!user?.password || !(await bcrypt.compare(input.currentPassword, user.password))) {
    return { error: "Your current password is incorrect." };
  }

  await prisma.user.update({ where: { id: session.id }, data: { password: await bcrypt.hash(input.newPassword, 10) } });
  return { success: true, message: "Password changed." };
}

// ---------------------------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------------------------

/** Moving to a cheaper plan is self-serve and immediate. */
export async function downgradePlan(planId: string): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;

  const [user, current, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { email: true } }),
    getEffectivePlan(session.id),
    prisma.plan.findFirst({ where: { id: planId, isActive: true }, select: { id: true, name: true, priceMonthlyCents: true, historyPerTool: true } }),
  ]);
  if (!user || !target) return { error: "That plan is not available." };
  if (target.priceMonthlyCents >= (current?.priceMonthlyCents ?? 0) && !(current?.allowsOwnKeys && target.priceMonthlyCents === 0)) {
    return { error: "You can only move to a cheaper plan here. Upgrades are arranged with our team." };
  }

  await prisma.user.update({ where: { id: session.id }, data: { planId: target.id } });
  // The smaller plan keeps fewer runs per tool, so trim now rather than leaving history the plan doesn't include.
  await pruneToolRuns(session.id, target.historyPerTool);
  if (user.email) await sendPlanChangeEmail(user.email, target.name).catch((e) => console.error("Plan change email failed:", e));
  revalidatePath("/dashboard", "layout");
  return { success: true, message: `You're now on the ${target.name} plan.` };
}

/**
 * Payments aren't live, so an upgrade can't be bought here. This records a request (it lands in the admin
 * Messages inbox like any contact message, and is emailed to the team) for the team to arrange.
 */
export async function requestUpgrade(planId: string): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;

  const [user, current, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { name: true, email: true } }),
    getEffectivePlan(session.id),
    prisma.plan.findFirst({ where: { id: planId, isActive: true }, select: { name: true, slug: true, priceMonthlyCents: true } }),
  ]);
  if (!user?.email || !target) return { error: "That plan is not available." };
  if (target.priceMonthlyCents <= (current?.priceMonthlyCents ?? 0)) return { error: "That is not an upgrade from your current plan." };

  const subject = `Upgrade request: ${target.name}`;
  const already = await prisma.contactMessage.findFirst({
    where: { email: user.email, plan: target.slug, subject, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { id: true },
  });
  if (already) return { success: true, message: "We already have your request and will be in touch soon." };

  const name = user.name || user.email;
  const message = `${name} (${user.email}) would like to upgrade from ${current?.name ?? "no plan"} to ${target.name}, requested from the dashboard.`;
  const saved = await prisma.contactMessage.create({ data: { name, email: user.email, subject, message, plan: target.slug } });

  const mail = { name, email: user.email, subject, message, plan: target.slug };
  const [notified] = await Promise.allSettled([sendContactNotificationEmail(mail), sendContactReceiptEmail(mail)]);
  if (notified.status === "fulfilled") await prisma.contactMessage.update({ where: { id: saved.id }, data: { emailSent: true } });

  revalidatePath("/dashboard/subscription");
  return { success: true, message: `Request sent. We'll be in touch about the ${target.name} plan.` };
}
