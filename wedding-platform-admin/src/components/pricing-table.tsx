'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

type Props = {
  for?: 'organization' | 'user';
};

export function PricingTable({ for: _for }: Props) {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.creditCard className='h-5 w-5' />
            基础版
          </CardTitle>
          <CardDescription>适合小型婚庆团队</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-2xl font-bold'>免费</p>
          <p className='text-muted-foreground mt-2 text-sm'>功能开发中，敬请期待。</p>
        </CardContent>
      </Card>
      <Card className='border-primary'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Icons.badgeCheck className='h-5 w-5 text-primary' />
            专业版
          </CardTitle>
          <CardDescription>适合中大型婚庆公司</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-2xl font-bold'>¥999/月</p>
          <p className='text-muted-foreground mt-2 text-sm'>功能开发中，敬请期待。</p>
        </CardContent>
      </Card>
    </div>
  );
}
