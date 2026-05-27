import PageContainer from '@/components/layout/page-container';
import ProjectsViewPage from '@/features/projects/components/projects-view-page';
import { searchParamsCache } from '@/lib/searchparams';
import { projectsInfoContent } from '@/features/projects/info-content';
import { SearchParams } from 'nuqs/server';

export const metadata = { title: '项目管理 | 婚礼 SaaS 平台' };

type PageProps = { searchParams: Promise<SearchParams> };

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='项目管理'
      pageDescription='所有婚礼项目，按婚期排列。项目由意向单转化创建。'
      infoContent={projectsInfoContent}
    >
      <ProjectsViewPage />
    </PageContainer>
  );
}
