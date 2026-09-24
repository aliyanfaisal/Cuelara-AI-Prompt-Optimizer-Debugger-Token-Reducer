"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { publishedAtFor } from "@/lib/blog";
import { blogPostUrl, notifyGoogle } from "@/lib/google-indexing";
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

    const updated = await prisma.blogPost.update({
      where: { id },
      data: { status, published: status === "published", publishedAt },
      select: { slug: true },
    });
    revalidate();
    // A scheduled (future-dated) post isn't live yet, so there is nothing for Google to fetch.
    const live = status === "published" && (!publishedAt || publishedAt <= new Date());
    if (live) void notifyGoogle(blogPostUrl(updated.slug));
    else if (status === "draft") void notifyGoogle(blogPostUrl(updated.slug), "URL_DELETED");
    return { success: true };
  } catch {
    return { error: "Failed to update post" };
  }
}

export async function deleteBlogPost(id: string) {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  try {
    const deleted = await prisma.blogPost.delete({ where: { id }, select: { slug: true, status: true } });
    revalidate();
    if (deleted.status === "published") void notifyGoogle(blogPostUrl(deleted.slug), "URL_DELETED");
    return { success: true };
  } catch {
    return { error: "Failed to delete post" };
  }
}
