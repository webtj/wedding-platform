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
  invalidateMe,
  logout,
  getCachedMe,
  switchTenant,
  AUTH_ME_INVALIDATED_EVENT
} from './auth-client';
import { getActiveTenantId, setActiveTenantId } from './auth-storage';
import type {
  AuthUser,
  AuthOrganization,
  AuthMembership,
  CurrentUserResponse,
  MenuItemData
} from './types';

// ── Context state ──────────────────────────────────────────────────────────

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  orgId: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  membership: AuthMembership | null;
  organizations: AuthOrganization[];
  memberships: Array<{
    id: string;
    role: string;
    permissions: string[];
    organization: AuthOrganization;
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
  orgId: null,
  user: null,
  organization: null,
  membership: null,
  organizations: [],
  memberships: [],
  menus: [],
  me: null,
  isPlatformAdmin: false,
  permissions: []
};

type AuthContextValue = AuthState & {
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  setActiveOrg: (orgId: string) => void;
  switchActiveTenant: (tenantId: string) => Promise<void>;
  revalidate: () => Promise<void>;
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

function mapOrganization(tenant: CurrentUserResponse['tenants'][number]): AuthOrganization {
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
    organization: mapOrganization(tenant)
  };
}

function platformAdminOrg(): AuthOrganization {
  return { id: '__platform__', name: '平台管理中心', slug: null, imageUrl: '', hasImage: false };
}

function platformAdminMembership(): AuthMembership {
  return {
    id: '__platform__',
    role: 'platform_admin',
    permissions: ['*'],
    organization: platformAdminOrg()
  };
}

