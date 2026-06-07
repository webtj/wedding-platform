'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';
import { TenantPicker } from '@/components/tenant-picker';

// AuthGuard behavior:
// 1. While auth state is loading, show a centered spinner.
// 2. Unauthenticated visitors are redirected to /auth/sign-in with redirect_url.
// 3. Tenant users with no active workspace see <TenantPicker /> instead of
//    the children — the dashboard content only renders once a workspace has
//    been picked, which is the only way to obtain a workspace-scoped JWT.
// 4. Platform admins NEVER see the picker. Their activeWorkspaceId is always
//    null by design (privacy boundary), and they live in /admin/*. The
//    <StudioModeGuard> / <AdminModeGuard> handle keeping them on the right
//    side of the route tree.

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, isPlatformAdmin, activeWorkspaceId, me } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/auth/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
    }
  }, [isLoaded, isSignedIn, router, pathname]);

  if (!isLoaded) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  // Only tenant users (non-platform-admin) with no active workspace need the
  // picker. Platform admins have no workspace by design — they go through
  // /admin/* and the mode-guards keep them there.
  const needsWorkspacePicker = me !== null && !isPlatformAdmin && !activeWorkspaceId;

  if (needsWorkspacePicker) {
    return <TenantPicker />;
  }

  return <>{children}</>;
}
