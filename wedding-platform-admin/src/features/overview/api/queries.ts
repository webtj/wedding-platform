import { queryOptions } from '@tanstack/react-query';
import { getOverviewStats } from './service';

export const overviewKeys = {
  all: ['overview'] as const,
  stats: () => [...overviewKeys.all, 'stats'] as const
};

export const overviewStatsOptions = () =>
  queryOptions({
    queryKey: overviewKeys.stats(),
    queryFn: () => getOverviewStats()
  });
