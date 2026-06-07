// Client-side types. Server-side data model uses `Tenant` (Prisma) —
// this layer renames it to `Workspace` so the UI never has to know
// the word "tenant". The mapping is 1:1 and happens in auth-context.

export type AuthUser = {
  id: string;
  fullName: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

/**
 * A workspace is exactly one tenant on the server, surfaced as a
 * user-facing unit (a wedding studio / agency). The Clerk-shaped
 * fields (slug, imageUrl, hasImage) are kept for code that imports
 * from the @clerk/nextjs shim.
 */
export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  hasImage: boolean;
  address?: string | null;
};

export type AuthMembership = {
  id: string;
  role: string;
  permissions: string[];
  workspace: AuthWorkspace;
};

export type MenuItemData = {
  id: string;
  label: string;
  href?: string | null;
  icon?: string | null;
  sortOrder: number;
  parentId?: string | null;
  scope?: 'platform' | 'tenant';
  children?: {
    id: string;
    label: string;
    href?: string | null;
    icon?: string | null;
    sortOrder: number;
  }[];
};

export type CurrentUserResponse = {
  id: string;
  displayName: string;
  isPlatformAdmin: boolean;
  platformLevel?: 'super' | 'admin';
  /** Real tenants only — the synthetic `__platform__` entry lives in `mode`, not here. */
  tenants: Array<{
    id: string;
    name: string;
    address?: string | null;
    memberId: string;
    roles: string[];
    permissions: string[];
    menus: MenuItemData[];
  }>;
};

/**
 * `mode` is the user-facing concept of "where am I working right now":
 *   - `platform` — platform admin, no tenant context (TenantPicker or platform UI)
 *   - `tenant`   — a specific workspace is active (`activeWorkspaceId` is set)
 *
 * Previously this was encoded by shoehorning a fake `__platform__` entry
 * into `tenants[]`; that was the source of the duplicated-team bug.
 */
export type WorkspaceMode = 'platform' | 'tenant';
