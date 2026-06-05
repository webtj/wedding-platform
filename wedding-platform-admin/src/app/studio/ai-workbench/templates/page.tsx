import PageContainer from '@/components/layout/page-container';
import { PromptTemplateManager } from '@/features/ai-workbench/components/prompt-template-manager';

export const metadata = { title: '生图模板 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='生图模板'
      pageDescription='维护婚礼 AI 生图常用灵感词，沉淀品牌风格、物料场景和构图要求。'
    >
      <PromptTemplateManager />
    </PageContainer>
  );
}
