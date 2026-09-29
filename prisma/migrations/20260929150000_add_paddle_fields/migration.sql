-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "paddlePriceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paddleCustomerId" TEXT,
ADD COLUMN     "paddleSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_paddleSubscriptionId_idx" ON "User"("paddleSubscriptionId");

-- CreateIndex
CREATE INDEX "User_paddleCustomerId_idx" ON "User"("paddleCustomerId");
