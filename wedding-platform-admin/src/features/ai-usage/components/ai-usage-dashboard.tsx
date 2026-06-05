'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { aiUsageMetricsOptions } from '../api/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Pie, PieChart, LabelList } from 'recharts';
import { Area, AreaChart } from 'recharts';

const providerChartConfig = {
  count: { label: 'Generations' },
  openai: { label: 'OpenAI', color: 'var(--chart-1)' },
  anthropic: { label: 'Anthropic', color: 'var(--chart-2)' },
  stability: { label: 'Stability AI', color: 'var(--chart-3)' },
  midjourney: { label: 'Midjourney', color: 'var(--chart-4)' },
  other: { label: 'Other', color: 'var(--chart-5)' }
} satisfies ChartConfig;

const materialTypeChartConfig = {
  count: { label: 'Generations' },
  invitation: { label: 'Invitation', color: 'var(--chart-1)' },
  backdrop: { label: 'Backdrop', color: 'var(--chart-2)' },
  floral: { label: 'Floral', color: 'var(--chart-3)' },
  decoration: { label: 'Decoration', color: 'var(--chart-4)' },
  other: { label: 'Other', color: 'var(--chart-5)' }
} satisfies ChartConfig;

const trendChartConfig = {
  generations: { label: 'Total', color: 'var(--chart-1)' },
  successes: { label: 'Success', color: 'var(--chart-2)' },
  failures: { label: 'Failed', color: 'var(--chart-3)' }
} satisfies ChartConfig;

