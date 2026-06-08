import PageContainer from '@/components/layout/page-container';
import { QuickPromptManager } from '@/features/ai-workbench/components/quick-prompt-manager';

export const metadata = { title: '推荐词管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='推荐词管理'
      pageDescription='维护 AI 生图推荐词，按分类管理常用灵感话术，方便快速选用。'
    >
      <QuickPromptManager />
    </PageContainer>
  );
}
