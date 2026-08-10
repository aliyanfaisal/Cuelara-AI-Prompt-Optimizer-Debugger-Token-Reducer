"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user (inactive by default)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      isActive: false, // Must be activated via magic link
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

  // TODO: Swap this with real SMTP (Resend, SendGrid, NodeMailer)
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/activate?token=${token}`;
  
  console.log("\n=============================================");
  console.log(" MAGIC LINK ACTIVATION (MOCKED EMAIL SEND)");
  console.log(` To: ${email}`);
  console.log(` Link: ${activationUrl}`);
  console.log("=============================================\n");

  return { success: "Registration successful! Please check your email (or terminal) for the activation link." };
}
