'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@clerk/nextjs';

type Props = {
  appearance?: Record<string, unknown>;
};

export function OrganizationProfile({ appearance: _appearance }: Props) {
  const { organization, membership, isLoaded } = useOrganization();

  if (!isLoaded) {
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;
  }

  if (!organization) {
    return <div className='py-12 text-center text-muted-foreground'>请先选择工作空间</div>;
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>{organization.name}</CardTitle>
          <CardDescription>团队信息与角色配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-3'>
            <span className='text-muted-foreground text-sm'>你的角色：</span>
            <Badge variant='default'>{membership?.role ?? 'member'}</Badge>
            {membership?.permissions?.map((p) => (
              <Badge key={p} variant='outline' className='text-xs'>
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
