'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';
import { TenantPicker } from '@/components/tenant-picker';

// AuthGuard behavior:
// 1. While auth state is loading, show a centered spinner.
// 2. Unauthenticated visitors are redirected to /auth/sign-in with redirect_url.
// 3. Platform admins (state.isPlatformAdmin = true) and signed-in users with
//    no real tenant context see <TenantPicker /> instead of the children —
//    the dashboard content only renders once a tenant has been picked,
//    which is the only way to obtain a tenant-scoped JWT.

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, isPlatformAdmin, orgId, me } = useAuth();
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

  const needsTenantPicker =
    me !== null && (isPlatformAdmin ? orgId === '__platform__' : !orgId);

  if (needsTenantPicker) {
    return <TenantPicker />;
  }

  return <>{children}</>;
}
