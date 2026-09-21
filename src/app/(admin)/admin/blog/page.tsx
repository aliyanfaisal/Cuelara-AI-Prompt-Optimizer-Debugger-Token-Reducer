import { prisma } from "@/lib/prisma";
import { postState } from "@/lib/blog";
import BlogManager, { type AdminBlogPost } from "./BlogManager";

export const metadata = {
  title: "Blog | Admin",
};

export default async function AdminBlogPage() {
  const rows = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      externalId: true,
      readingMinutes: true,
      categories: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });

  const posts: AdminBlogPost[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    state: postState(p.status, p.publishedAt),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    externalId: p.externalId,
    readingMinutes: p.readingMinutes,
    categories: p.categories.map((c) => c.name),
  }));

  const lastSync = rows.filter((p) => p.externalId !== null).reduce<Date | null>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Blog</h1>
        <p className="text-muted-foreground">Posts pushed from the portfolio site, plus their live status on the public blog.</p>
      </div>

      <BlogManager posts={posts} lastSyncedAt={lastSync?.toISOString() ?? null} />
    </div>
  );
}
