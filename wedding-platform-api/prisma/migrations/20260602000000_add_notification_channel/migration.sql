-- AlterEnum
DO $$ BEGIN
 CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'sms', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add channel column to notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app';

-- Drop old index, create new one with channel
DROP INDEX IF EXISTS "notifications_tenantId_userId_readAt_idx";
CREATE INDEX IF NOT EXISTS "notifications_tenantId_userId_channel_readAt_idx" ON "notifications"("tenantId", "userId", "channel", "readAt");
