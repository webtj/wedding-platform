-- Drop the role_permissions join table.
-- Role.permissionCodes (String[]) is the single source of truth for
-- a role's effective permissions at runtime; the join table was written
-- to by the seed but never read. The Permission table is kept (still used
-- by the seed for code → group metadata, but no longer related to roles).
DROP TABLE IF EXISTS "role_permissions";
