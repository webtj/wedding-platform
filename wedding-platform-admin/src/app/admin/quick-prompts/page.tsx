import PageContainer from '@/components/layout/page-container';
import { QuickPromptManager } from '@/features/ai-workbench/components/quick-prompt-manager';

export const metadata = { title: '推荐词管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='推荐词管理'
      pageDescription='管理平台内置推荐词，维护婚策 AI 生图常用灵感话术。'
    >
      <QuickPromptManager />
    </PageContainer>
  );
}
