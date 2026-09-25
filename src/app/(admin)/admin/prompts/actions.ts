"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAdmin } from "@/lib/admin-auth";

export async function togglePromptVisibility(id: string, isPublic: boolean) {
  await assertAdmin();
  try {
    await prisma.prompt.update({
      where: { id },
      data: { isPublic },
    });
    revalidatePath("/admin/prompts");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update prompt visibility." };
  }
}

export async function deletePrompt(id: string) {
  await assertAdmin();
  try {
    await prisma.prompt.delete({
      where: { id },
    });
    revalidatePath("/admin/prompts");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete prompt." };
  }
}

export async function createPrompt(data: {
  title: string;
  image?: string;
  content: string;
  model?: string;
  tokens?: number;
  cost?: number;
  isPublic: boolean;
  tags: string[];
}) {
  await assertAdmin();
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.prompt.create({
      data: {
        title: data.title,
        image: data.image || null,
        content: data.content,
        model: data.model || null,
        tokens: data.tokens || null,
        cost: data.cost || null,
        isPublic: data.isPublic,
        tags: data.tags,
        userId: (session?.user as any).id,
      },
    });

    revalidatePath("/admin/prompts");
    return { success: true };
  } catch (error) {
    return { error: "Failed to create prompt." };
  }
}
