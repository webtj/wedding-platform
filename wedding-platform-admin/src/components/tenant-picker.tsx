'use client';

// WorkspacePicker — shown to a signed-in tenant user who has not picked an
// active workspace (e.g. 0 or 2+ memberships, and they haven't auto-resolved
// to a default). Replaces dashboard content with a centered picker.
//
// Platform admins never see this component: the login form routes them
// directly to /admin/overview and their /me response has no tenants.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { logout as signOut } from '@/lib/auth/auth-client';

export function TenantPicker() {
  const router = useRouter();
  const { me, switchActiveWorkspace } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!me) return null;

  const tenants = me.tenants;

  const handleSelect = async (tenantId: string) => {
    setBusy(tenantId);
    setError('');
    try {
      await switchActiveWorkspace(tenantId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换失败');
    } finally {
      setBusy(null);
    }
  };

  const handleExit = async () => {
    await signOut();
    router.replace('/auth/sign-in');
  };

  return (
    <div className='flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-12'>
      <Card className='w-full max-w-lg border-border/60 shadow-lg'>
        <CardHeader className='space-y-2 text-center'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
            <Icons.workspace className='h-6 w-6' />
          </div>
          <CardTitle className='text-2xl'>选择工作空间</CardTitle>
          <CardDescription>
            {tenants.length > 1
              ? '你在多个工作空间拥有成员身份，选择一个进入。'
              : '暂无可访问的工作空间，请联系管理员开通成员身份。'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {tenants.length === 0 ? (
            <div className='rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground'>
              暂无可访问的工作空间，请联系管理员开通成员身份。
            </div>
          ) : (
            <div className='grid gap-2'>
              {tenants.map((tenant) => {
                const isBusy = busy === tenant.id;
                return (
                  <button
                    key={tenant.id}
                    type='button'
                    onClick={() => handleSelect(tenant.id)}
                    disabled={busy !== null}
                    className='group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-semibold text-foreground'>
                        {tenant.name}
                      </div>
                      <div className='mt-0.5 flex items-center gap-2 text-xs text-muted-foreground'>
                        {tenant.address && <span className='truncate'>{tenant.address}</span>}
                        <span className='rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]'>
                          {tenant.roles.join(' / ') || 'member'}
                        </span>
                      </div>
                    </div>
                    {isBusy ? (
                      <Icons.spinner className='h-4 w-4 animate-spin text-muted-foreground' />
                    ) : (
                      <Icons.chevronRight className='h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className='rounded-xl border border-red-200/70 bg-red-50/60 px-3 py-2 text-sm text-red-700'>
              {error}
            </div>
          )}

          <div className='flex items-center justify-between border-t border-border/60 pt-3'>
            <span className='text-xs text-muted-foreground'>{me.displayName}</span>
            <Button variant='ghost' size='sm' onClick={handleExit}>
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
