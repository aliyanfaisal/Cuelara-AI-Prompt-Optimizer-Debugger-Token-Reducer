-- AlterTable
ALTER TABLE "Plan" RENAME COLUMN "paddlePriceIdSandbox" TO "paddleMonthlyPriceIdSandbox";
ALTER TABLE "Plan" RENAME COLUMN "paddlePriceIdProduction" TO "paddleMonthlyPriceIdProduction";
ALTER TABLE "Plan" ADD COLUMN     "priceYearlyCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paddleYearlyPriceIdSandbox" TEXT,
ADD COLUMN     "paddleYearlyPriceIdProduction" TEXT;
