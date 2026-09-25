"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendActivationEmail, sendPasswordResetEmail } from "@/lib/email";
import { formatWait, getActionIp, hitAbuseLimit } from "@/lib/abuse-limit";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Each attempt counts (not just successes): stops scripted signups and activation-email spam.
  const ipLimit = await hitAbuseLimit({ scope: "register-ip", subject: await getActionIp(), limit: 5, windowSeconds: 60 * 60 });
  if (!ipLimit.allowed) return { error: `Too many sign-up attempts. Please try again in ${formatWait(ipLimit.retryAfterSeconds)}.` };

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true, isActive: true }, select: { id: true } });

  // Create user (inactive by default)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      isActive: false, // Must be activated via magic link
      planId: defaultPlan?.id ?? null,
    },
  });

  // Generate Activation Token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.activationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const activationUrl = `${APP_URL}/api/auth/activate?token=${token}`;

  try {
    await sendActivationEmail(email, activationUrl);
  } catch (error) {
    // The account exists either way — surface a clear message so the user knows to
    // contact support rather than assume the (never-sent) email is just delayed.
    console.error("Failed to send activation email:", error);
    return { error: "Your account was created, but we couldn't send the activation email. Please contact support." };
  }

  return { success: "Registration successful! Check your email for the activation link." };
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Always returns success (even for an unknown email) — never confirm or deny whether
 * an email has an account, so this can't be used to enumerate registered addresses.
 */
export async function requestPasswordReset(formData: FormData): Promise<{ error?: string; success?: string }> {
  const email = formData.get("email") as string;
  if (!email || !email.trim()) {
    return { error: "Enter your email address." };
  }

  const genericSuccess = { success: "If that email has an account, a password reset link is on its way." };

  const ipLimit = await hitAbuseLimit({ scope: "reset-ip", subject: await getActionIp(), limit: 5, windowSeconds: 60 * 60 });
  if (!ipLimit.allowed) return { error: `Too many reset requests. Please try again in ${formatWait(ipLimit.retryAfterSeconds)}.` };
  // Per address: the same generic answer either way, so the limit never reveals whether an account exists.
  const emailLimit = await hitAbuseLimit({ scope: "reset-email", subject: email, limit: 3, windowSeconds: 60 * 60 });
  if (!emailLimit.allowed) return genericSuccess;

  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user || !user.password) return genericSuccess; // OAuth-only accounts have no password to reset

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    await sendPasswordResetEmail(user.email!, resetUrl);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { error: "Couldn't send the reset email right now. Please try again shortly." };
  }

  return genericSuccess;
}

export async function resetPassword(formData: FormData): Promise<{ error?: string; success?: string }> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token) return { error: "Missing or invalid reset link." };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.expiresAt < new Date()) {
    if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } }),
    // One-time use — delete immediately so the same link can't be replayed.
    prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
  ]);

  return { success: "Password updated. You can now sign in." };
}
