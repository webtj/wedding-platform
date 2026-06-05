'use client';

import type { ReactNode } from 'react';

type Props = {
  when?: { plan?: string; feature?: string; permission?: string };
  children: ReactNode;
  fallback?: ReactNode;
};

export function Show({ children, fallback: _fallback = null }: Props) {
  // Always show children for now — plan/feature checks can be added later.
  // Our auth system doesn't have plan/feature concepts matching Clerk's billing.

  return <>{children}</>;
}
