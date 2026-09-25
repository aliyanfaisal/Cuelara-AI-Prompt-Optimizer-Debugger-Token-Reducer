"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function setErrorResolved(id: string, resolved: boolean) {
  await assertAdmin();
  await prisma.errorLog.update({ where: { id }, data: { resolved } });
  revalidatePath("/admin/errors");
  return { success: true };
}

export async function deleteError(id: string) {
  await assertAdmin();
  await prisma.errorLog.delete({ where: { id } });
  revalidatePath("/admin/errors");
  return { success: true };
}

/** Removes every resolved error — the unresolved ones are kept. */
export async function clearResolvedErrors() {
  await assertAdmin();
  const { count } = await prisma.errorLog.deleteMany({ where: { resolved: true } });
  revalidatePath("/admin/errors");
  return { success: true, deleted: count };
}
