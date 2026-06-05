import PageContainer from '@/components/layout/page-container';
import RolesViewPage from '@/features/roles/components/roles-view-page';

export const metadata = { title: '角色管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='角色管理'
      pageDescription='管理角色的权限分配，配置每个角色的功能访问范围。'
    >
      <RolesViewPage />
    </PageContainer>
  );
}
