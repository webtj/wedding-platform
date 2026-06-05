'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { statsOverviewOptions, statsTimelineOptions, statsBySourceOptions } from '../api/stats-queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  new: '新线索',
  contacted: '已联系',
  quoted: '已报价',
  negotiating: '谈判中',
  won: '已成交',
  lost: '已流失'
};

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  contacted: '#8b5cf6',
  quoted: '#a78bfa',
  negotiating: '#c4b5fd',
  won: '#22c55e',
  lost: '#ef4444'
};

const SOURCE_LABELS: Record<string, string> = {
  wechat: '微信',
  xiaohongshu: '小红书',
  douyin: '抖音',
  referral: '转介绍',
  other: '其他'
};

function SummaryCard({
  title,
  value,
  subtitle,
  trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex items-baseline gap-2'>
          <span className='text-3xl font-bold'>{value}</span>
          {trend && (
            <Badge
              variant='outline'
              className={
                trend === 'up'
                  ? 'text-green-600 border-green-200 bg-green-50'
                  : trend === 'down'
                    ? 'text-red-600 border-red-200 bg-red-50'
                    : ''
              }
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
            </Badge>
          )}
        </div>
        {subtitle && <p className='mt-1 text-xs text-muted-foreground'>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelChart({ data }: { data: { status: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>销售漏斗</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {data.map((item) => (
            <div key={item.status} className='flex items-center gap-3'>
              <span className='w-16 text-sm text-muted-foreground shrink-0'>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              <div className='flex-1 h-8 rounded-md overflow-hidden bg-muted/30'>
                <div
                  className='h-full rounded-md transition-all duration-500 flex items-center px-2'
                  style={{
                    width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)}%`,
                    backgroundColor: STATUS_COLORS[item.status] ?? '#94a3b8'
                  }}
                >
                  {item.count > 0 && (
                    <span className='text-xs font-medium text-white'>{item.count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceBarChart({ data }: { data: { source: string; count: number }[] }) {
  const chartData = data.map((d) => ({
    name: SOURCE_LABELS[d.source] ?? d.source,
    count: d.count
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>线索来源分布</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className='text-sm text-muted-foreground py-8 text-center'>暂无数据</p>
        ) : (
          <ResponsiveContainer width='100%' height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis dataKey='name' tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => [`${value} 条`, '线索数']}
              />
              <Bar dataKey='count' fill='#6366f1' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineChart({ data }: { data: { date: string; total: number; won: number }[] }) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    total: d.total,
    won: d.won
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>线索趋势</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className='text-sm text-muted-foreground py-8 text-center'>暂无数据</p>
        ) : (
          <ResponsiveContainer width='100%' height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis dataKey='date' tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                formatter={(value: number, name: string) => [
                  `${value} 条`,
                  name === 'total' ? '新增线索' : '成交线索'
                ]}
              />
              <Legend
                formatter={(value: string) => (value === 'total' ? '新增线索' : '成交线索')}
              />
              <Line
                type='monotone'
                dataKey='total'
                stroke='#6366f1'
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type='monotone'
                dataKey='won'
                stroke='#22c55e'
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadsStatsDashboard() {
  const { data: overview } = useSuspenseQuery(statsOverviewOptions());
  const { data: timeline } = useSuspenseQuery(statsTimelineOptions());
  const { data: bySource } = useSuspenseQuery(statsBySourceOptions());

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <SummaryCard
          title='线索总数'
          value={overview.conversionRate.total}
          subtitle='所有状态的线索'
        />
        <SummaryCard
          title='转化率'
          value={`${overview.conversionRate.rate}%`}
          subtitle={`${overview.conversionRate.won} / ${overview.conversionRate.total} 已成交`}
          trend={overview.conversionRate.rate > 20 ? 'up' : overview.conversionRate.rate > 0 ? 'neutral' : undefined}
        />
        <SummaryCard
          title='平均转化周期'
          value={
            overview.avgConversionTime.sampleSize > 0
              ? `${overview.avgConversionTime.avgDays} 天`
              : '-'
          }
          subtitle={
            overview.avgConversionTime.sampleSize > 0
              ? `基于 ${overview.avgConversionTime.sampleSize} 条成交数据`
              : '暂无成交数据'
          }
        />
      </div>

      {/* Funnel */}
      <FunnelChart data={overview.funnel} />

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <SourceBarChart data={bySource} />
        <TimelineChart data={timeline} />
      </div>
    </div>
  );
}
