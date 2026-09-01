"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRole(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name || name.trim() === "") {
    return { error: "Role name is required" };
  }

  const formattedName = name.trim().toUpperCase().replace(/\s+/g, "_");

  try {
    await prisma.role.create({
      data: {
        name: formattedName,
        description: description?.trim() || null,
      },
    });

    revalidatePath("/admin/roles");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A role with this name already exists" };
    }
    return { error: "Failed to create role" };
  }
}

export async function deleteRole(id: string) {
  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.name === "ADMIN" || role?.name === "USER") {
      return { error: "Cannot delete system default roles" };
    }

    await prisma.role.delete({ where: { id } });
    revalidatePath("/admin/roles");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete role" };
  }
}
