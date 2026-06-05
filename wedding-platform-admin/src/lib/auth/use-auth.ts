'use client';

// Drop-in replacement for @clerk/nextjs useAuth
// Same signature, same return shape — backed by our JWT auth context.

import { useAuthContext } from './auth-context';

export function useAuth() {
  const ctx = useAuthContext();

  return {
    userId: ctx.userId,
    orgId: ctx.orgId,
    isSignedIn: ctx.isSignedIn,
    isLoaded: ctx.isLoaded,
    isPlatformAdmin: ctx.isPlatformAdmin,
    platformLevel: ctx.platformLevel,
    permissions: ctx.permissions,
    getToken: ctx.getToken,
    signOut: ctx.signOut
  };
}
