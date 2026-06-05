'use client';

import { Suspense } from 'react';
import { CalendarViewPage } from '@/features/timeline/components/calendar-view-page';
import { Icons } from '@/components/icons';

function LoadingFallback() {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <Icons.spinner className='text-primary size-8 animate-spin' />
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CalendarViewPage />
    </Suspense>
  );
}
