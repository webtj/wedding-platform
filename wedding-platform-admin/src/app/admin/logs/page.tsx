import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import LogsDashboard from '@/features/logs/components/logs-dashboard';

export const metadata = { title: 'System Logs | 婚礼 SaaS 平台' };

function LogsLoading() {
  return (
    <div className='space-y-4 animate-pulse'>
      <div className='bg-muted h-9 w-80 rounded-lg' />
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <div className='bg-muted h-40 rounded-lg' />
        <div className='bg-muted h-40 rounded-lg' />
        <div className='bg-muted h-40 rounded-lg' />
      </div>
      <div className='bg-muted h-64 rounded-lg' />
    </div>
  );
}

export default function Page() {
  return (
    <PageContainer
      pageTitle='System Logs'
      pageDescription='View request logs, error logs, audit trails, and user behavior events.'
    >
      <Suspense fallback={<LogsLoading />}>
        <LogsDashboard />
      </Suspense>
    </PageContainer>
  );
}
