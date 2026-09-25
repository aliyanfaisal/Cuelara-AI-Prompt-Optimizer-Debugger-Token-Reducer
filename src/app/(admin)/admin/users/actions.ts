"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendPlanChangeEmail } from "@/lib/email";
import { assertAdmin } from "@/lib/admin-auth";

export async function updateUser(userId: string, data: { name?: string; email?: string; roles: string[]; planId?: string | null }) {
  await assertAdmin();
  try {
    const updateData: Record<string, unknown> = {
      roles: {
        set: data.roles.map((id: string) => ({ id })),
      },
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;

    let previousPlanId: string | null | undefined;
    if (data.planId !== undefined) {
      updateData.planId = data.planId || null;
      const before = await prisma.user.findUnique({ where: { id: userId }, select: { planId: true } });
      previousPlanId = before?.planId ?? null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { plan: true },
    });

    // Best-effort — a failed notification email must never undo the plan change itself.
    if (data.planId !== undefined && data.planId !== previousPlanId && user.email) {
      try {
        await sendPlanChangeEmail(user.email, user.plan?.name ?? "Free");
      } catch (err) {
        console.error("Failed to send plan-change email:", err);
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { error: "Failed to update user" };
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  await assertAdmin();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (user?.roles.some(r => r.name === "ADMIN")) {
      return { error: "Cannot disable an Admin user" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update user status" };
  }
}

export async function deleteUser(userId: string) {
  await assertAdmin();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (user?.roles.some(r => r.name === "ADMIN")) {
      return { error: "Cannot delete an Admin user" };
    }

    await prisma.user.delete({ where: { id: userId } });
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete user" };
  }
}

export async function createUser(data: { name: string; email: string; password?: string; roles: string[]; planId?: string | null }) {
  await assertAdmin();
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return { error: "A user with this email already exists." };
    }

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        isActive: true, // Default to active when created by admin
        planId: data.planId || null,
        roles: {
          connect: data.roles.map((id) => ({ id }))
        }
      }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "Failed to create user" };
  }
}
