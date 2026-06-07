'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function Page() {
  const router = useRouter();
  const { isLoaded, isSignedIn, isPlatformAdmin } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/auth/sign-in');
      return;
    }
    router.replace(isPlatformAdmin ? '/admin/overview' : '/studio/overview');
  }, [isLoaded, isSignedIn, isPlatformAdmin, router]);

  return (
    <main className='flex min-h-dvh items-center justify-center text-muted-foreground'>
      正在进入工作台...
    </main>
  );
}