const PROVIDER_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const MATERIAL_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function AiUsageDashboard() {
  const { data } = useSuspenseQuery(aiUsageMetricsOptions());

  const { summary, byProvider, byMaterialType, dailyTrend, feedback } = data;

  const providerData = byProvider.map((p, i) => ({
    ...p,
    fill: PROVIDER_COLORS[i % PROVIDER_COLORS.length]
  }));

  const materialData = byMaterialType.map((m, i) => ({
    ...m,
    fill: MATERIAL_COLORS[i % MATERIAL_COLORS.length]
  }));

  return (
    <div className='space-y-6'>
      {/* Summary Stats */}
      <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Total Generations</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {summary.totalGenerations.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant='outline'>
                <Icons.sparkles />
                All time
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              AI image generations
            </div>
            <div className='text-muted-foreground'>
              {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
            </div>
          </CardFooter>
        </Card>

        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {summary.successRate.toFixed(1)}%
            </CardTitle>
            <CardAction>
              <Badge variant={summary.successRate >= 90 ? 'default' : 'destructive'}>
                {summary.successRate >= 90 ? (
                  <Icons.trendingUp />
                ) : (
                  <Icons.trendingDown />
                )}
                {summary.successRate >= 90 ? 'Healthy' : 'Needs attention'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              {summary.successRate >= 90 ? 'Good performance' : 'Review failed generations'}
            </div>
            <div className='text-muted-foreground'>Target: 95%+</div>
          </CardFooter>
        </Card>

        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {summary.avgLatencyMs >= 1000
                ? `${(summary.avgLatencyMs / 1000).toFixed(1)}s`
                : `${summary.avgLatencyMs}ms`}
            </CardTitle>
            <CardAction>
              <Badge variant={summary.avgLatencyMs < 5000 ? 'outline' : 'destructive'}>
                <Icons.clock />
                {summary.avgLatencyMs < 5000 ? 'Normal' : 'Slow'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              Average response time
            </div>
            <div className='text-muted-foreground'>Across all providers</div>
          </CardFooter>
        </Card>

        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Tokens Used</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {summary.totalTokensUsed >= 1_000_000
                ? `${(summary.totalTokensUsed / 1_000_000).toFixed(1)}M`
                : summary.totalTokensUsed >= 1_000
                  ? `${(summary.totalTokensUsed / 1_000).toFixed(0)}K`
                  : summary.totalTokensUsed.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant='outline'>
                <Icons.sparkles />
                Total
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              Token consumption
            </div>
            <div className='text-muted-foreground'>Input + output tokens</div>
          </CardFooter>
        </Card>
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
        {/* Usage by Provider - Bar Chart */}
        <Card className='col-span-4'>
          <CardHeader>
            <CardTitle>Usage by Provider</CardTitle>
            <CardDescription>Generations per AI provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={providerChartConfig}>
              <BarChart accessibilityLayer data={providerData}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='provider'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator='dashed' hideLabel />}
                />
                <Bar dataKey='count' radius={4}>
                  {providerData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Usage by Material Type - Pie Chart */}
        <Card className='col-span-4 md:col-span-3 flex h-full flex-col'>
          <CardHeader className='items-center pb-0'>
            <CardTitle>Usage by Material Type</CardTitle>
            <CardDescription>Distribution of generations by material</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-1 items-center justify-center pb-0'>
            <ChartContainer
              config={materialTypeChartConfig}
              className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='count' hideLabel />} />
                <Pie
                  data={materialData}
                  innerRadius={30}
                  dataKey='count'
                  radius={10}
                  cornerRadius={8}
                  paddingAngle={4}
                >
                  <LabelList
                    dataKey='count'
                    stroke='none'
                    fontSize={12}
                    fontWeight={500}
                    fill='currentColor'
                    formatter={(value: number) => value.toString()}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Usage Trend - Area Chart */}
        <Card className='col-span-4'>
          <CardHeader>
            <CardTitle>Daily Usage Trend</CardTitle>
            <CardDescription>Generations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendChartConfig}>
              <AreaChart accessibilityLayer data={dailyTrend}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='date'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const d = new Date(value);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <defs>
                  <pattern id='dotted-bg-generations' x='0' y='0' width='7' height='7' patternUnits='userSpaceOnUse'>
                    <circle cx='5' cy='5' r='1.5' fill='var(--chart-1)' opacity={0.5} />
                  </pattern>
                  <pattern id='dotted-bg-successes' x='0' y='0' width='7' height='7' patternUnits='userSpaceOnUse'>
                    <circle cx='5' cy='5' r='1.5' fill='var(--chart-2)' opacity={0.5} />
                  </pattern>
                </defs>
                <Area
                  dataKey='generations'
                  type='natural'
                  fill='url(#dotted-bg-generations)'
                  fillOpacity={0.4}
                  stroke='var(--color-generations)'
                  stackId='a'
                  strokeWidth={0.8}
                />
                <Area
                  dataKey='successes'
                  type='natural'
                  fill='url(#dotted-bg-successes)'
                  fillOpacity={0.4}
                  stroke='var(--color-successes)'
                  stackId='b'
                  strokeWidth={0.8}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Feedback Summary */}
        <Card className='col-span-4 md:col-span-3'>
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
            <CardDescription>User feedback on AI generations</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-3 gap-4 text-center'>
              <div>
                <p className='text-2xl font-bold'>{feedback.totalFeedback}</p>
                <p className='text-muted-foreground text-xs'>Total Feedback</p>
              </div>
              <div>
                <p className='text-2xl font-bold text-green-600'>
                  {feedback.positiveRate.toFixed(1)}%
                </p>
                <p className='text-muted-foreground text-xs'>Positive</p>
              </div>
              <div>
                <p className='text-2xl font-bold text-red-600'>
                  {feedback.negativeRate.toFixed(1)}%
                </p>
                <p className='text-muted-foreground text-xs'>Negative</p>
              </div>
            </div>

            {feedback.topIssues.length > 0 && (
              <div>
                <p className='text-muted-foreground mb-2 text-sm font-medium'>Top Issues</p>
                <ul className='space-y-2'>
                  {feedback.topIssues.map((item, i) => (
                    <li
                      key={i}
                      className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
                    >
                      <span>{item.issue}</span>
                      <Badge variant='secondary'>{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

