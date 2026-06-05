import PageContainer from '@/components/layout/page-container'

export default function OverViewLayout({
  stats,
  charts_top,
  charts_bottom,
  ai_usage
}: {
  stats: React.ReactNode
  charts_top: React.ReactNode
  charts_bottom: React.ReactNode
  ai_usage: React.ReactNode
}) {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6'>
        {/* Header */}
        <div>
          <h2 className='font-serif text-2xl font-semibold tracking-tight'>仪表盘</h2>
          <p className='mt-1 text-sm text-muted-foreground/60'>业务数据概览</p>
        </div>

        {/* Row 1: Stat Cards */}
        {stats}

        {/* Row 2: Charts Top (Lead Trend + Funnel) */}
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>{charts_top}</div>

        {/* Row 3: Charts Bottom (Source Pie + Recent Contracts) */}
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>{charts_bottom}</div>

        {/* Row 4: AI Usage */}
        {ai_usage}
      </div>
    </PageContainer>
  )
}
