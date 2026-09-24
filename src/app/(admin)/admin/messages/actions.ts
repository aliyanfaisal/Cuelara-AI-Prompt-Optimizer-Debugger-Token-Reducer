"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Server actions can be invoked outside the /admin pages the middleware guards, so check the role here too.
async function isAdmin() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.includes("ADMIN");
}

export async function setMessageRead(id: string, isRead: boolean) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  try {
    await prisma.contactMessage.update({ where: { id }, data: { isRead } });
    revalidatePath("/admin/messages");
    return { success: true };
  } catch {
    return { error: "Failed to update message." };
  }
}

export async function deleteMessage(id: string) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  try {
    await prisma.contactMessage.delete({ where: { id } });
    revalidatePath("/admin/messages");
    return { success: true };
  } catch {
    return { error: "Failed to delete message." };
  }
}
