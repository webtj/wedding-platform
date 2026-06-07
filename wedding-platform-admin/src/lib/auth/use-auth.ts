'use client';

// Drop-in replacement for @clerk/nextjs useAuth.
// Same signature, same return shape — backed by our JWT auth context.
//
// Renamed from `organization` → `workspace` to match our auth-context naming
// (the underlying data is a tenant, surfaced as a workspace). The Clerk
// shim layer still returns `organization` for code that uses the Clerk API.

import { useAuthContext } from './auth-context';

export function useAuth() {
  const ctx = useAuthContext();

  return {
    userId: ctx.userId,
    orgId: ctx.activeWorkspaceId,
    activeWorkspaceId: ctx.activeWorkspaceId,
    mode: ctx.mode,
    isSignedIn: ctx.isSignedIn,
    isLoaded: ctx.isLoaded,
    isPlatformAdmin: ctx.isPlatformAdmin,
    platformLevel: ctx.platformLevel,
    permissions: ctx.permissions,
    memberships: ctx.memberships,
    organizations: ctx.workspaces,
    workspaces: ctx.workspaces,
    me: ctx.me,
    getToken: ctx.getToken,
    signOut: ctx.signOut,
    switchActiveTenant: ctx.switchActiveWorkspace,
    switchActiveWorkspace: ctx.switchActiveWorkspace,
    revalidate: ctx.revalidate
  };
}
