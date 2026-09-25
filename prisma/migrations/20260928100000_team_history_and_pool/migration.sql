-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "sharedHistory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN "shareHistory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PlanToolLimit" ADD COLUMN "teamDailyLimit" INTEGER;

-- A sensible starting pool for the existing Team plan: twice one person's daily limit, per tool. Editable per plan in admin.
UPDATE "PlanToolLimit" SET "teamDailyLimit" = "dailyLimit" * 2
WHERE "planId" IN (SELECT "id" FROM "Plan" WHERE "slug" = 'team');
