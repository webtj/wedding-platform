'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { aiUsageMetricsOptions } from '../api/queries'

interface MetricSummary {
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  successRate: number
  avgLatencyMs: number
  totalCost: number
}

export function AiUsageSummary() {
  const { data } = useSuspenseQuery(aiUsageMetricsOptions())
  const metrics = data as unknown as MetricSummary

  if (!metrics || metrics.totalGenerations === 0) {
    return (
      <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 font-serif text-lg'>
            <Icons.sparkles className='h-4 w-4 text-primary/60' />
            AI 使用概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-[120px] items-center justify-center'>
            <p className='text-sm text-muted-foreground/50'>暂无 AI 使用记录</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const items = [
    {
      label: '生成总数',
      value: metrics.totalGenerations.toLocaleString(),
      icon: Icons.sparkles
    },
    {
      label: '成功率',
      value: `${metrics.successRate.toFixed(1)}%`,
      icon: Icons.circleCheck
    },
    {
      label: '平均延迟',
      value: `${Math.round(metrics.avgLatencyMs)}ms`,
      icon: Icons.clock
    },
    ...(metrics.totalCost > 0
      ? [
          {
            label: '总花费',
            value: `$${metrics.totalCost.toFixed(2)}`,
            icon: Icons.trendingUp
          }
        ]
      : [])
  ]

  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 font-serif text-lg'>
          <Icons.sparkles className='h-4 w-4 text-primary/60' />
          AI 使用概览
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className='space-y-1.5'>
                <div className='flex items-center gap-1.5'>
                  <Icon className='h-3 w-3 text-muted-foreground/40' />
                  <span className='text-xs text-muted-foreground/60'>{item.label}</span>
                </div>
                <p className='font-serif text-2xl font-semibold tracking-tight tabular-nums'>
                  {item.value}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
