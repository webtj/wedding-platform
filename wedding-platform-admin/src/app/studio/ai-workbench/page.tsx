import { StudioViewport } from '@/components/layout/studio-viewport';
import AiWorkbenchViewPage from '@/features/ai-workbench/components/ai-workbench-view-page';

export const metadata = { title: 'AI 工作台 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <StudioViewport>
      <AiWorkbenchViewPage />
    </StudioViewport>
  );
}
