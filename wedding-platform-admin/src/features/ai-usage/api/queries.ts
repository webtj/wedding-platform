import { queryOptions } from '@tanstack/react-query';
import { fetchAiUsageMetrics } from './service';

export const aiUsageMetricsOptions = (params?: {
  startDate?: string;
  endDate?: string;
}) =>
  queryOptions({
    queryKey: ['ai-usage', 'metrics', params],
    queryFn: () => fetchAiUsageMetrics(params)
  });
