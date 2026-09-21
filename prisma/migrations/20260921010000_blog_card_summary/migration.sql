-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "readingMinutes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "teaser" TEXT;

-- Backfill rows created before these columns existed (~200 words per minute, first 200 characters as teaser).
UPDATE "BlogPost"
SET "readingMinutes" = GREATEST(1, ROUND(COALESCE(array_length(regexp_split_to_array(btrim("content"), '\s+'), 1), 0) / 200.0)::INTEGER),
    "teaser" = LEFT(regexp_replace(btrim("content"), '\s+', ' ', 'g'), 200);
