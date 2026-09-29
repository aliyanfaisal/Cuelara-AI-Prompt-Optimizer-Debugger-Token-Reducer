-- Add fields for the floating support widget submissions
ALTER TABLE "ContactMessage" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "ContactMessage" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'contact';
