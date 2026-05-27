'use client';

// Drop-in replacement for @clerk/nextjs useOrganization
// Same signature: { organization, membership, isLoaded }

import { useAuthContext } from './auth-context';

export function useOrganization() {
  const ctx = useAuthContext();

  return {
    organization: ctx.organization,
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
