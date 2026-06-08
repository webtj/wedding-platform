'use client';

import { Suspense, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  statsOverviewOptions,
  requestsByHourOptions,
  errorsByDayOptions,
  topErrorsOptions,
} from '../api/queries';
import type { DateRangeParams } from '../api/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequestLogsTable } from './request-logs-table';
import { ErrorLogsTable } from './error-logs-table';
import { AuditLogsTable } from './audit-logs-table';
import { BehaviorEventsTable } from './behavior-events-table';

// ── Chart configs ───────────────────────────────────────────────────────────

const hourlyChartConfig = {
  count: { label: 'Requests', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const errorChartConfig = {
  count: { label: 'Errors', color: 'var(--chart-5)' },
} satisfies ChartConfig;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): DateRangeParams {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29);
  return {
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
  };
}

function formatDateRangeLabel(dateRange: DateRangeParams): string {
  if (dateRange.startDate && dateRange.endDate) {
    return `${dateRange.startDate} to ${dateRange.endDate}`;
  }
  if (dateRange.startDate) {
    return `From ${dateRange.startDate}`;
  }
  if (dateRange.endDate) {
    return `Until ${dateRange.endDate}`;
  }
  return 'All time';
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ dateRange }: { dateRange: DateRangeParams }) {
  const { data: stats } = useSuspenseQuery(statsOverviewOptions(dateRange));
  const { data: hourly } = useSuspenseQuery(requestsByHourOptions(dateRange));
  const { data: errorsByDay } = useSuspenseQuery(errorsByDayOptions(dateRange));
  const { data: topErrors } = useSuspenseQuery(topErrorsOptions(dateRange));

  return (
    <div className='space-y-6'>
      {/* Stat cards */}
      <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3'>
        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {stats.totalRequests.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant='outline'>
                <Icons.calendar />
                {formatDateRangeLabel(dateRange)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              HTTP requests logged
            </div>
          </CardFooter>
        </Card>

        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Total Errors</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {stats.totalErrors.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant={stats.totalErrors === 0 ? 'default' : 'destructive'}>
                {stats.totalErrors === 0 ? (
                  <Icons.check />
                ) : (
                  <Icons.warning />
                )}
                {stats.totalErrors === 0 ? 'Clean' : 'Review'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              Server-side errors
            </div>
          </CardFooter>
        </Card>

        <Card className='@container/card'>
          <CardHeader>
            <CardDescription>Avg Duration</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {stats.avgDuration >= 1000
                ? `${(stats.avgDuration / 1000).toFixed(1)}s`
                : `${stats.avgDuration}ms`}
            </CardTitle>
            <CardAction>
              <Badge variant={stats.avgDuration < 500 ? 'outline' : 'destructive'}>
                <Icons.clock />
                {stats.avgDuration < 500 ? 'Fast' : 'Slow'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 flex gap-2 font-medium'>
              Average response time
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {/* Requests by hour */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Hour</CardTitle>
            <CardDescription>Request volume distribution over 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={hourlyChartConfig} className='h-[300px] w-full'>
              <LineChart data={hourly}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='hour'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `${v}:00`}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => `${v}:00`}
                      indicator='dashed'
                    />
                  }
                />
                <Line
                  dataKey='count'
                  type='natural'
                  stroke='var(--color-count)'
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Errors by day */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Day</CardTitle>
            <CardDescription>Daily error count over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={errorChartConfig} className='h-[300px] w-full'>
              <BarChart data={errorsByDay}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='day'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator='dashed' hideLabel />}
                />
                <Bar dataKey='count' fill='var(--color-count)' radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top errors table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Errors</CardTitle>
          <CardDescription>Most frequent error messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className='text-right'>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topErrors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className='h-24 text-center text-muted-foreground'
                    >
                      No errors recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  topErrors.map((err, i) => (
                    <TableRow key={i}>
                      <TableCell className='max-w-[400px] truncate font-mono text-xs'>
                        {err.message}
                      </TableCell>
                      <TableCell className='font-mono text-xs text-muted-foreground'>
                        {err.path ?? '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Badge variant='destructive'>{err.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function LogsDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeParams>(
    () => getDefaultDateRange(),
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='space-y-1'>
          <div className='text-xs font-medium text-muted-foreground'>
            Start date
          </div>
          <Input
            type='date'
            value={dateRange.startDate ?? ''}
            onChange={(e) => {
              setDateRange((prev) => ({
                ...prev,
                startDate: e.target.value || undefined,
              }));
            }}
            className='w-[160px]'
          />
        </div>
        <div className='space-y-1'>
          <div className='text-xs font-medium text-muted-foreground'>
            End date
          </div>
          <Input
            type='date'
            value={dateRange.endDate ?? ''}
            onChange={(e) => {
              setDateRange((prev) => ({
                ...prev,
                endDate: e.target.value || undefined,
              }));
            }}
            className='w-[160px]'
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setDateRange(getDefaultDateRange())}
        >
          <Icons.refresh />
          Last 30 days
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setDateRange({})}
        >
          <Icons.close />
          Clear
        </Button>
      </div>

      <Tabs defaultValue='overview' className='w-full'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='requests'>Requests</TabsTrigger>
          <TabsTrigger value='errors'>Errors</TabsTrigger>
          <TabsTrigger value='audits'>Audits</TabsTrigger>
          <TabsTrigger value='behavior'>Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value='requests' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <RequestLogsTable dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value='errors' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <ErrorLogsTable dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value='audits' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <AuditLogsTable dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value='behavior' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <BehaviorEventsTable dateRange={dateRange} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className='space-y-4 animate-pulse'>
      <div className='bg-muted h-10 w-full rounded-lg' />
      <div className='bg-muted h-64 w-full rounded-lg' />
    </div>
  );
}
