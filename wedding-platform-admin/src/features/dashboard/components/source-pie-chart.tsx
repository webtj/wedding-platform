'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { statsBySourceOptions } from '../api/queries'

const SOURCE_LABELS: Record<string, string> = {
  wechat: '微信',
  xiaohongshu: '小红书',
  douyin: '抖音',
  referral: '转介绍',
  other: '其他'
}

const SOURCE_COLORS = [
  'oklch(0.55 0.15 270)',   // indigo
  'oklch(0.60 0.16 290)',   // violet
  'oklch(0.65 0.14 310)',   // purple
  'oklch(0.62 0.17 155)',   // emerald
  'oklch(0.55 0.02 260)'    // muted
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className='rounded-lg border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm'>
      <div className='flex items-center gap-2'>
        <span className='text-xs font-medium'>{payload[0].name}</span>
        <span className='text-xs font-semibold tabular-nums'>{payload[0].value}</span>
      </div>
    </div>
  )
}

export function SourcePieChart() {
  const { data } = useSuspenseQuery(statsBySourceOptions())

  if (!data || data.length === 0) {
    return (
      <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
        <CardHeader>
          <CardTitle className='font-serif text-lg'>线索来源</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-[280px] items-center justify-center'>
            <p className='text-sm text-muted-foreground/50'>暂无数据</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)
  const chartData = data.map((d, i) => ({
    name: SOURCE_LABELS[d.source] ?? d.source,
    count: d.count,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0
  }))

  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-2'>
        <CardTitle className='font-serif text-lg'>线索来源</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-6'>
          {/* Pie */}
          <div className='shrink-0'>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey='count'
                  nameKey='name'
                  cx='50%'
                  cy='50%'
                  innerRadius={42}
                  outerRadius={72}
                  cornerRadius={6}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className='flex-1 space-y-2.5'>
            {chartData.map((item) => (
              <div key={item.name} className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div
                    className='h-2.5 w-2.5 rounded-full'
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className='text-xs text-muted-foreground/80'>{item.name}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-semibold tabular-nums'>{item.count}</span>
                  <span className='text-[10px] text-muted-foreground/50 tabular-nums'>
                    {item.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
