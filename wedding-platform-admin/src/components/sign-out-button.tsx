'use client';

// Drop-in replacement for Clerk's <SignOutButton>.
// Renders a clickable element that signs the user out.

import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth/auth-client';

type Props = {
  redirectUrl?: string;
  children?: ReactNode;
};

export function SignOutButton({ redirectUrl = '/auth/sign-in', children }: Props) {
  const router = useRouter();

  const handleClick = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      await logout();
      router.replace(redirectUrl);
    },
    [redirectUrl, router]
  );

  return (
    <button
      type='button'
      onClick={handleClick}
      className='cursor-pointer border-0 bg-transparent p-0 text-inherit'
    >
      {children ?? 'Sign out'}
    </button>
  );
}
