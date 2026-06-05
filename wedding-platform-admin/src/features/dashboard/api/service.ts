import { apiClient } from '@/lib/api-client'
import type { OverviewTrends, RecentContract } from './types'

export function getOverviewTrends(): Promise<OverviewTrends> {
  return apiClient<OverviewTrends>('/overview/trends')
}

export function getRecentContracts(): Promise<RecentContract[]> {
  return apiClient<RecentContract[]>('/contracts/recent')
}