function collectPermissions(me: CurrentUserResponse, tenantId: string): string[] {
  if (me.isPlatformAdmin) return ['*'];
  const tenant = me.tenants.find((t) => t.id === tenantId);
  return tenant?.permissions ?? [];
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
      const activeId = getActiveTenantId();
      const org = activeId ? cached.tenants.find((t) => t.id === activeId) : cached.tenants[0];
      const finalOrg = org ?? cached.tenants[0];
      const isPlatformAdmin = cached.isPlatformAdmin;
      const platformOrg = platformAdminOrg();
      return {
        isLoaded: true,
        isSignedIn: true,
        userId: cached.id,
        orgId: activeId && activeId !== '__platform__'
          ? (finalOrg?.id ?? (isPlatformAdmin ? '__platform__' : null))
          : (isPlatformAdmin ? '__platform__' : (finalOrg?.id ?? null)),
        user: mapUser(cached),
        organization: isPlatformAdmin && (!activeId || activeId === '__platform__')
          ? platformOrg
          : finalOrg
            ? mapOrganization(finalOrg)
            : null,
        membership: isPlatformAdmin && (!activeId || activeId === '__platform__')
          ? platformAdminMembership()
          : finalOrg
            ? mapMembership(finalOrg)
            : null,
        organizations: isPlatformAdmin
          ? [platformOrg, ...cached.tenants.map(mapOrganization)]
          : cached.tenants.map(mapOrganization),
        memberships: isPlatformAdmin
          ? [platformAdminMembership(), ...cached.tenants.map((t) => ({
              id: t.memberId,
              role: t.roles[0] ?? 'member',
              permissions: collectPermissions(cached, t.id),
              organization: mapOrganization(t)
            }))]
          : cached.tenants.map((t) => ({
              id: t.memberId,
              role: t.roles[0] ?? 'member',
              permissions: collectPermissions(cached, t.id),
              organization: mapOrganization(t)
            })),
        menus: finalOrg?.menus ?? [],
        me: cached,
        isPlatformAdmin: cached.isPlatformAdmin ?? false,
        platformLevel: cached.platformLevel,
        permissions: finalOrg?.permissions ?? []
      };
    }
    return initialState;
  });

  const bootstrap = useCallback(async () => {
    try {
      const me = await fetchMe();
      const activeId = getActiveTenantId();
      const org = activeId ? me.tenants.find((t) => t.id === activeId) : me.tenants[0];
      const finalOrg = org ?? me.tenants[0];
      const isPlatformAdmin = me.isPlatformAdmin;
      const platformOrg = platformAdminOrg();
      setState({
        isLoaded: true,
        isSignedIn: true,
        userId: me.id,
        orgId: activeId && activeId !== '__platform__'
          ? (finalOrg?.id ?? (isPlatformAdmin ? '__platform__' : null))
          : (isPlatformAdmin ? '__platform__' : (finalOrg?.id ?? null)),
        user: mapUser(me),
        organization: isPlatformAdmin && (!activeId || activeId === '__platform__')
          ? platformOrg
          : finalOrg
            ? mapOrganization(finalOrg)
            : null,
        membership: isPlatformAdmin && (!activeId || activeId === '__platform__')
          ? platformAdminMembership()
          : finalOrg
            ? mapMembership(finalOrg)
            : null,
        organizations: isPlatformAdmin
          ? [platformOrg, ...me.tenants.map(mapOrganization)]
          : me.tenants.map(mapOrganization),
        memberships: isPlatformAdmin
          ? [platformAdminMembership(), ...me.tenants.map((t) => ({
              id: t.memberId,
              role: t.roles[0] ?? 'member',
              permissions: collectPermissions(me, t.id),
              organization: mapOrganization(t)
            }))]
          : me.tenants.map((t) => ({
              id: t.memberId,
              role: t.roles[0] ?? 'member',
              permissions: collectPermissions(me, t.id),
              organization: mapOrganization(t)
            })),
        menus: finalOrg?.menus ?? [],
        me,
        isPlatformAdmin: me.isPlatformAdmin ?? false,
        platformLevel: me.platformLevel,
        permissions: finalOrg?.permissions ?? []
      });
    } catch {
      setState({ ...initialState, isLoaded: true });
      router.replace('/auth/sign-in');
    }
  }, [router]);

  useEffect(() => {
    if (!state.isLoaded) {
      bootstrap();
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

  const getToken = useCallback(async () => {
    const { getAccessToken } = await import('./auth-storage');
    return getAccessToken();
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setState({ ...initialState, isLoaded: true });
    router.replace('/auth/sign-in');
  }, [router]);

  const setActiveOrg = useCallback(
    (orgId: string) => {
      if (!state.me) return;
      const tenant = state.me.tenants.find((t) => t.id === orgId);
      if (!tenant) return;
      setActiveTenantId(orgId);
      setState((prev) => ({
        ...prev,
        orgId,
        organization: mapOrganization(tenant),
        membership: mapMembership(tenant),
        memberships: prev.memberships.map((m) => ({
          ...m,
          permissions: collectPermissions(state.me!, m.organization.id)
        })),
        menus: tenant.menus ?? [],
        permissions: tenant.permissions ?? []
      }));
    },
    [state.me]
  );

  const switchActiveTenant = useCallback(
    async (tenantId: string) => {
      if (!state.me) return;
      const tenant = state.me.tenants.find((t) => t.id === tenantId);
      if (!tenant) {
        throw new Error('租户不存在或无权访问');
      }

      const result = await switchTenant(tenantId);
      setActiveTenantId(tenantId);
      setState((prev) => ({
        ...prev,
        orgId: tenantId,
        organization: mapOrganization(tenant),
        membership: mapMembership(tenant),
        memberships: prev.memberships.map((m) => ({
          ...m,
          permissions: collectPermissions(state.me!, m.organization.id)
        })),
        menus: tenant.menus ?? [],
        permissions: result.permissions
      }));
    },
    [state.me]
  );

  const revalidate = useCallback(async () => {
    invalidateMe();
    await bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, getToken, signOut, setActiveOrg, switchActiveTenant, revalidate }),
    [state, getToken, signOut, setActiveOrg, switchActiveTenant, revalidate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Consumer hook ──────────────────────────────────────────────────────────

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <ClerkProvider>');
  return ctx;
}
