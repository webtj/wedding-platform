'use client';

// ── AutoTracker ──────────────────────────────────────────────────────────────
// Drop-in component that automatically:
//   1. Tracks page views on every route change (via usePathname).
//   2. Listens for uncaught errors (window.onerror, unhandledrejection).
//
// Mount once inside the providers — studio layout is the ideal place.

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAnalytics } from './use-analytics';

export function AutoTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView, trackError } = useAnalytics();

  // Track page views on route change.
  // usePathname + useSearchParams together catch both path and query changes.
  useEffect(() => {
    const fullPath = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    trackPageView(fullPath);
  }, [pathname, searchParams, trackPageView]);

  // Global error listeners.
  useEffect(() => {
    function onGlobalError(event: ErrorEvent) {
      trackError(event.error ?? new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      trackError(err, { source: 'unhandledrejection' });
    }

    window.addEventListener('error', onGlobalError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onGlobalError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [trackError]);

  // Pure side-effect component — renders nothing.
  return null;
}
