'use client';

// Drop-in replacement for @clerk/nextjs useUser
// Same signature: { user, isLoaded }

import { useAuthContext } from './auth-context';

export function useUser() {
  const ctx = useAuthContext();

  return {
    user: ctx.user,
    isLoaded: ctx.isLoaded
  };
}
