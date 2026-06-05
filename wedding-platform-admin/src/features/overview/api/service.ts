import { apiClient } from '@/lib/api-client';
import type { OverviewStats } from './types';

export async function getOverviewStats(): Promise<OverviewStats> {
  return apiClient<OverviewStats>('/overview/stats');
}
