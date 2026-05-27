import PageContainer from '@/components/layout/page-container';
import MenusViewPage from '@/features/menus/components/menus-view-page';

export const metadata = { title: '菜单管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='菜单管理'
      pageDescription='管理平台和租户的导航菜单，支持树形结构和排序。'
    >
      <MenusViewPage />
    </PageContainer>
  );
}
