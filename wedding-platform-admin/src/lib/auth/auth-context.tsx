'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMe,
  logout,
  getCachedMe,
  switchTenant,
  AUTH_ME_INVALIDATED_EVENT,
  AUTH_SESSION_ENDED_EVENT
} from './auth-client';
import { getActiveTenantId, setActiveTenantId } from './auth-storage';
import type {
  AuthUser,
  AuthWorkspace,
  AuthMembership,
  CurrentUserResponse,
  MenuItemData,
  WorkspaceMode
} from './types';

// ── Context state ──────────────────────────────────────────────────────────

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  /**
   * The active workspace ID (a real tenant ID). `null` for platform admins
   * (they have no business accessing tenant data) and for tenant users with
   * no memberships.
   */
  activeWorkspaceId: string | null;
  /**
   * Synonym for `activeWorkspaceId` — kept for compatibility with code that
   * still uses the Clerk-style `orgId` name. Prefer `activeWorkspaceId` in
   * new code.
   */
  orgId: string | null;
  mode: WorkspaceMode;
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
  membership: AuthMembership | null;
  workspaces: AuthWorkspace[];
  memberships: Array<{
    id: string;
    role: string;
    permissions: string[];
    workspace: AuthWorkspace;
  }>;
  menus: MenuItemData[];
  me: CurrentUserResponse | null;
  isPlatformAdmin: boolean;
  platformLevel?: 'super' | 'admin';
  permissions: string[];
};

const initialState: AuthState = {
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  activeWorkspaceId: null,
  orgId: null,
  mode: 'tenant',
  user: null,
  workspace: null,
  membership: null,
  workspaces: [],
  memberships: [],
  menus: [],
  me: null,
  isPlatformAdmin: false,
  permissions: []
};

type AuthContextValue = AuthState & {
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => void;
  switchActiveWorkspace: (workspaceId: string) => Promise<void>;
  revalidate: () => Promise<CurrentUserResponse | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ────────────────────────────────────────────────────────────────

function mapUser(me: CurrentUserResponse): AuthUser {
  return {
    id: me.id,
    fullName: me.displayName,
    imageUrl: '',
    primaryEmailAddress: { emailAddress: '' },
    emailAddresses: [{ emailAddress: '' }]
  };
}

function mapWorkspace(tenant: CurrentUserResponse['tenants'][number]): AuthWorkspace {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: null,
    imageUrl: '',
    hasImage: false,
    address: tenant.address ?? null
  };
}

function mapMembership(tenant: CurrentUserResponse['tenants'][number]): AuthMembership {
  return {
    id: tenant.memberId,
    role: tenant.roles[0] ?? 'member',
    permissions: tenant.permissions ?? [],
    workspace: mapWorkspace(tenant)
  };
}

function collectPermissions(me: CurrentUserResponse, tenantId: string): string[] {
  if (me.isPlatformAdmin) return ['*'];
  const tenant = me.tenants.find((t) => t.id === tenantId);
  return tenant?.permissions ?? [];
}

/**
 * Build state from a /me response.
 *
 * Two disjoint identity modes:
 *   - Platform admin: `me.tenants` is always empty (server hides memberships
 *     to enforce the privacy boundary). Mode is fixed to 'platform', no active
 *     workspace. They use the admin console at /admin/* and never see tenant
 *     business data.
 *   - Tenant user:    `me.tenants` is the list of workspaces they belong to.
 *     Mode='tenant', active workspace is the persisted choice (or the first
 *     one if no persisted choice). They use the studio at /studio/*.
 *
 * The only legitimate "switch" is a tenant user moving between their own
 * workspaces (multi-tenant planners, freelancers in 2+ studios, etc.). There
 * is no path for a platform admin to enter a tenant.
 */
