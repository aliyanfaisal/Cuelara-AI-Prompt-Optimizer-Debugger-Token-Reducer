-- AlterTable
ALTER TABLE "Plan" RENAME COLUMN "paddlePriceId" TO "paddlePriceIdSandbox";
ALTER TABLE "Plan" ADD COLUMN     "paddlePriceIdProduction" TEXT;
