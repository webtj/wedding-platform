'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { dashboardRecentContractsOptions } from '../api/queries'

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待签',
  signed: '已签',
  voided: '已撤销'
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800',
  signed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800',
  voided: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-800'
}

function fmtCents(cents: number) {
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function getInitials(name: string) {
  const parts = name.split(/[\s&]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function RecentContracts() {
  const { data } = useSuspenseQuery(dashboardRecentContractsOptions())

  if (!data || data.length === 0) {
    return (
      <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
        <CardHeader>
          <CardTitle className='font-serif text-lg'>最近合同</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center gap-3 py-12'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted/50'>
              <Icons.post className='h-5 w-5 text-muted-foreground/40' />
            </div>
            <p className='text-sm text-muted-foreground/50'>暂无合同</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <div className='flex items-baseline justify-between'>
          <CardTitle className='font-serif text-lg'>最近合同</CardTitle>
          <span className='text-xs text-muted-foreground/50'>{data.length} 份</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className='divide-y divide-border/50'>
          {data.map((c) => {
            const name =
              c.brideName && c.groomName
                ? `${c.brideName} & ${c.groomName}`
                : c.project?.brideName && c.project?.groomName
                  ? `${c.project.brideName} & ${c.project.groomName}`
                  : c.title

            return (
              <div
                key={c.id}
                className='group flex items-center gap-3.5 py-3 transition-colors first:pt-0 last:pb-0'
              >
                {/* Avatar */}
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-semibold text-primary/70 ring-1 ring-primary/10'>
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <p className='truncate text-sm font-medium'>{name}</p>
                  <p className='text-[11px] text-muted-foreground/50 font-mono'>{c.contractNo}</p>
                </div>

                {/* Amount + Status */}
                <div className='shrink-0 text-right'>
                  <p className='text-sm font-semibold tabular-nums'>{fmtCents(c.amountCents)}</p>
                  <div className='mt-0.5 flex items-center justify-end gap-1.5'>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    <span className='text-[10px] text-muted-foreground/40'>
                      {fmtDate(c.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
