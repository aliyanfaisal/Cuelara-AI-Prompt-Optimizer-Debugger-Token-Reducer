-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "allowsOwnKeys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowsMultipleSessions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeSessionId" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "ApiCallLog" ADD COLUMN     "ownKey" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserModelConfig" (
    "userId" TEXT NOT NULL,
    "useOwnKeys" BOOLEAN NOT NULL DEFAULT false,
    "order" TEXT,
    "openRouterModels" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModelConfig_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ApiKey_userId_provider_idx" ON "ApiKey"("userId", "provider");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModelConfig" ADD CONSTRAINT "UserModelConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The Team plan is the one tier that may be signed in on several browsers at once.
UPDATE "Plan" SET "allowsMultipleSessions" = true WHERE "slug" = 'team';
