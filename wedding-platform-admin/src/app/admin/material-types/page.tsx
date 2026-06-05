import PageContainer from '@/components/layout/page-container';
import MaterialTypesManager from '@/features/material-types/components/material-types-manager';

export const metadata = { title: '素材管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='素材管理'
      pageDescription='管理系统内置素材类型，可查看所有租户的素材。'
    >
      <MaterialTypesManager mode='super' />
    </PageContainer>
  );
}
