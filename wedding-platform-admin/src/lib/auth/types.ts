// Types aligned with Clerk's API surface for drop-in replacement.
// Internal data comes from our JWT /api/identity/me response.

export type AuthUser = {
  id: string;
  fullName: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

export type AuthOrganization = {
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
  organization: AuthOrganization;
};

export type MenuItemData = {
  id: string;
  label: string;
  href?: string | null;
  icon?: string | null;
  sortOrder: number;
  parentId?: string | null;
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
  tenants: Array<{
    id: string;
    name: string;
    memberId: string;
    roles: string[];
    menus: MenuItemData[];
  }>;
};
