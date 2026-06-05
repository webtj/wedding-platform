import { queryOptions } from '@tanstack/react-query'
import { getOverviewTrends, getRecentContracts } from './service'
import { overviewStatsOptions } from '@/features/overview/api/queries'
import {
  statsOverviewOptions,
  statsTimelineOptions,
  statsFunnelOptions,
  statsBySourceOptions
} from '@/features/leads/api/stats-queries'
import { aiUsageMetricsOptions } from '@/features/ai-usage/api/queries'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  trends: () => [...dashboardKeys.all, 'trends'] as const,
  recentContracts: () => [...dashboardKeys.all, 'recent-contracts'] as const
}

export const dashboardTrendsOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.trends(),
    queryFn: () => getOverviewTrends()
  })

export const dashboardRecentContractsOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.recentContracts(),
    queryFn: () => getRecentContracts()
  })

export {
  overviewStatsOptions,
  statsOverviewOptions,
  statsTimelineOptions,
  statsFunnelOptions,
  statsBySourceOptions,
  aiUsageMetricsOptions
}
