import { queryOptions } from '@tanstack/react-query';
import type {
  RequestLogQueryParams,
  ErrorLogQueryParams,
  AuditLogQueryParams,
  EventLogQueryParams,
  DateRangeParams,
} from './types';
import {
  fetchRequestLogs,
  fetchErrorLogs,
  fetchAuditLogs,
  fetchEventLogs,
  fetchStatsOverview,
  fetchErrorsByDay,
  fetchRequestsByHour,
  fetchTopErrors,
  fetchSlowRequests,
} from './service';

// ── Query keys ──────────────────────────────────────────────────────────────

const LOGS_ROOT = ['logs'] as const;
const LOGS_STATS_ROOT = [...LOGS_ROOT, 'stats'] as const;

export const logsKeys = {
  all: LOGS_ROOT,
  requests: (params?: RequestLogQueryParams) =>
    [...LOGS_ROOT, 'requests', params] as const,
  errors: (params?: ErrorLogQueryParams) =>
    [...LOGS_ROOT, 'errors', params] as const,
  audits: (params?: AuditLogQueryParams) =>
    [...LOGS_ROOT, 'audits', params] as const,
  events: (params?: EventLogQueryParams) =>
    [...LOGS_ROOT, 'events', params] as const,
  stats: {
    all: LOGS_STATS_ROOT,
    overview: (params?: DateRangeParams) =>
      [...LOGS_STATS_ROOT, 'overview', params] as const,
    errorsByDay: (params?: DateRangeParams) =>
      [...LOGS_STATS_ROOT, 'errors-by-day', params] as const,
    requestsByHour: (params?: DateRangeParams) =>
      [...LOGS_STATS_ROOT, 'requests-by-hour', params] as const,
    topErrors: (params?: DateRangeParams) =>
      [...LOGS_STATS_ROOT, 'top-errors', params] as const,
    slowRequests: (params?: DateRangeParams) =>
      [...LOGS_STATS_ROOT, 'slow-requests', params] as const,
  },
};

// ── Query options ───────────────────────────────────────────────────────────

export function requestLogsOptions(params?: RequestLogQueryParams) {
  return queryOptions({
    queryKey: logsKeys.requests(params),
    queryFn: () => fetchRequestLogs(params),
  });
}

export function errorLogsOptions(params?: ErrorLogQueryParams) {
  return queryOptions({
    queryKey: logsKeys.errors(params),
    queryFn: () => fetchErrorLogs(params),
  });
}

export function auditLogsOptions(params?: AuditLogQueryParams) {
  return queryOptions({
    queryKey: logsKeys.audits(params),
    queryFn: () => fetchAuditLogs(params),
  });
}

export function eventLogsOptions(params?: EventLogQueryParams) {
  return queryOptions({
    queryKey: logsKeys.events(params),
    queryFn: () => fetchEventLogs(params),
  });
}

export function statsOverviewOptions(params?: DateRangeParams) {
  return queryOptions({
    queryKey: logsKeys.stats.overview(params),
    queryFn: () => fetchStatsOverview(params),
  });
}

export function errorsByDayOptions(params?: DateRangeParams) {
  return queryOptions({
    queryKey: logsKeys.stats.errorsByDay(params),
    queryFn: () => fetchErrorsByDay(params),
  });
}

export function requestsByHourOptions(params?: DateRangeParams) {
  return queryOptions({
    queryKey: logsKeys.stats.requestsByHour(params),
    queryFn: () => fetchRequestsByHour(params),
  });
}

export function topErrorsOptions(params?: DateRangeParams) {
  return queryOptions({
    queryKey: logsKeys.stats.topErrors(params),
    queryFn: () => fetchTopErrors(params),
  });
}

export function slowRequestsOptions(params?: DateRangeParams) {
  return queryOptions({
    queryKey: logsKeys.stats.slowRequests(params),
    queryFn: () => fetchSlowRequests(params),
  });
}
