import LeadsViewPage from '@/features/leads/components/leads-view-page';
import PageContainer from '@/components/layout/page-container';
import { leadsInfoContent } from '@/features/leads/info-content';
export default function Page() {
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
