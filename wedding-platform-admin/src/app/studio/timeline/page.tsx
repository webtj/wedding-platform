import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getQueryClient } from '@/lib/query-client';
import { calendarQueryOptions } from '@/features/timeline/api/queries';
import { CalendarViewPage } from '@/features/timeline/components/calendar-view-page';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';

function LoadingFallback() {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <Icons.spinner className='text-primary size-8 animate-spin' />
    </div>
  );
}

export default async function TimelinePage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    calendarQueryOptions({
      mode: 'project',
      view: 'recent',
      date: format(new Date(), 'yyyy-MM-dd')
    })
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<LoadingFallback />}>
          <CalendarViewPage />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
