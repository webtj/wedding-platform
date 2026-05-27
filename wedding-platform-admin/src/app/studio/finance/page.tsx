import FinanceViewPage from '@/features/finance/components/finance-view-page';
import PageContainer from '@/components/layout/page-container';
import { financeInfoContent } from '@/features/finance/info-content';
export default function Page() {
  return (
    <PageContainer
      pageTitle='财务管理'
      pageDescription='合同总额、收款、支出、利润等财务数据汇总'
      infoContent={financeInfoContent}
    >
      <FinanceViewPage />
    </PageContainer>
  );
}
