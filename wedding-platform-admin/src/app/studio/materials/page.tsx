import PageContainer from '@/components/layout/page-container';
import { MaterialsPage } from '@/features/materials/components/materials-page';

export const metadata = { title: '物料管理 | 婚礼 SaaS 平台' };

export default function Page() {
  return (
    <PageContainer pageTitle='物料管理'>
      <MaterialsPage />
    </PageContainer>
  );
}
