import ContractsViewPage from '@/features/contracts/components/contracts-view-page';
import PageContainer from '@/components/layout/page-container';
import { contractsInfoContent } from '@/features/contracts/info-content';
export default function Page() {
  return (
    <PageContainer
      pageTitle='合同管理'
      pageDescription='管理所有合同，关联项目，跟踪收款进度'
      infoContent={contractsInfoContent}
    >
      <ContractsViewPage />
    </PageContainer>
  );
}
