import { LeadTrendChartSkeleton } from '@/features/dashboard/components/lead-trend-chart-skeleton'
import { FunnelChartSkeleton } from '@/features/dashboard/components/funnel-chart-skeleton'

export default function Loading() {
  return (
    <>
      <LeadTrendChartSkeleton />
      <FunnelChartSkeleton />
    </>
  )
}
