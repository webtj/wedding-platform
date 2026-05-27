import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: '注册 | 婚礼 SaaS 平台',
  description: '创建婚礼 SaaS 平台账户'
};

export default function Page() {
  return <SignUpViewPage />;
}
