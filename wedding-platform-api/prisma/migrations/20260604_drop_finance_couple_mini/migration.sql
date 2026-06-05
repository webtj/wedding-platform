-- ============================================================================
-- Migration: drop_finance_couple_mini
--
-- Removes 3 modules from the 2026-06-04 product review:
--   3.8  Finance (PlanPackage / TenantSubscription / ContractItem / amountCents / depositCents)
--   3.9  New-couple collaboration (couple member role, couple assignee type, couple timeline visibility,
--        couple retention download, couple-only notifications, Annotation/Confirmation lifecycle)
--   3.16 Mobile / mini-program (ChannelBinding + wechat_mini / douyin_mini auth providers)
--
-- Hand-written because the project has unrelated pre-existing shadow-DB drift
-- (platform_admins, menu_items.scope) that prisma migrate diff would otherwise splice in.
-- ============================================================================

-- ── 1. Drop foreign keys that reference soon-to-be-deleted tables ────────────
ALTER TABLE "asset_annotations"     DROP CONSTRAINT IF EXISTS "asset_annotations_assetId_fkey";
ALTER TABLE "asset_annotations"     DROP CONSTRAINT IF EXISTS "asset_annotations_createdByUserId_fkey";
ALTER TABLE "channel_bindings"      DROP CONSTRAINT IF EXISTS "channel_bindings_tenantId_fkey";
ALTER TABLE "confirmation_events"   DROP CONSTRAINT IF EXISTS "confirmation_events_confirmationId_fkey";
ALTER TABLE "confirmation_events"   DROP CONSTRAINT IF EXISTS "confirmation_events_actorUserId_fkey";
ALTER TABLE "confirmations"         DROP CONSTRAINT IF EXISTS "confirmations_projectId_fkey";
ALTER TABLE "confirmations"         DROP CONSTRAINT IF EXISTS "confirmations_createdByUserId_fkey";
ALTER TABLE "contract_items"        DROP CONSTRAINT IF EXISTS "contract_items_contractId_fkey";
ALTER TABLE "tenant_subscriptions"  DROP CONSTRAINT IF EXISTS "tenant_subscriptions_tenantId_fkey";
ALTER TABLE "tenant_subscriptions"  DROP CONSTRAINT IF EXISTS "tenant_subscriptions_planPackageId_fkey";

-- ── 2. Drop columns that go away with the modules ────────────────────────────
ALTER TABLE "asset_retention_policies"   DROP COLUMN IF EXISTS "allowCoupleDownload";
ALTER TABLE "wedding_timeline_items"     DROP COLUMN IF EXISTS "visibleToCouple";
ALTER TABLE "contracts"                  DROP COLUMN IF EXISTS "amountCents";
ALTER TABLE "contracts"                  DROP COLUMN IF EXISTS "depositCents";

-- ── 3. Convert enum-backed columns to TEXT (assigneeType / role no longer enums) ─
-- Tasks/process_template_tasks used TaskAssigneeType; project_members used ProjectMemberRole.
-- After this section, no column depends on those enums.
ALTER TABLE "tasks"                  ALTER COLUMN "assigneeType"          DROP DEFAULT;
ALTER TABLE "tasks"                  ALTER COLUMN "assigneeType"          TYPE TEXT USING ("assigneeType"::text);
ALTER TABLE "tasks"                  ALTER COLUMN "assigneeType"          SET DEFAULT 'planner';

ALTER TABLE "process_template_tasks" ALTER COLUMN "assigneeType"          DROP DEFAULT;
ALTER TABLE "process_template_tasks" ALTER COLUMN "assigneeType"          TYPE TEXT USING ("assigneeType"::text);
ALTER TABLE "process_template_tasks" ALTER COLUMN "assigneeType"          SET DEFAULT 'planner';

ALTER TABLE "project_members"        ALTER COLUMN "role"                  DROP DEFAULT;
ALTER TABLE "project_members"        ALTER COLUMN "role"                  TYPE TEXT USING ("role"::text);
ALTER TABLE "project_members"        ALTER COLUMN "role"                  SET DEFAULT 'planner';

-- ── 4. Drop the tables themselves ───────────────────────────────────────────
-- Tables are dropped BEFORE the enums they reference so we don't need CASCADE
-- and the rollback story stays clean (the enum drops are then unconditional).
DROP TABLE IF EXISTS "asset_annotations";
DROP TABLE IF EXISTS "confirmation_events";
DROP TABLE IF EXISTS "confirmations";
DROP TABLE IF EXISTS "contract_items";
DROP TABLE IF EXISTS "plan_packages";
DROP TABLE IF EXISTS "tenant_subscriptions";
DROP TABLE IF EXISTS "channel_bindings";

-- ── 5. Drop the now-orphaned enums (no remaining column dependents) ─────────
-- (TaskAssigneeType / ConfirmationStatus / ConfirmationEventType / AnnotationStatus /
--  PlanPackageStatus / TenantSubscriptionStatus / BillingCycle / PlatformChannelType /
--  PlatformChannelStatus)
DROP TYPE IF EXISTS "TaskAssigneeType";
DROP TYPE IF EXISTS "ConfirmationStatus";
DROP TYPE IF EXISTS "ConfirmationEventType";
DROP TYPE IF EXISTS "AnnotationStatus";
DROP TYPE IF EXISTS "PlanPackageStatus";
DROP TYPE IF EXISTS "TenantSubscriptionStatus";
DROP TYPE IF EXISTS "BillingCycle";
DROP TYPE IF EXISTS "PlatformChannelType";
DROP TYPE IF EXISTS "PlatformChannelStatus";

-- ── 6. Prune enum values that survive on other tables ───────────────────────
-- NotificationType: remove 'annotation'
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('task', 'task_reminder', 'asset', 'ai', 'system', 'contract_update', 'system_alert');
ALTER TABLE "notifications" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- ArchivePackageType: remove 'couple_delivery'
BEGIN;
CREATE TYPE "ArchivePackageType_new" AS ENUM ('full_project', 'assets_only', 'case_draft');
ALTER TABLE "archive_packages" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "archive_packages" ALTER COLUMN "type" TYPE "ArchivePackageType_new" USING ("type"::text::"ArchivePackageType_new");
ALTER TYPE "ArchivePackageType" RENAME TO "ArchivePackageType_old";
ALTER TYPE "ArchivePackageType_new" RENAME TO "ArchivePackageType";
DROP TYPE "public"."ArchivePackageType_old";
COMMIT;

-- AuthProvider: remove 'wechat_mini' / 'douyin_mini'
BEGIN;
CREATE TYPE "AuthProvider_new" AS ENUM ('password', 'phone');
ALTER TABLE "auth_accounts" ALTER COLUMN "provider" TYPE "AuthProvider_new" USING ("provider"::text::"AuthProvider_new");
ALTER TYPE "AuthProvider" RENAME TO "AuthProvider_old";
ALTER TYPE "AuthProvider_new" RENAME TO "AuthProvider";
DROP TYPE "public"."AuthProvider_old";
COMMIT;

-- ProjectMemberRole: remove 'couple'
BEGIN;
CREATE TYPE "ProjectMemberRole_new" AS ENUM ('planner');
ALTER TYPE "ProjectMemberRole" RENAME TO "ProjectMemberRole_old";
ALTER TYPE "ProjectMemberRole_new" RENAME TO "ProjectMemberRole";
DROP TYPE "public"."ProjectMemberRole_old";
COMMIT;
