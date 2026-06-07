'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type ForbiddenContextValue = {
  /**
   * Most recent 403 payload. Renders as a global panel when non-null.
   * Cleared when the user dismisses the panel or the panel auto-times out
   * after navigation.
   */
  current: ForbiddenPayload | null;
  /**
   * Called by api-client (and the QueryErrorBoundary) when a 403 surfaces.
   * Deduped by `requiredPermissions + resource` so back-to-back 403s from
   * the same source don't stack the panel.
   */
  report: (payload: ForbiddenPayload) => void;
  dismiss: () => void;
};

export type ForbiddenPayload = {
  requiredPermissions?: string[];
  resource?: string;
  /** Where this 403 came from — used by the panel to choose wording. */
  source: 'query' | 'mutation' | 'route';
  /** Optional message override (defaults to a friendly description). */
  message?: string;
};

function samePayload(a: ForbiddenPayload, b: ForbiddenPayload): boolean {
  if (a.source !== b.source) return false;
  if ((a.resource ?? '') !== (b.resource ?? '')) return false;
  if ((a.message ?? '') !== (b.message ?? '')) return false;
  const ap = a.requiredPermissions ?? [];
  const bp = b.requiredPermissions ?? [];
  if (ap.length !== bp.length) return false;
  const set = new Set(ap);
  for (const p of bp) if (!set.has(p)) return false;
  return true;
}

const ForbiddenContext = createContext<ForbiddenContextValue | null>(null);

export function ForbiddenProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ForbiddenPayload | null>(null);

  const dismiss = useCallback(() => setCurrent(null), []);

  const report = useCallback((payload: ForbiddenPayload) => {
    setCurrent((prev) => (prev && samePayload(prev, payload) ? prev : payload));
  }, []);

  // Bridge api-client's window event into the React state. Keeps api-client
  // free of React imports so it stays usable in route handlers and tests.
  useEffect(() => {
    function onForbidden(e: Event) {
      const ce = e as CustomEvent<ForbiddenPayload>;
      report(ce.detail);
    }
    window.addEventListener('app:forbidden', onForbidden as EventListener);
    return () =>
      window.removeEventListener('app:forbidden', onForbidden as EventListener);
  }, [report]);

  const value = useMemo<ForbiddenContextValue>(
    () => ({ current, report, dismiss }),
    [current, report, dismiss]
  );

  return (
    <ForbiddenContext.Provider value={value}>
      {children}
    </ForbiddenContext.Provider>
  );
}

export function useForbidden(): ForbiddenContextValue {
  const ctx = useContext(ForbiddenContext);
  if (!ctx) {
    throw new Error('useForbidden must be used within <ForbiddenProvider>');
  }
  return ctx;
}
