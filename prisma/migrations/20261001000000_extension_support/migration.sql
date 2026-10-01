-- AlterTable
ALTER TABLE "PersonalAccessToken" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'mcp';

-- DropIndex
DROP INDEX "PersonalAccessToken_userId_idx";

-- CreateIndex
CREATE INDEX "PersonalAccessToken_userId_kind_idx" ON "PersonalAccessToken"("userId", "kind");

-- CreateTable
CREATE TABLE "ExtensionSiteRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionSiteRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionSiteRule_userId_domain_key" ON "ExtensionSiteRule"("userId", "domain");

-- AddForeignKey
ALTER TABLE "ExtensionSiteRule" ADD CONSTRAINT "ExtensionSiteRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
