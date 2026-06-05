import { apiClient } from '@/lib/api-client';
import type { StatsOverview, FunnelItem, SourceItem, TimelineItem, StatsDateRange } from './stats-types';

function buildDateParams(range?: StatsDateRange): string {
  if (!range) return '';
  const params = new URLSearchParams();
  if (range.startDate) params.set('startDate', range.startDate);
  if (range.endDate) params.set('endDate', range.endDate);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getStatsOverview(range?: StatsDateRange): Promise<StatsOverview> {
  return apiClient<StatsOverview>(`/crm/stats/overview${buildDateParams(range)}`);
}

export function getStatsFunnel(range?: StatsDateRange): Promise<FunnelItem[]> {
  return apiClient<FunnelItem[]>(`/crm/stats/funnel${buildDateParams(range)}`);
}

export function getStatsBySource(range?: StatsDateRange): Promise<SourceItem[]> {
  return apiClient<SourceItem[]>(`/crm/stats/by-source${buildDateParams(range)}`);
}

export function getStatsTimeline(range?: StatsDateRange & { granularity?: 'day' | 'week' }): Promise<TimelineItem[]> {
  const params = new URLSearchParams();
  if (range?.startDate) params.set('startDate', range.startDate);
  if (range?.endDate) params.set('endDate', range.endDate);
  if (range?.granularity) params.set('granularity', range.granularity);
  const qs = params.toString();
  return apiClient<TimelineItem[]>(`/crm/stats/timeline${qs ? `?${qs}` : ''}`);
}
