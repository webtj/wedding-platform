import { LeadTrendChart } from '@/features/dashboard/components/lead-trend-chart'
import { FunnelChart } from '@/features/dashboard/components/funnel-chart'

export default function ChartsTopSlot() {
  return (
    <>
      <LeadTrendChart />
      <FunnelChart />
    </>
  )
}
