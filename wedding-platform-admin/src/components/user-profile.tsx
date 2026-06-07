'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser, useOrganizationList } from '@clerk/nextjs';

export function UserProfile() {
  const { user } = useUser();
  const { userMemberships } = useOrganizationList();
  const orgs = userMemberships?.data ?? [];

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
          <CardDescription>你的账户基本信息</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          <div>
            <span className='text-muted-foreground text-sm'>用户名：</span>
            <span className='font-medium'>{user?.fullName ?? '—'}</span>
          </div>
          <div>
            <span className='text-muted-foreground text-sm'>账户类型：</span>
            <Badge variant='outline'>团队账户</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关联工作空间</CardTitle>
          <CardDescription>你可以访问的工作空间</CardDescription>
        </CardHeader>
        <CardContent>
          {orgs.map((m) => (
            <div key={m.id} className='flex items-center justify-between py-2'>
              <span className='font-medium'>{m.organization.name}</span>
              <Badge variant='secondary'>{m.role}</Badge>
            </div>
          ))}
          {orgs.length === 0 && <p className='text-muted-foreground text-sm'>暂无关联工作空间</p>}
        </CardContent>
      </Card>
    </div>
  );
}
