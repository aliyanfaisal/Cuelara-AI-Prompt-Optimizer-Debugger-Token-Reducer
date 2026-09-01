"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Cookbook Category Actions ---

export async function createCookbookCategory(data: { name: string; slug: string; description?: string }) {
  try {
    await prisma.cookbookCategory.create({ data });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "A category with this slug already exists." };
    return { error: "Failed to create category." };
  }
}

export async function updateCookbookCategory(id: string, data: { name: string; slug: string; description?: string }) {
  try {
    await prisma.cookbookCategory.update({ where: { id }, data });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "A category with this slug already exists." };
    return { error: "Failed to update category." };
  }
}

export async function bulkCreateCookbookCategories(categories: { name: string; slug: string; description?: string; children?: { name: string; slug: string; description?: string }[] }[]) {
  try {
    let count = 0;
    
    // We process sequentially to ensure parents exist before children
    for (const parentCat of categories) {
      const { children, ...parentData } = parentCat;
      
      // Upsert parent to skip duplicates gracefully while ensuring we have the ID for children
      const parent = await prisma.cookbookCategory.upsert({
        where: { slug: parentData.slug },
        update: {},
        create: parentData,
      });
      count++;
      
      if (children && children.length > 0) {
        for (const child of children) {
          await prisma.cookbookCategory.upsert({
            where: { slug: child.slug },
            update: { parentId: parent.id },
            create: { ...child, parentId: parent.id },
          });
          count++;
        }
      }
    }
    
    revalidatePath("/admin/cookbook");
    return { success: true, count };
  } catch (error: any) {
    console.error("Bulk create error:", error);
    return { error: `Failed to bulk create categories: ${error.message || String(error)}` };
  }
}

export async function deleteCookbookCategory(id: string) {
  try {
    await prisma.cookbookCategory.delete({ where: { id } });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete category. Ensure no prompts are linked to it." };
  }
}

// --- Cookbook Prompt Actions ---

export async function createCookbookPrompt(data: any) {
  try {
    await prisma.cookbookPrompt.create({ data });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "A cookbook prompt with this slug already exists." };
    return { error: "Failed to create cookbook prompt." };
  }
}

export async function updateCookbookPrompt(id: string, data: any) {
  try {
    await prisma.cookbookPrompt.update({ where: { id }, data });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "A cookbook prompt with this slug already exists." };
    return { error: "Failed to update cookbook prompt." };
  }
}

export async function deleteCookbookPrompt(id: string) {
  try {
    await prisma.cookbookPrompt.delete({ where: { id } });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete cookbook prompt." };
  }
}

export async function toggleCookbookPromptPublish(id: string, published: boolean) {
  try {
    await prisma.cookbookPrompt.update({ where: { id }, data: { published } });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update publish status." };
  }
}

// --- Cookbook Settings Actions ---

export async function getCookbookSettings() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "GEMINI_API_KEY" }
    });
    return { geminiApiKey: setting?.value || "" };
  } catch (error) {
    return { geminiApiKey: "" };
  }
}

export async function updateCookbookSettings(geminiApiKey: string) {
  try {
    await prisma.setting.upsert({
      where: { key: "GEMINI_API_KEY" },
      update: { value: geminiApiKey },
      create: { key: "GEMINI_API_KEY", value: geminiApiKey }
    });
    revalidatePath("/admin/cookbook");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update settings." };
  }
}
