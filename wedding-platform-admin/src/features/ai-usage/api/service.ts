import { apiClient } from '@/lib/api-client';
import type { AiUsageMetrics } from './types';

export async function fetchAiUsageMetrics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AiUsageMetrics> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const qs = searchParams.toString();
  return apiClient<AiUsageMetrics>(`/ai-usage/metrics${qs ? `?${qs}` : ''}`);
}
