'use client';

// Drop-in replacement for @clerk/nextjs useOrganizationList.
// Same shape as Clerk's useOrganizationList({ userMemberships: { infinite: true } })
//
// Renamed from `organization` → `workspace` to match our auth-context naming.

import { useCallback } from 'react';
import { useAuthContext } from './auth-context';

export function useOrganizationList(_opts?: unknown) {
  const ctx = useAuthContext();

  const userMemberships = {
    data: ctx.memberships.map((m) => ({
      id: m.id,
      role: m.role,
      organization: {
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        imageUrl: m.workspace.imageUrl,
        hasImage: m.workspace.hasImage
      }
    })),
    revalidate: ctx.revalidate
  };

  const setActive = useCallback(
    async ({ organization }: { organization: string }) => {
      await ctx.switchActiveWorkspace(organization);
    },
    [ctx]
  );

  return {
    isLoaded: ctx.isLoaded,
    setActive,
    userMemberships
  };
}
