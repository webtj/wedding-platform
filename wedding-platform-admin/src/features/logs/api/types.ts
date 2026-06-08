// ── Request Log ─────────────────────────────────────────────────────────────

export interface RequestLog {
  id: string;
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ── Error Log ───────────────────────────────────────────────────────────────

export interface ErrorLog {
  id: string;
  traceId: string;
  message: string;
  stack: string | null;
  path: string | null;
  userId: string | null;
  tenantId: string | null;
  requestBody: unknown;
  createdAt: string;
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string | null;
  tenantId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Behavior Event ──────────────────────────────────────────────────────────

export interface BehaviorEvent {
  id: string;
  eventType: string;
  eventName: string;
  userId: string | null;
  tenantId: string | null;
  page: string | null;
  properties: Record<string, unknown> | null;
  sessionId: string | null;
  createdAt: string;
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface StatsOverview {
  totalRequests: number;
  totalErrors: number;
  avgDuration: number;
}

export interface DailyErrors {
  day: string;
  count: number;
}

export interface HourlyRequests {
  hour: number;
  count: number;
}

export interface TopError {
  message: string;
  path: string | null;
  count: number;
}

export interface SlowRequest {
  method: string;
  path: string;
  avgDuration: number;
  maxDuration: number;
  count: number;
}

// ── Paginated response ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Query params ────────────────────────────────────────────────────────────

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface LogQueryParams extends DateRangeParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  tenantId?: string;
}

export interface RequestLogQueryParams extends LogQueryParams {
  path?: string;
  statusCode?: number;
  method?: string;
}

export interface ErrorLogQueryParams extends LogQueryParams {
  path?: string;
}

export interface AuditLogQueryParams extends LogQueryParams {
  action?: string;
  entity?: string;
}

export interface EventLogQueryParams extends LogQueryParams {
  eventType?: string;
  eventName?: string;
}
