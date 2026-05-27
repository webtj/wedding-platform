'use client';
import { useQuery } from '@tanstack/react-query';
export default function StudioOverview() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>婚策工作台</h1>
        <p className='text-muted-foreground mt-1'>欢迎回来，开始你的一天</p>
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard label='意向单' value='--' href='/studio/leads' />
        <StatCard label='进行中项目' value='--' href='/studio/projects' />
        <StatCard label='本月合同' value='--' href='/studio/contracts' />
        <StatCard label='待收款' value='--' href='/studio/finance' />
      </div>
    </div>
  );
}
function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} className='rounded-xl border bg-card p-4 hover:border-primary transition-colors'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='text-2xl font-bold mt-1'>{value}</p>
    </a>
  );
}
