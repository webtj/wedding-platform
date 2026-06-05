import PageContainer from '@/components/layout/page-container';
import AccountsViewPage from '@/features/accounts/components/accounts-view-page';

export const metadata = { title: '账号管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='账号管理'
      pageDescription='管理平台所有租户下的账号，创建、编辑、禁用账号。'
    >
      <AccountsViewPage />
    </PageContainer>
  );
}
