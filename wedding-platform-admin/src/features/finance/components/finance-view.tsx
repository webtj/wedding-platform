'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { financeSummaryOptions } from '../api/queries';

const fmt = (c: number) => `¥${(c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

export function FinanceView() {
  const { data, isLoading } = useQuery(financeSummaryOptions());

  if (isLoading || !data)
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;

  const cards = [
    { label: '合同总额', value: fmt(data.totalContractAmount), color: 'border-primary' },
    { label: '已收款', value: fmt(data.totalPaid), color: 'border-emerald-500' },
    { label: '应收款', value: fmt(data.totalReceivable), color: 'border-amber-500' },
    { label: '总支出', value: fmt(data.totalExpenses), color: 'border-red-400' },
    { label: '利润', value: fmt(data.profit), color: 'border-green-500' },
    { label: '项目数', value: String(data.projectCount), color: 'border-blue-400' }
  ];

  return (
    <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
      {cards.map((c) => (
        <Card key={c.label} className={`border-t-[3px] ${c.color} rounded-t-xl bg-card`}>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground mb-1'>{c.label}</p>
            <p className='text-lg font-bold font-mono'>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
