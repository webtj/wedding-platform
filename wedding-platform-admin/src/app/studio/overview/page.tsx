'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { overviewStatsOptions } from '@/features/overview/api/queries';
import { Icons } from '@/components/icons';

export default function StudioOverview() {
  const { data } = useSuspenseQuery(overviewStatsOptions());

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>婚策工作台</h1>
        <p className='text-muted-foreground mt-1'>欢迎回来，开始你的一天</p>
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
        <StatCard
          label='意向单'
          value={data.leadCount}
          href='/studio/leads'
          icon={<Icons.forms className='size-5' />}
          trend='new'
        />
        <StatCard
          label='进行中项目'
          value={data.activeProjectCount}
          href='/studio/projects'
          icon={<Icons.kanban className='size-5' />}
        />
        <StatCard
          label='本月合同'
          value={data.monthContractCount}
          href='/studio/contracts'
          icon={<Icons.post className='size-5' />}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  trend,
  highlight
}: {
  label: string;
  value: string | number;
  href: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'new';
  highlight?: boolean;
}) {
  return (
    <a
      href={href}
      className='rounded-xl border bg-card p-4 hover:border-primary transition-colors flex flex-col gap-2'
    >
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>{label}</p>
        {icon && <span className='text-muted-foreground'>{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-orange-500' : ''}`}>{value}</p>
      {trend === 'new' && typeof value === 'number' && value > 0 && (
        <Badge variant='outline' className='w-fit'>
          <Icons.trendingUp className='size-3 mr-1' />有新增
        </Badge>
      )}
    </a>
  );
}
