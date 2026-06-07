'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function Dashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, isPlatformAdmin } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/auth/sign-in');
      return;
    }
    // Platform admins live in /admin/*; tenant users live in /studio/*.
    // The login form already routes platform admins to /admin/overview, so
    // hitting "/" usually means a deep link or refresh — pick the right
    // dashboard by role.
    router.replace(isPlatformAdmin ? '/admin/overview' : '/studio/overview');
  }, [isLoaded, isSignedIn, isPlatformAdmin, router]);

  return (
    <main className='flex min-h-dvh items-center justify-center text-muted-foreground'>
      正在进入工作台...
    </main>
  );
}
