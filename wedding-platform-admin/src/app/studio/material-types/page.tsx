import PageContainer from '@/components/layout/page-container';
import MaterialTypesManager from '@/features/material-types/components/material-types-manager';

export const metadata = { title: '素材管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer
      pageTitle='素材管理'
      pageDescription='管理自定义素材类型，系统内置类型不可编辑。'
    >
      <MaterialTypesManager mode='tenant' />
    </PageContainer>
  );
}
