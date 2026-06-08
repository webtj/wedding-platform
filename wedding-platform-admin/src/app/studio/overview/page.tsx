import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { overviewStatsOptions } from '@/features/overview/api/queries';
import { StudioOverviewContent } from './_components/studio-overview-content';
import PageContainer from '@/components/layout/page-container';

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(overviewStatsOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={null}>
          <StudioOverviewContent />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
