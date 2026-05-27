import PageContainer from '@/components/layout/page-container';
import LeadsViewPage from '@/features/leads/components/leads-view-page';
import { searchParamsCache } from '@/lib/searchparams';
import { leadsInfoContent } from '@/features/leads/info-content';
import { SearchParams } from 'nuqs/server';

export const metadata = { title: '意向单 | 婚礼 SaaS 平台' };

type PageProps = { searchParams: Promise<SearchParams> };

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='意向单'
      pageDescription='管理客户咨询意向，跟踪销售漏斗状态'
      infoContent={leadsInfoContent}
    >
      <LeadsViewPage />
    </PageContainer>
  );
}
