import { StudioViewport } from '@/components/layout/studio-viewport';
import { TextGenerationView } from '@/features/ai-workbench/components/text-generation-view';

export const metadata = { title: 'AI 文案生成 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <StudioViewport>
      <TextGenerationView />
    </StudioViewport>
  );
}
