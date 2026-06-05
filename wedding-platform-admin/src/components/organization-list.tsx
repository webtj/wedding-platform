'use client';

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

type Props = {
  appearance?: Record<string, unknown>;
  afterSelectOrganizationUrl?: string;
  afterCreateOrganizationUrl?: string;
};

export function OrganizationList({
  appearance: _appearance,
  afterSelectOrganizationUrl,
  afterCreateOrganizationUrl: _afterCreateOrganizationUrl
}: Props) {
  const { orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Icons.spinner className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  const orgs = userMemberships?.data ?? [];

  if (orgs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <Icons.galleryVerticalEnd className='mb-3 h-12 w-12 text-muted-foreground/50' />
        <p className='text-muted-foreground'>暂无关联租户</p>
        <p className='text-muted-foreground mt-1 text-sm'>请联系平台管理员为你分配租户</p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {orgs.map((membership) => {
        const org = membership.organization;
        const isActive = org.id === orgId;

        return (
          <button
            type='button'
            key={membership.id}
            className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
              isActive ? 'border-primary bg-accent' : ''
            }`}
            onClick={async () => {
              if (!isActive) {
                await setActive({ organization: org.id });
                if (afterSelectOrganizationUrl) {
                  router.push(afterSelectOrganizationUrl);
                }
              }
            }}
          >
            <div>
              <p className='text-lg font-semibold'>{org.name}</p>
              <p className='text-muted-foreground text-sm'>{membership.role}</p>
            </div>
            {isActive && <Icons.check className='h-4 w-4 text-primary' />}
          </button>
        );
      })}
    </div>
  );
}
