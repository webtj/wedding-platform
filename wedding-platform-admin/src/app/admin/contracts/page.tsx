import PageContainer from '@/components/layout/page-container';
import ContractsViewPage from '@/features/contracts/components/contracts-view-page';
import { searchParamsCache } from '@/lib/searchparams';
import { contractsInfoContent } from '@/features/contracts/info-content';
import { SearchParams } from 'nuqs/server';

export const metadata = { title: '合同管理 | 婚礼 SaaS 平台' };

type PageProps = { searchParams: Promise<SearchParams> };

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='合同管理'
      pageDescription='管理所有合同，关联项目，跟踪收款进度。'
      infoContent={contractsInfoContent}
    >
      <ContractsViewPage />
    </PageContainer>
  );
}
