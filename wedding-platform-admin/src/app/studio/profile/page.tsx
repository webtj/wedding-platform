'use client';

import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function StudioProfilePage() {
  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Profile</h1>
          <p className='text-muted-foreground text-sm'>Manage your account settings.</p>
        </div>
        <Link href='/studio/profile/notifications'>
          <Button variant='outline' size='sm'>
            <Icons.notification className='mr-2 h-4 w-4' />
            Notification Settings
          </Button>
        </Link>
      </div>
      <Separator />
      <UserProfile />
    </div>
  );
}
