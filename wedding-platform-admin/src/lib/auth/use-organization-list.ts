'use client';

// Drop-in replacement for @clerk/nextjs useOrganizationList
// Same shape as Clerk's useOrganizationList({ userMemberships: { infinite: true } })

import { useCallback } from 'react';
import { useAuthContext } from './auth-context';

export function useOrganizationList(_opts?: unknown) {
  const ctx = useAuthContext();

  const userMemberships = {
    data: ctx.memberships.map((m) => ({
      id: m.id,
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        imageUrl: m.organization.imageUrl,
        hasImage: m.organization.hasImage
      }
    })),
    revalidate: ctx.revalidate
  };

  const setActive = useCallback(
    async ({ organization }: { organization: string }) => {
      ctx.setActiveOrg(organization);
    },
    [ctx]
  );

  return {
    isLoaded: ctx.isLoaded,
    setActive,
    userMemberships
  };
}
