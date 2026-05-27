'use client';

import type { ReactNode } from 'react';
import { useAuthContext } from '@/lib/auth/auth-context';

type Props = {
  when?: { plan?: string; feature?: string; permission?: string };
  children: ReactNode;
  fallback?: ReactNode;
};

export function Show({ children, fallback = null }: Props) {
  // Always show children for now — plan/feature checks can be added later.
  // Our auth system doesn't have plan/feature concepts matching Clerk's billing.

  return <>{children}</>;
}
