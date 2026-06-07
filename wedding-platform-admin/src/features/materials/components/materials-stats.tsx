'use client';

import { useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { materialsByCategoryOptions } from '../api/queries';
import type { Material, MaterialCategory } from '../api/types';

export function MaterialsStats({ categories }: { categories: MaterialCategory[] }) {
  const results = useQueries({
    queries: categories.map((c) => materialsByCategoryOptions(c.id)),
    combine: (results) => {
      const all: Material[] = results.flatMap((r) => r.data?.items ?? []);
      return all;
    }
  });

  const all = results;
  const total = all.length;
  const available = all.filter((m) => m.status === 'available').length;
  const missing = total - available;
  const outOfStock = all.filter((m) => m.quantity === 0).length;
  const coverage = total > 0 ? Math.round((available / total) * 100) : 0;
  const isLoading = !all;

  if (total === 0) return null;

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
      <StatCard
        icon={Icons.product}
        label='总物料'
        value={total}
        sub={isLoading ? '加载中...' : `${categories.length} 个分类`}
        tone='default'
      />
      <StatCard
        icon={Icons.circleCheck}
        label='已有'
        value={available}
        sub={`覆盖率 ${coverage}%`}
        tone='positive'
      />
      <StatCard
        icon={Icons.circleX}
        label='缺失'
        value={missing}
        sub={missing > 0 ? '需采购' : '已齐全'}
        tone={missing > 0 ? 'warning' : 'muted'}
      />
      <StatCard
        icon={Icons.alertCircle}
        label='库存为 0'
        value={outOfStock}
        sub={outOfStock > 0 ? '需补货' : '全部充足'}
        tone={outOfStock > 0 ? 'destructive' : 'muted'}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone
}: {
  icon: typeof Icons.product;
  label: string;
  value: number;
  sub: string;
  tone: 'default' | 'positive' | 'warning' | 'destructive' | 'muted';
}) {
  const toneClass = {
    default: 'text-foreground',
    positive: 'text-emerald-600',
    warning: 'text-amber-600',
    destructive: 'text-red-600',
    muted: 'text-muted-foreground'
  }[tone];

  return (
    <Card>
      <CardContent className='pt-4 pb-4'>
        <div className='flex items-center gap-2 mb-1'>
          <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
          <span className='text-xs text-muted-foreground'>{label}</span>
        </div>
        <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
        <div className='text-xs text-muted-foreground mt-0.5'>{sub}</div>
      </CardContent>
    </Card>
  );
}
