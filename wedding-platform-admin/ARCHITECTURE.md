# Wedding Platform — Architecture

## 1. Identity Model

Two disjoint identities. The system never lets one transition into the other
through the normal auth surface.

| Role | Identity surface | Active workspace | Route prefix |
| --- | --- | --- | --- |
| **Tenant user** (`auth_account.user`) | `displayName`, belongs to 1+ tenants via `TenantMember` | A real tenant (or null if no memberships) | `/studio/*` |
| **Platform admin** (`auth_account.user.platformAdmin`) | `displayName`, `level: super | admin` | Always `null` (no tenant context) | `/admin/*` |

A user can technically have BOTH a `platformAdmin` row AND `TenantMember` rows
(used by the seed for the super admin to manage demo-tenant data via DB tools).
The privacy boundary in §3 below is enforced regardless: a platform admin
**cannot** authenticate as a tenant member through this app's auth surface.

## 2. Workspace Switching

Workspace switching is a **tenant-user-only** operation.

- `/api/identity/switch-tenant` requires the caller to be a non-platform user
  with an `active` membership in the target tenant.
- `POST /api/identity/switch-tenant` returns 403 `PERMISSION_DENIED` for any
  platform admin, even one who has a real `TenantMember` row.
- The `/me` response returns `tenants: []` for platform admins so the client
  never learns which tenants they could theoretically see.

A tenant user with 2+ memberships picks between their own workspaces; the
`OrgSwitcher` UI shows them as a dropdown.

## 3. Privacy Boundary

The super admin (and any platform admin) is sandboxed to `/admin/*` and only
performs cross-tenant operations there. They never:

- See another tenant's business data (leads, projects, contracts, materials, …)
- Acquire a tenant-scoped JWT
- See which tenants exist from the user's `/me` response

The server enforces this even if the client is buggy or malicious:

1. `IdentityService.me(userId)` — for users with `platformAdmin`, returns
   `tenants: []` regardless of actual `TenantMember` rows.
2. `IdentityService.switchTenant(userId, …)` — short-circuits to
   `PERMISSION_DENIED (403)` when `user.platformAdmin` is set, before any
   tenant lookup. Platform admins have no fallback path.
3. The `/admin/*` and `/studio/*` route trees each have a guard
   (`<AdminModeGuard>` / `<StudioModeGuard>`) that bounces traffic at the wrong
   identity to the correct route prefix.

## 4. Platform Admin Surface (`/admin/*`)

The platform admin console exposes 5 cross-tenant capabilities, and nothing
else:

| Capability | Route | Purpose |
| --- | --- | --- |
| Project-level settings | `/admin/settings` | Global config (encryption secrets, feature flags, etc.) |
| Account management | `/admin/accounts` | Manage all user accounts across the platform |
| Role management | `/admin/roles` | Define and assign roles platform-wide |
| Menu management | `/admin/menus` | Define the menu structure used by tenant studios |
| Tenant management | `/admin/tenants` | CRUD tenant accounts (name, status, plan, …) |

These are the **only** operations a platform admin can perform against tenant
accounts. They do NOT participate in:

- Tenant business data (leads, projects, contracts, materials, AI generations)
- Tenant user workflows (any `/studio/*` page)
- Cross-tenant reads of business data

A platform admin who needs to look at a specific tenant's data must do so via
database tools or a future "support impersonation" feature — never through the
web app's auth.

## 5. Tenant User Surface (`/studio/*`)

Tenant users live entirely in `/studio/*`. Their capabilities are bounded by
the `Role → Permission` graph on their `TenantMember` rows. The
`/api/identity/me` response includes a `menus` list computed from those
roles, which the sidebar uses to filter navigation.

Tenant users with 0 memberships are routed to `/studio/workspaces` (the picker)
after login; with 1, they go directly to `/studio/overview`; with 2+, they
land on `/studio/workspaces` and pick one.

## 6. Auth Flow

1. `POST /api/identity/login` — verifies password, returns a `TokenPair` and
   `activeTenant` (or `null` for platform admins).
2. `GET /api/identity/me` — returns the current user's identity, memberships,
   permissions, and menus. The client uses this to populate the auth context.
3. `POST /api/identity/switch-tenant` (tenant users only) — re-issues a
   `TokenPair` for a different membership. Revokes the previous refresh
   token; the new refresh token is the only valid one going forward.
4. `POST /api/identity/refresh` — exchanges a valid refresh token for a new
   `TokenPair`; the old refresh token is revoked.
5. `POST /api/identity/logout` — revokes the supplied refresh token.

## 7. Module Layout

```
wedding-platform-api/src/
├── identity/        Auth, JWT, /me, switch-tenant
├── platform/        Cross-tenant admin APIs (used by /admin/*)
├── tenants/         Tenant CRUD (used by /admin/tenants)
├── users/           Cross-tenant account management
├── roles/           Role + permission definitions
├── menus/           Menu structure
├── settings/        Platform-level configuration
├── studio/          Tenant business logic (leads, projects, …)
└── common/          Guards, decorators, shared utilities
```

`studio/*` modules are tenant-scoped: every query is `where: { tenantId }`,
enforced at the service layer. Platform modules (`platform/*`, `tenants/*`,
`users/*`, `roles/*`, `menus/*`, `settings/*`) do not take a tenant scope.
