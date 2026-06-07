-- ============================================================================
-- Migration: add_user_last_active_tenant_id
--
-- Adds `users.lastActiveTenantId` (nullable, no FK) so that login() can
-- remember the tenant a user last picked via switchTenant and default to it
-- on next login when it is still an active membership. Nullable because
-- existing users have never set it; no index because the only lookup is
-- a single-row read in the login hot path, not a list/filter query.
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "lastActiveTenantId" TEXT;
