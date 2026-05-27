'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function Dashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? '/studio/overview' : '/auth/sign-in');
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className='flex min-h-dvh items-center justify-center text-muted-foreground'>
      正在进入工作台...
    </main>
  );
}
