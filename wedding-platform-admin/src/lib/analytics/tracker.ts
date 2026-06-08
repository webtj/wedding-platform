// ── Analytics Tracker ────────────────────────────────────────────────────────
// Low-level, framework-agnostic event tracker.
// Batches events and flushes via navigator.sendBeacon() with fetch() fallback.
// All operations are async and non-blocking — zero impact on user experience.

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 5;
const ENDPOINT = '/api/analytics';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsContext {
  userId: string | null;
  tenantId: string | null;
  sessionId: string;
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  userId: string | null;
  tenantId: string | null;
  sessionId: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

// ── Tracker State ────────────────────────────────────────────────────────────

interface AnalyticsTrackerState {
  queue: AnalyticsEvent[];
  flushTimer: ReturnType<typeof setInterval> | null;
  context: AnalyticsContext;
}

function createSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const globalTracker = globalThis as typeof globalThis & {
  __weddingAnalyticsTracker?: AnalyticsTrackerState;
  __weddingAnalyticsTrackerListenersAttached?: boolean;
};

if (globalTracker.__weddingAnalyticsTracker?.flushTimer) {
  clearInterval(globalTracker.__weddingAnalyticsTracker.flushTimer);
  globalTracker.__weddingAnalyticsTracker.flushTimer = null;
}

const trackerState: AnalyticsTrackerState =
  globalTracker.__weddingAnalyticsTracker ?? {
    queue: [],
    flushTimer: null,
    context: {
      userId: null,
      tenantId: null,
      sessionId: createSessionId()
    }
  };

globalTracker.__weddingAnalyticsTracker = trackerState;

// ── Context Management ───────────────────────────────────────────────────────

export function setAnalyticsContext(next: Partial<AnalyticsContext>) {
  trackerState.context = { ...trackerState.context, ...next };
}

export function getAnalyticsContext(): Readonly<AnalyticsContext> {
  return trackerState.context;
}

// ── Transport ────────────────────────────────────────────────────────────────

function sendPayload(payload: AnalyticsEvent[]): boolean {
  if (payload.length === 0) return true;

  const body = JSON.stringify(payload);

  // Prefer sendBeacon — survives page unload, non-blocking.
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(ENDPOINT, blob);
  }

  // Fallback to fetch (keepalive ensures it survives unload in modern browsers).
  if (typeof fetch !== 'undefined') {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {
      // Swallow — analytics should never break the app.
    });
    return true;
  }

  return false;
}

function flush(): void {
  if (trackerState.queue.length === 0) return;
  const batch = trackerState.queue.splice(0, FLUSH_BATCH_SIZE);
  sendPayload(batch);
}

function scheduleFlush(): void {
  if (trackerState.flushTimer) return;
  trackerState.flushTimer = setInterval(() => {
    trackerState.flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

function enqueue(event: AnalyticsEvent): void {
  trackerState.queue.push(event);
  if (trackerState.queue.length >= FLUSH_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

function buildEvent(
  event: string,
  properties?: Record<string, unknown>
): AnalyticsEvent {
  return {
    event,
    properties,
    userId: trackerState.context.userId,
    tenantId: trackerState.context.tenantId,
    sessionId: trackerState.context.sessionId,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };
}

/**
 * Track a custom analytics event.
 * Non-blocking — enqueues and flushes in batches.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  enqueue(buildEvent(event, properties));
}

/**
 * Track a page view.
 */
export function pageView(path: string): void {
  track('page_view', { path });
}

/**
 * Track an error with optional context.
 * Always flushed immediately (does not wait for batch).
 */
export function error(err: Error, context?: Record<string, unknown>): void {
  const event = buildEvent('error', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...context
  });
  // Flush errors immediately — don't wait for the batch.
  sendPayload([event]);
}

/**
 * Flush any remaining queued events.
 * Call this on page unload if sendBeacon is unavailable.
 */
export function flushSync(): void {
  if (trackerState.queue.length === 0) return;
  const remaining = trackerState.queue.splice(0);
  sendPayload(remaining);
}

// Flush on page unload — belt and suspenders with keepalive.
if (typeof window !== 'undefined') {
  if (!globalTracker.__weddingAnalyticsTrackerListenersAttached) {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushSync();
      }
    });
    window.addEventListener('pagehide', flushSync);
    globalTracker.__weddingAnalyticsTrackerListenersAttached = true;
  }
}
