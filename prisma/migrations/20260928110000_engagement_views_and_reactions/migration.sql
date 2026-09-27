-- CreateEnum
CREATE TYPE "EngagementSubject" AS ENUM ('blog', 'cookbook');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CookbookPrompt" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ContentView" (
    "id" TEXT NOT NULL,
    "subject" "EngagementSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "subject" "EngagementSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentView_subject_subjectId_idx" ON "ContentView"("subject", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentView_subject_subjectId_subjectKey_date_key" ON "ContentView"("subject", "subjectId", "subjectKey", "date");

-- CreateIndex
CREATE INDEX "Reaction_subject_subjectId_type_idx" ON "Reaction"("subject", "subjectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_subject_subjectId_subjectKey_key" ON "Reaction"("subject", "subjectId", "subjectKey");
