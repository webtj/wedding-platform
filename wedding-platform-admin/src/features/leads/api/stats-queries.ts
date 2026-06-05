import { queryOptions } from '@tanstack/react-query';
import { getStatsOverview, getStatsFunnel, getStatsBySource, getStatsTimeline } from './stats-service';
import type { StatsDateRange } from './stats-types';

export const leadsStatsKeys = {
  all: ['leads-stats'] as const,
  overview: (range?: StatsDateRange) => [...leadsStatsKeys.all, 'overview', range] as const,
  funnel: (range?: StatsDateRange) => [...leadsStatsKeys.all, 'funnel', range] as const,
  bySource: (range?: StatsDateRange) => [...leadsStatsKeys.all, 'bySource', range] as const,
  timeline: (range?: StatsDateRange & { granularity?: 'day' | 'week' }) =>
    [...leadsStatsKeys.all, 'timeline', range] as const
};

export const statsOverviewOptions = (range?: StatsDateRange) =>
  queryOptions({
    queryKey: leadsStatsKeys.overview(range),
    queryFn: () => getStatsOverview(range)
  });

export const statsFunnelOptions = (range?: StatsDateRange) =>
  queryOptions({
    queryKey: leadsStatsKeys.funnel(range),
    queryFn: () => getStatsFunnel(range)
  });

export const statsBySourceOptions = (range?: StatsDateRange) =>
  queryOptions({
    queryKey: leadsStatsKeys.bySource(range),
    queryFn: () => getStatsBySource(range)
  });

export const statsTimelineOptions = (range?: StatsDateRange & { granularity?: 'day' | 'week' }) =>
  queryOptions({
    queryKey: leadsStatsKeys.timeline(range),
    queryFn: () => getStatsTimeline(range)
  });
