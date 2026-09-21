"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { publishedAtFor } from "@/lib/blog";
import { prisma } from "@/lib/prisma";

// Server actions can be invoked outside the /admin pages the middleware guards, so check the role here too.
async function isAdmin() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.includes("ADMIN");
}

function revalidate() {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

export async function setBlogPostStatus(id: string, status: "draft" | "published") {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  if (status !== "draft" && status !== "published") return { error: "Invalid status" };

  try {
    const post = await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!post) return { error: "Post not found" };

    const publishedAt = publishedAtFor(status, post.publishedAt);

    await prisma.blogPost.update({ where: { id }, data: { status, published: status === "published", publishedAt } });
    revalidate();
    return { success: true };
  } catch {
    return { error: "Failed to update post" };
  }
}

export async function deleteBlogPost(id: string) {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  try {
    await prisma.blogPost.delete({ where: { id } });
    revalidate();
    return { success: true };
  } catch {
    return { error: "Failed to delete post" };
  }
}
