import PageContainer from '@/components/layout/page-container';
import AccountsViewPage from '@/features/accounts/components/accounts-view-page';
import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';

export const metadata = { title: '账号管理 | 婚礼 SaaS 平台' };

type PageProps = { searchParams: Promise<SearchParams> };

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer pageTitle='账号管理' pageDescription='管理平台所有用户账号，分配租户和角色。'>
      <AccountsViewPage />
    </PageContainer>
  );
}
