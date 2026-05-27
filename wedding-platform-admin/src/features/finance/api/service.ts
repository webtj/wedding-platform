import { apiClient } from '@/lib/api-client';
import type { FinanceResponse } from './types';

export async function getFinanceSummary(): Promise<FinanceResponse> {
  return apiClient<FinanceResponse>('/finance/tenant-summary');
}
