import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  statsOverviewOptions,
  statsTimelineOptions,
  statsBySourceOptions
} from '@/features/leads/api/stats-queries';
import { LeadsStatsDashboard } from '@/features/leads/components/leads-stats-dashboard';
import PageContainer from '@/components/layout/page-container';

export default async function LeadsStatsPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(statsOverviewOptions()),
    queryClient.prefetchQuery(statsTimelineOptions()),
    queryClient.prefetchQuery(statsBySourceOptions())
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer
        pageTitle='线索统计'
        pageDescription='查看线索转化漏斗、来源分布和趋势分析'
      >
        <Suspense fallback={null}>
          <LeadsStatsDashboard />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
