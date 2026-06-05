import { StudioViewport } from '@/components/layout/studio-viewport'
import AiWorkbenchViewPage from '@/features/ai-workbench/components/ai-workbench-view-page'

interface ProjectAiWorkbenchPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectAiWorkbenchPage({ params }: ProjectAiWorkbenchPageProps) {
  const { projectId } = await params

  return (
    <StudioViewport>
      <AiWorkbenchViewPage projectId={projectId} />
    </StudioViewport>
  )
}
