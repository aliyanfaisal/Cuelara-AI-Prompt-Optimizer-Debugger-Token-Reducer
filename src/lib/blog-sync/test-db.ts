import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { readFileSync, readdirSync } from "node:fs";
import { PrismaClient } from "@/generated/client/client";

// The BlogPost (and a stub User) table as they existed before the migrations; the real migrations are applied on top of it.
const LEGACY_BLOG_POST = `
CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL, "content" TEXT NOT NULL,
  "excerpt" TEXT, "published" BOOLEAN NOT NULL DEFAULT false, "seoTitle" TEXT, "seoDesc" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
-- Later migrations (plans, email log) alter or reference "User", which was also created before Migrate.
CREATE TABLE "User" ("id" TEXT NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
`;

/**
 * In-memory Postgres with every migration applied, exactly as they would run in order.
 * src/lib/prisma.ts reuses `globalThis.prisma`, so anything imported afterwards talks to this database.
 */
export async function createTestDb() {
  const pg = new PGlite();
  await pg.exec(LEGACY_BLOG_POST);
  for (const dir of readdirSync("prisma/migrations").filter((d) => /^\d+_/.test(d)).sort()) {
    await pg.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"));
  }
  const db = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  (globalThis as unknown as { prisma: PrismaClient }).prisma = db;
  return { pg, db, close: async () => { await db.$disconnect(); await pg.close(); } };
}
