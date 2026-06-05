'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import {
  overviewStatsOptions,
  dashboardTrendsOptions,
  statsOverviewOptions
} from '../api/queries'

function fmtCents(cents: number) {
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function TrendBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <Badge
      variant='outline'
      className={
        up
          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
          : 'border-rose-200 bg-rose-50/60 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
      }
    >
      {up ? <Icons.trendingUp className='h-3 w-3' /> : <Icons.trendingDown className='h-3 w-3' />}
      <span className='ml-0.5 tabular-nums'>
        {up ? '+' : ''}
        {pct}%
      </span>
    </Badge>
  )
}

export function StatCards() {
  const { data: stats } = useSuspenseQuery(overviewStatsOptions())
  const { data: trends } = useSuspenseQuery(dashboardTrendsOptions())
  const { data: crmOverview } = useSuspenseQuery(statsOverviewOptions())

  const cards = [
    {
      label: '本月线索',
      icon: Icons.forms,
      value: stats.leadCount,
      trend: trends.leadsChangePct,
      subtitle: `上月 ${trends.prevMonthLeads} 条`
    },
    {
      label: '活跃项目',
      icon: Icons.kanban,
      value: stats.activeProjectCount,
      trend: undefined,
      subtitle: '进行中的婚礼项目'
    },
    {
      label: '本月合同',
      icon: Icons.post,
      value: stats.monthContractCount,
      trend: trends.contractsChangePct,
      subtitle: `应收 ${fmtCents(stats.receivableCents)}`
    },
    {
      label: '线索转化率',
      icon: Icons.trendingUp,
      value: `${crmOverview.conversionRate.rate}%`,
      trend: undefined,
      subtitle: `${crmOverview.conversionRate.won} / ${crmOverview.conversionRate.total} 已成交`
    }
  ]

  return (
    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className='group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 hover:shadow-md hover:ring-black/[0.08] dark:ring-white/[0.06] dark:hover:ring-white/[0.1]'
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Decorative corner accent */}
            <div className='absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/[0.03] transition-transform duration-500 group-hover:scale-150' />

            <CardHeader className='relative pb-1'>
              <div className='flex items-center gap-2'>
                <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/[0.06]'>
                  <Icon className='h-3.5 w-3.5 text-primary/70' />
                </div>
                <span className='text-xs font-medium tracking-wide text-muted-foreground/80 uppercase'>
                  {card.label}
                </span>
              </div>
              <CardTitle className='mt-3 font-serif text-3xl font-semibold tracking-tight tabular-nums'>
                {card.value}
              </CardTitle>
              {card.trend !== undefined && (
                <CardAction className='mt-1'>
                  <TrendBadge pct={card.trend} />
                </CardAction>
              )}
            </CardHeader>
            <CardFooter className='relative pt-0 pb-4'>
              <p className='text-xs text-muted-foreground/60'>{card.subtitle}</p>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
