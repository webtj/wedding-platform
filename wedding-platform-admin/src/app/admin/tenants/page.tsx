import PageContainer from '@/components/layout/page-container';
import TenantsViewPage from '@/features/tenants/components/tenants-view-page';

export const metadata = { title: '租户管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='租户管理'
      pageDescription='管理平台所有租户（婚庆公司），创建、编辑、删除租户。'
    >
      <TenantsViewPage />
    </PageContainer>
  );
}
