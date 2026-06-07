'use client';

// Drop-in replacement for @clerk/nextjs useOrganization.
// Same signature: { organization, membership, isLoaded }
//
// Renamed from `organization` → `workspace` to match our auth-context naming
// (the underlying data is a tenant, surfaced as a workspace).

import { useAuthContext } from './auth-context';

export function useOrganization() {
  const ctx = useAuthContext();

  return {
    organization: ctx.workspace
      ? {
          id: ctx.workspace.id,
          name: ctx.workspace.name,
          slug: ctx.workspace.slug,
          imageUrl: ctx.workspace.imageUrl,
          hasImage: ctx.workspace.hasImage,
          address: ctx.workspace.address
        }
      : null,
    membership: ctx.membership
      ? {
          id: ctx.membership.id,
          role: ctx.membership.role,
          permissions: ctx.membership.permissions
        }
      : null,
    isLoaded: ctx.isLoaded
  };
}
