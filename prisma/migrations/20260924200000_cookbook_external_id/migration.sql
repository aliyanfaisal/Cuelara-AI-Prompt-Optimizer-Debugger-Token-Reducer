-- The cookbook tables were originally created with `db push`, so they have no earlier migration.
-- The IF NOT EXISTS guards make this a no-op for those tables on databases that already have them,
-- and let a fresh database (or the in-memory test database) build them.

-- CreateTable
CREATE TABLE IF NOT EXISTS "CookbookCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,

    CONSTRAINT "CookbookCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CookbookPrompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "categoryId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "whenToUse" TEXT NOT NULL,
    "commonMistakes" TEXT NOT NULL,
    "bestPractices" TEXT NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "exampleInput" TEXT NOT NULL,
    "exampleOutput" TEXT NOT NULL,
    "faqs" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CookbookPrompt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CookbookCategory_slug_key" ON "CookbookCategory"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CookbookPrompt_slug_key" ON "CookbookPrompt"("slug");

-- AddForeignKey (guarded: Postgres has no IF NOT EXISTS for constraints)
DO $$ BEGIN
  ALTER TABLE "CookbookCategory" ADD CONSTRAINT "CookbookCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CookbookCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CookbookPrompt" ADD CONSTRAINT "CookbookPrompt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CookbookCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "CookbookPrompt" ADD COLUMN IF NOT EXISTS "externalId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "CookbookPrompt_externalId_key" ON "CookbookPrompt"("externalId");
