import { SourcePieChart } from '@/features/dashboard/components/source-pie-chart'
import { RecentContracts } from '@/features/dashboard/components/recent-contracts'

export default function ChartsBottomSlot() {
  return (
    <>
      <SourcePieChart />
      <RecentContracts />
    </>
  )
}
