import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { categoriesQueryOptions } from '@/features/materials/api/queries';
import { MaterialsPage } from '@/features/materials/components/materials-page';
import PageContainer from '@/components/layout/page-container';

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(categoriesQueryOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer pageTitle='物料管理'>
        <Suspense fallback={null}>
          <MaterialsPage />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
