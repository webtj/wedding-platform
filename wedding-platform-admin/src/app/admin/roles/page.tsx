import PageContainer from '@/components/layout/page-container';
import RolesViewPage from '@/features/roles/components/roles-view-page';

export const metadata = { title: '角色管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='角色管理'
      pageDescription='管理平台角色，分配权限码和菜单。内置角色不可删除。'
    >
      <RolesViewPage />
    </PageContainer>
  );
}
