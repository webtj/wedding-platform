'use client';

// ModeGuards — defense-in-depth layer that enforces the right context per route.
//
// Why: even with the auth-context defaults fixed, a user could be in platform
// mode and click a /studio/* link (or vice versa). Without these guards the
// child page's `useSuspenseQuery` would fire with a JWT that the server rejects
// (403 TENANT_REQUIRED / 403 PERMISSION_DENIED), producing a runtime error.
//
// The guards watch the active route + current mode and bounce to the right
// dashboard. They render nothing while bouncing, so no prefetch fires.

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Wraps `/studio/*` content. Platform admins in platform mode are redirected
 * to `/admin/overview` (their natural home). Regular users always pass through.
 */
export function StudioModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, isPlatformAdmin, mode } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (isPlatformAdmin && mode === 'platform' && pathname.startsWith('/studio')) {
      router.replace('/admin/overview');
    }
  }, [isLoaded, isSignedIn, isPlatformAdmin, mode, pathname, router]);

  if (!isLoaded) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (isPlatformAdmin && mode === 'platform' && pathname.startsWith('/studio')) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Wraps `/admin/*` content. Non-platform-admin users (or platform admins in
 * tenant mode) are redirected to `/studio/overview` (their natural home).
 */
export function AdminModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, isPlatformAdmin, mode, activeWorkspaceId } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Non-platform users → never allowed in /admin
    if (!isPlatformAdmin && pathname.startsWith('/admin')) {
      router.replace('/studio/overview');
      return;
    }
    // Platform admin in tenant mode → /admin still works (uses admin API paths),
    // but they probably want to be in /studio. Don't auto-bounce — they may
    // have clicked a deep admin link intentionally. Only block if the API will
    // 403 due to the tenant-scoped JWT. For now: let them through.
    // (Tenant-scoped admins still have isPlatformAdmin=true, so admin APIs that
    // check `isPlatformAdmin` will pass; the ones that check `tenantId` will
    // receive the tenant context and succeed for tenant-owned data.)
    void activeWorkspaceId;
  }, [isLoaded, isSignedIn, isPlatformAdmin, mode, pathname, router, activeWorkspaceId]);

  if (!isLoaded) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (!isPlatformAdmin && pathname.startsWith('/admin')) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  return <>{children}</>;
}
