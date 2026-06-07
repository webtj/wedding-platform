import PageContainer from '@/components/layout/page-container';
import TeamAccountsViewPage from '@/features/team-accounts/components/team-accounts-view-page';

export const metadata = { title: '账号管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='账号管理'
      pageDescription='管理团队成员账号，创建、编辑、分配角色。'
    >
      <TeamAccountsViewPage />
    </PageContainer>
  );
}
