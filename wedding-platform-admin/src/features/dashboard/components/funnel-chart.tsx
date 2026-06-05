'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { statsFunnelOptions } from '../api/queries'

const STATUS_LABELS: Record<string, string> = {
  new: '新线索',
  contacted: '已联系',
  quoted: '已报价',
  negotiating: '谈判中',
  won: '已成交',
  lost: '已流失'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-indigo-500',
  contacted: 'bg-violet-500',
  quoted: 'bg-purple-400',
  negotiating: 'bg-violet-300',
  won: 'bg-emerald-500',
  lost: 'bg-rose-400'
}

const STATUS_DOT_COLORS: Record<string, string> = {
  new: 'bg-indigo-500',
  contacted: 'bg-violet-500',
  quoted: 'bg-purple-400',
  negotiating: 'bg-violet-300',
  won: 'bg-emerald-500',
  lost: 'bg-rose-400'
}

export function FunnelChart() {
  const { data } = useSuspenseQuery(statsFunnelOptions())

  if (!data || data.length === 0) {
    return (
      <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
        <CardHeader>
          <CardTitle className='font-serif text-lg'>线索漏斗</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex h-[280px] items-center justify-center'>
            <p className='text-sm text-muted-foreground/50'>暂无数据</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <CardTitle className='font-serif text-lg'>线索漏斗</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {data.map((item, i) => {
            const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
            return (
              <div key={item.status} className='group'>
                <div className='mb-1 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[item.status] ?? 'bg-gray-400'}`}
                    />
                    <span className='text-xs font-medium text-muted-foreground/80'>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                  <span className='text-xs font-semibold tabular-nums text-foreground/70'>
                    {item.count}
                  </span>
                </div>
                <div className='h-6 overflow-hidden rounded-md bg-muted/30'>
                  <div
                    className={`h-full rounded-md ${STATUS_COLORS[item.status] ?? 'bg-gray-400'} transition-all duration-700 ease-out`}
                    style={{
                      width: `${Math.max(pct, item.count > 0 ? 6 : 0)}%`,
                      transitionDelay: `${i * 60}ms`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
