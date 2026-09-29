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

export async function setSubscriberActive(id: string, active: boolean) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  try {
    await prisma.newsletterSubscriber.update({ where: { id }, data: { unsubscribedAt: active ? null : new Date() } });
    revalidatePath("/admin/newsletter");
    return { success: true };
  } catch {
    return { error: "Failed to update subscriber." };
  }
}

export async function deleteSubscriber(id: string) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  try {
    await prisma.newsletterSubscriber.delete({ where: { id } });
    revalidatePath("/admin/newsletter");
    return { success: true };
  } catch {
    return { error: "Failed to delete subscriber." };
  }
}
