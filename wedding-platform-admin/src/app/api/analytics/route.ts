import { NextResponse } from 'next/server';

// ── Analytics Ingestion Route ────────────────────────────────────────────────
// Receives batched analytics events from the client tracker.
// Forward to the backend API for persistent storage.
// Always returns 204 — analytics should never block the user.

interface AnalyticsPayload {
  event: string;
  properties?: Record<string, unknown>;
  userId: string | null;
  tenantId: string | null;
  sessionId: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: AnalyticsPayload | AnalyticsPayload[];
    try {
      body = (await request.json()) as AnalyticsPayload | AnalyticsPayload[];
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    // Normalize to array.
    const events = Array.isArray(body) ? body : [body];
    if (events.length === 0) {
      return new NextResponse(null, { status: 204 });
    }

    // Forward to backend. Fire-and-forget — don't await or block.
    // If backend is down, we silently drop the events.
    fetch(`${getBackendUrl()}/api/analytics/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    }).catch(() => {
      // Silently drop — analytics failures must never surface to the user.
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Even top-level errors return 204 — analytics should be invisible.
    return new NextResponse(null, { status: 204 });
  }
}
