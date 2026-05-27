import ProjectsViewPage from '@/features/projects/components/projects-view-page';
import PageContainer from '@/components/layout/page-container';
import { projectsInfoContent } from '@/features/projects/info-content';
export default function Page() {
  return (
    <PageContainer
      pageTitle='项目管理'
      pageDescription='所有婚礼项目，按婚期排列'
      infoContent={projectsInfoContent}
    >
      <ProjectsViewPage />
    </PageContainer>
  );
}