function buildState(me: CurrentUserResponse): Omit<AuthState, 'isLoaded' | 'isSignedIn'> {
  const isPlatformAdmin = !!me.isPlatformAdmin;
  const platformMenus = (me as { platformMenus?: MenuItemData[] }).platformMenus ?? [];

  // Platform admin: no workspaces, no impersonation.
  if (isPlatformAdmin) {
    return {
      userId: me.id,
      activeWorkspaceId: null,
      orgId: null,
      mode: 'platform',
      user: mapUser(me),
      workspace: null,
      membership: null,
      workspaces: [],
      memberships: [],
      menus: platformMenus,
      me,
      isPlatformAdmin: true,
      platformLevel: me.platformLevel,
      permissions: ['*']
    };
  }

  // Tenant user: pick the active workspace.
  const persisted = getActiveTenantId();
  const activeTenant =
    (persisted ? me.tenants.find((t) => t.id === persisted) : null) ?? me.tenants[0] ?? null;
  const activeWorkspaceId = activeTenant?.id ?? null;

  return {
    userId: me.id,
    activeWorkspaceId,
    orgId: activeWorkspaceId,
    mode: 'tenant',
    user: mapUser(me),
    workspace: activeTenant ? mapWorkspace(activeTenant) : null,
    membership: activeTenant ? mapMembership(activeTenant) : null,
    workspaces: me.tenants.map(mapWorkspace),
    memberships: me.tenants.map((t) => ({
      id: t.memberId,
      role: t.roles[0] ?? 'member',
      permissions: collectPermissions(me, t.id),
      workspace: mapWorkspace(t)
    })),
    menus: activeTenant?.menus ?? [],
    me,
    isPlatformAdmin: false,
    platformLevel: me.platformLevel,
    permissions: activeTenant?.permissions ?? []
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function ClerkProvider({
  children,
  appearance: _appearance
}: {
  children: ReactNode;
  appearance?: unknown;
}) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(() => {
    const cached = getCachedMe();
    if (cached) {
      return { ...initialState, isLoaded: true, isSignedIn: true, ...buildState(cached) };
    }
    return initialState;
  });

  // Single source of truth for "go fetch /me and apply it to React state".
  // Returns the freshly fetched me on success, or null if /me failed (the
  // state is reset and the user is bounced to /auth/sign-in in that case).
  // Both `bootstrap` (initial mount) and `revalidate` (post-mutation) flow
  // through this so callers can `await` and read the new me back.
  const fetchAndApply = useCallback(async (): Promise<CurrentUserResponse | null> => {
    try {
      const me = await fetchMe();
      setState({ ...initialState, isLoaded: true, isSignedIn: true, ...buildState(me) });
      return me;
    } catch {
      setState({ ...initialState, isLoaded: true });
      router.replace('/auth/sign-in');
      return null;
    }
  }, [router]);

  const bootstrap = useCallback(() => fetchAndApply(), [fetchAndApply]);
  const revalidate = useCallback(() => fetchAndApply(), [fetchAndApply]);

  useEffect(() => {
    if (!state.isLoaded) {
      void bootstrap();
    }
  }, [state.isLoaded, bootstrap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      void bootstrap();
    };
    window.addEventListener(AUTH_ME_INVALIDATED_EVENT, handler);
    return () => window.removeEventListener(AUTH_ME_INVALIDATED_EVENT, handler);
  }, [bootstrap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      // Hard reset to the signed-out state. Do NOT bootstrap — the tokens
      // were just cleared and bootstrap would 401 on a stale session.
      // The caller of logout() is responsible for redirecting.
      setState({ ...initialState, isLoaded: true });
    };
    window.addEventListener(AUTH_SESSION_ENDED_EVENT, handler);
    return () => window.removeEventListener(AUTH_SESSION_ENDED_EVENT, handler);
  }, []);

  const getToken = useCallback(async () => {
    const { getAccessToken } = await import('./auth-storage');
    return getAccessToken();
  }, []);

  const signOut = useCallback(async () => {
    // logout() now does the full session cleanup (clearTokens,
    // clearActiveTenantId, dispatch AUTH_SESSION_ENDED_EVENT). The event
    // listener above resets the auth state. We only need to navigate.
    await logout();
    router.replace('/auth/sign-in');
  }, [router]);

  const setActiveWorkspace = useCallback(
    (workspaceId: string) => {
      if (!state.me || state.me.isPlatformAdmin) return;
      const tenant = state.me.tenants.find((t) => t.id === workspaceId);
      if (!tenant) return;
      setActiveTenantId(workspaceId);
      setState((prev) => ({
        ...prev,
        activeWorkspaceId: workspaceId,
        orgId: workspaceId,
        mode: 'tenant',
        workspace: mapWorkspace(tenant),
        membership: mapMembership(tenant),
        memberships: prev.memberships.map((m) => ({
          ...m,
          permissions: collectPermissions(state.me!, m.workspace.id)
        })),
        menus: tenant.menus ?? [],
        permissions: tenant.permissions ?? []
      }));
    },
    [state.me]
  );

  const switchActiveWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!state.me || state.me.isPlatformAdmin) {
        throw new Error('工作空间不存在或无权访问');
      }
      const tenant = state.me.tenants.find((t) => t.id === workspaceId);
      if (!tenant) {
        throw new Error('工作空间不存在或无权访问');
      }

      const result = await switchTenant(workspaceId);
      setActiveTenantId(workspaceId);
      setState((prev) => ({
        ...prev,
        activeWorkspaceId: workspaceId,
        orgId: workspaceId,
        mode: 'tenant',
        workspace: mapWorkspace(tenant),
        membership: mapMembership(tenant),
        memberships: prev.memberships.map((m) => ({
          ...m,
          permissions: collectPermissions(state.me!, m.workspace.id)
        })),
        menus: tenant.menus ?? [],
        permissions: result.permissions
      }));
    },
    [state.me]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      getToken,
      signOut,
      setActiveWorkspace,
      switchActiveWorkspace,
      revalidate
    }),
    [state, getToken, signOut, setActiveWorkspace, switchActiveWorkspace, revalidate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Consumer hook ──────────────────────────────────────────────────────────

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <ClerkProvider>');
  return ctx;
}
