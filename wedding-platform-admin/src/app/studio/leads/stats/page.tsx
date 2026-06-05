import PageContainer from '@/components/layout/page-container';
import { LeadsStatsDashboard } from '@/features/leads/components/leads-stats-dashboard';

export default function LeadsStatsPage() {
  return (
    <PageContainer
      pageTitle='线索统计'
      pageDescription='查看线索转化漏斗、来源分布和趋势分析'
    >
      <LeadsStatsDashboard />
    </PageContainer>
  );
}
