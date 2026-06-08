import { apiClient } from '@/lib/api-client';
import type {
  RequestLog,
  ErrorLog,
  AuditLog,
  BehaviorEvent,
  StatsOverview,
  DailyErrors,
  HourlyRequests,
  TopError,
  SlowRequest,
  PaginatedResponse,
  RequestLogQueryParams,
  ErrorLogQueryParams,
  AuditLogQueryParams,
  EventLogQueryParams,
  DateRangeParams,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ── List endpoints ──────────────────────────────────────────────────────────

export async function fetchRequestLogs(
  params?: RequestLogQueryParams
): Promise<PaginatedResponse<RequestLog>> {
  return apiClient<PaginatedResponse<RequestLog>>(
    `/logs/requests${buildQuery(params)}`
  );
}

export async function fetchErrorLogs(
  params?: ErrorLogQueryParams
): Promise<PaginatedResponse<ErrorLog>> {
  return apiClient<PaginatedResponse<ErrorLog>>(
    `/logs/errors${buildQuery(params)}`
  );
}

export async function fetchAuditLogs(
  params?: AuditLogQueryParams
): Promise<PaginatedResponse<AuditLog>> {
  return apiClient<PaginatedResponse<AuditLog>>(
    `/logs/audits${buildQuery(params)}`
  );
}

export async function fetchEventLogs(
  params?: EventLogQueryParams
): Promise<PaginatedResponse<BehaviorEvent>> {
  return apiClient<PaginatedResponse<BehaviorEvent>>(
    `/logs/events${buildQuery(params)}`
  );
}

// ── Stats endpoints ─────────────────────────────────────────────────────────

export async function fetchStatsOverview(
  params?: DateRangeParams
): Promise<StatsOverview> {
  return apiClient<StatsOverview>(
    `/logs/stats/overview${buildQuery(params)}`
  );
}

export async function fetchErrorsByDay(
  params?: DateRangeParams
): Promise<DailyErrors[]> {
  return apiClient<DailyErrors[]>(
    `/logs/stats/errors-by-day${buildQuery(params)}`
  );
}

export async function fetchRequestsByHour(
  params?: DateRangeParams
): Promise<HourlyRequests[]> {
  return apiClient<HourlyRequests[]>(
    `/logs/stats/requests-by-hour${buildQuery(params)}`
  );
}

export async function fetchTopErrors(
  params?: DateRangeParams
): Promise<TopError[]> {
  return apiClient<TopError[]>(
    `/logs/stats/top-errors${buildQuery(params)}`
  );
}

export async function fetchSlowRequests(
  params?: DateRangeParams
): Promise<SlowRequest[]> {
  return apiClient<SlowRequest[]>(
    `/logs/stats/slow-requests${buildQuery(params)}`
  );
}
