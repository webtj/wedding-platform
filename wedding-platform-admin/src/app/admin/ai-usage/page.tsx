import PageContainer from '@/components/layout/page-container';
import AiUsageViewPage from '@/features/ai-usage/components/ai-usage-view-page';

export const metadata = { title: 'AI 用量分析 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='AI 用量分析'
      pageDescription='查看 AI 图片生成的用量指标、成功率、延迟和反馈统计。'
    >
      <AiUsageViewPage />
    </PageContainer>
  );
}
