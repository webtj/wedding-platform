'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { statsTimelineOptions } from '../api/queries'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className='rounded-lg border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm'>
      <p className='mb-1 text-xs font-medium text-muted-foreground'>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className='flex items-center gap-2'>
          <div
            className='h-2 w-2 rounded-full'
            style={{
              backgroundColor: p.dataKey === 'total' ? 'var(--chart-1)' : 'var(--chart-2)'
            }}
          />
          <span className='text-xs text-muted-foreground'>
            {p.dataKey === 'total' ? '新增' : '成交'}
          </span>
          <span className='text-xs font-semibold tabular-nums'>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function LeadTrendChart() {
  const { data } = useSuspenseQuery(statsTimelineOptions())

  if (!data || data.length === 0) {
    return (
      <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
        <CardHeader>
          <CardTitle className='font-serif text-lg'>线索趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-[280px] items-center justify-center'>
            <p className='text-sm text-muted-foreground/50'>暂无数据</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({ ...d, date: d.date.slice(5) }))

  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-2'>
        <div className='flex items-baseline justify-between'>
          <CardTitle className='font-serif text-lg'>线索趋势</CardTitle>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1.5'>
              <div className='h-2 w-5 rounded-full bg-[var(--chart-1)]' />
              <span className='text-xs text-muted-foreground'>新增</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='h-2 w-5 rounded-full bg-[var(--chart-2)]' />
              <span className='text-xs text-muted-foreground'>成交</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-2'>
        <ResponsiveContainer width='100%' height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id='gradientTotal' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='var(--chart-1)' stopOpacity={0.15} />
                <stop offset='100%' stopColor='var(--chart-1)' stopOpacity={0} />
              </linearGradient>
              <linearGradient id='gradientWon' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='var(--chart-2)' stopOpacity={0.15} />
                <stop offset='100%' stopColor='var(--chart-2)' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' strokeOpacity={0.4} />
            <XAxis
              dataKey='date'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              dy={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type='natural'
              dataKey='total'
              stroke='var(--chart-1)'
              strokeWidth={2}
              fill='url(#gradientTotal)'
            />
            <Area
              type='natural'
              dataKey='won'
              stroke='var(--chart-2)'
              strokeWidth={2}
              fill='url(#gradientWon)'
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
