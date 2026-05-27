'use client';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { Icons } from '@/components/icons';
export default function StudioWorkspacesPage() {
  const { orgId } = useAuth();
  const { isLoaded, userMemberships } = useOrganizationList();
  const orgs = userMemberships?.data ?? [];
  return (
    <PageContainer pageTitle='切换团队' pageDescription='选择要管理的工作区' isLoading={!isLoaded}>
      <div className='space-y-4'>
        {orgs.map((m) => (
          <Card key={m.id} className={m.organization.id === orgId ? 'border-primary' : ''}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    {m.organization.name}
                    {m.organization.id === orgId && <Badge variant='default'>当前</Badge>}
                  </CardTitle>
                  <CardDescription>角色：{m.role}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
        {orgs.length === 0 && (
          <div className='py-12 text-center text-muted-foreground'>
            <Icons.galleryVerticalEnd className='mx-auto mb-3 size-12 opacity-50' />
            <p>暂无关联租户</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
