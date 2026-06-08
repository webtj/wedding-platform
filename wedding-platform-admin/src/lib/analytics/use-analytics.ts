'use client';

// ── useAnalytics Hook ────────────────────────────────────────────────────────
// React hook that exposes tracking helpers and auto-syncs auth context.
// Relies on useAuthContext() for userId / tenantId.

import { useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/lib/auth/auth-context';
import {
  track as rawTrack,
  pageView as rawPageView,
  error as rawError,
  setAnalyticsContext
} from './tracker';

export function useAnalytics() {
  const { userId, activeWorkspaceId, isLoaded } = useAuthContext();

  // Keep the tracker's context in sync with auth state.
  useEffect(() => {
    if (!isLoaded) return;
    setAnalyticsContext({
      userId: userId ?? null,
      tenantId: activeWorkspaceId ?? null
    });
  }, [userId, activeWorkspaceId, isLoaded]);

  // ── Track a custom event ───────────────────────────────────────────────────

  const trackEvent = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      rawTrack(name, properties);
    },
    []
  );

  // ── Track a page view ─────────────────────────────────────────────────────

  const trackPageView = useCallback((path: string) => {
    rawPageView(path);
  }, []);

  // ── Track an error ────────────────────────────────────────────────────────

  const trackError = useCallback(
    (err: Error, extra?: Record<string, unknown>) => {
      rawError(err, extra);
    },
    []
  );

  return { trackEvent, trackPageView, trackError };
}
