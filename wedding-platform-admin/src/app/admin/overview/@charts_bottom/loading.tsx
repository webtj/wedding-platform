import { SourcePieChartSkeleton } from '@/features/dashboard/components/source-pie-chart-skeleton'
import { RecentContractsSkeleton } from '@/features/dashboard/components/recent-contracts-skeleton'

export default function Loading() {
  return (
    <>
      <SourcePieChartSkeleton />
      <RecentContractsSkeleton />
    </>
  )
}
