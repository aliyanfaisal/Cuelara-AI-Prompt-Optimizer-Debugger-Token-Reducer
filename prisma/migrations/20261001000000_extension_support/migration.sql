-- Browser extension support. Written to be safe to run more than once.

-- AlterTable
ALTER TABLE "PersonalAccessToken" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'mcp';

-- DropIndex / CreateIndex
DROP INDEX IF EXISTS "PersonalAccessToken_userId_idx";
CREATE INDEX IF NOT EXISTS "PersonalAccessToken_userId_kind_idx" ON "PersonalAccessToken"("userId", "kind");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExtensionSiteRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionSiteRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionSiteRule_userId_domain_key" ON "ExtensionSiteRule"("userId", "domain");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExtensionSiteRule_userId_fkey') THEN
    ALTER TABLE "ExtensionSiteRule" ADD CONSTRAINT "ExtensionSiteRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
