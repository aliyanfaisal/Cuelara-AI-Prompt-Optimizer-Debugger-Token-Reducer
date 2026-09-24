-- CreateTable
CREATE TABLE "ToolRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolRun_userId_tool_updatedAt_idx" ON "ToolRun"("userId", "tool", "updatedAt");

-- CreateIndex
CREATE INDEX "ToolRun_userId_createdAt_idx" ON "ToolRun"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ToolRun" ADD CONSTRAINT "ToolRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
