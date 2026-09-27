-- Tracks when POST /api/indexing/submit last successfully notified Google for a URL, so its
-- only_new mode (used by a recurring catch-up cron) stops resubmitting the same URLs forever.
ALTER TABLE "BlogPost" ADD COLUMN "indexingSubmittedAt" TIMESTAMP(3);
ALTER TABLE "CookbookPrompt" ADD COLUMN "indexingSubmittedAt" TIMESTAMP(3);
