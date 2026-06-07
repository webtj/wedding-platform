'use client';
import PageContainer from '@/components/layout/page-container';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { Icons } from '@/components/icons';

// Workspaces page — lists real workspaces only. Platform admins are routed to
// /admin/overview from the login form and never reach this page, so no
// "进入平台管理中心" entry is shown here.
export default function StudioWorkspacesPage() {
  const { orgId } = useAuth();
  const { isLoaded, userMemberships } = useOrganizationList();
  const orgs = userMemberships?.data ?? [];

  return (
    <PageContainer
      pageTitle='切换工作空间'
      pageDescription='选择要管理的工作区'
      isLoading={!isLoaded}
    >
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
            <p>暂无关联工作空间</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
