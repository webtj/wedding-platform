'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { PlatformOverviewSummary } from '../_lib/service-shared';

type Props = {
  summary: PlatformOverviewSummary | null;
  error: string | null;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TOTAL_CARDS: Array<{
  key: keyof PlatformOverviewSummary['totals'];
  label: string;
  icon: keyof typeof Icons;
}> = [
  { key: 'tenants', label: '租户总数', icon: 'workspace' },
  { key: 'activeTenants', label: '活跃租户', icon: 'sparkles' },
  { key: 'users', label: '账号总数', icon: 'user' },
  { key: 'leads', label: '线索总数', icon: 'forms' },
  { key: 'projects', label: '项目总数', icon: 'kanban' },
  { key: 'contracts', label: '合同总数', icon: 'post' },
  { key: 'aiGenerations', label: '近 7 天 AI 生成', icon: 'sparkles' }
];

const MAX_DAILY_AI = (days: PlatformOverviewSummary['aiUsageLast7Days']) =>
  Math.max(1, ...days.map((d) => d.count));

export function PlatformOverview({ summary, error }: Props) {
  if (error || !summary) {
    return (
      <Card className='border-border/60'>
        <CardContent className='flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground'>
          <Icons.alertCircle className='size-6 text-destructive' />
          <p>加载平台总览失败：{error ?? '未知错误'}</p>
        </CardContent>
      </Card>
    );
  }

  const { totals, recentTenants, recentUsers, aiUsageLast7Days } = summary;
  const peak = MAX_DAILY_AI(aiUsageLast7Days);

  return (
    <div className='flex flex-1 flex-col gap-6'>
      {/* Stat cards */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7'>
        {TOTAL_CARDS.map(({ key, label, icon }) => {
          const Icon = Icons[icon];
          return (
            <Card key={key} className='border-border/60'>
              <CardContent className='flex flex-col gap-3 p-4'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='text-xs font-medium'>{label}</span>
                  <Icon className='size-4' />
                </div>
                <div className='font-mono text-2xl font-semibold tabular-nums'>
                  {totals[key].toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI usage sparkline */}
      <Card className='border-border/60'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-base font-medium'>近 7 天 AI 用量</CardTitle>
          <span className='text-xs text-muted-foreground'>
            峰值 {peak} / 日
          </span>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-end gap-2'>
            {aiUsageLast7Days.map(({ date, count }) => {
              const heightPct = Math.round((count / peak) * 100);
              const dayLabel = date.slice(5); // MM-DD
              return (
                <div
                  key={date}
                  className='flex flex-1 flex-col items-center gap-2'
                >
                  <div className='flex w-full flex-1 items-end'>
                    <div
                      className='w-full rounded-t-md bg-primary/70 transition-all'
                      style={{ height: `${heightPct}%` }}
                      title={`${date}: ${count} 次`}
                    />
                  </div>
                  <div className='flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground'>
                    <span className='font-mono tabular-nums'>{count}</span>
                    <span>{dayLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {/* Recent tenants */}
        <Card className='border-border/60'>
          <CardHeader>
            <CardTitle className='text-base font-medium'>最新租户</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTenants.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>
                暂无租户
              </p>
            ) : (
              <ul className='divide-y divide-border/60'>
                {recentTenants.map((t) => (
                  <li
                    key={t.id}
                    className='flex items-center justify-between py-3 text-sm'
                  >
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>{t.name}</div>
                      <div className='mt-0.5 text-xs text-muted-foreground'>
                        {t.memberCount} 成员 · {t.projectCount} 项目 ·{' '}
                        {formatDate(t.createdAt)}
                      </div>
                    </div>
                    <span
                      className={
                        t.status === 'active'
                          ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                      }
                    >
                      {t.status === 'active' ? '活跃' : '已停用'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card className='border-border/60'>
          <CardHeader>
            <CardTitle className='text-base font-medium'>最新账号</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>
                暂无账号
              </p>
            ) : (
              <ul className='divide-y divide-border/60'>
                {recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className='flex items-center justify-between py-3 text-sm'
                  >
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>{u.displayName}</div>
                      <div className='mt-0.5 text-xs text-muted-foreground'>
                        {u.tenantName ?? '无关联租户'} ·{' '}
                        {formatDate(u.createdAt)}
                      </div>
                    </div>
                    {u.isPlatformAdmin && (
                      <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                        平台管理员
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
