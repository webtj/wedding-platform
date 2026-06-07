'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useForbidden } from '@/lib/forbidden-context';
import { PERMISSION_METADATA } from '@/lib/permissions';

export function NoPermissionPanel() {
  const { current, dismiss } = useForbidden();
  if (!current) return null;

  const codes = current.requiredPermissions ?? [];
  const resource = current.resource;

  return (
    <div
      role='presentation'
      className='bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm'
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === 'Escape') dismiss();
      }}
    >
      <div
        className='bg-card w-full max-w-md space-y-4 rounded-lg border p-6 shadow-lg'
      >
        <div className='flex items-start gap-3'>
          <div className='bg-destructive/10 text-destructive flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
            <Icons.lock className='h-5 w-5' />
          </div>
          <div className='flex-1 space-y-1'>
            <h2 className='text-lg font-semibold'>没有访问权限</h2>
            <p className='text-muted-foreground text-sm'>
              {current.message ??
                (resource
                  ? `你当前的角色没有「${resource}」的访问权限。`
                  : '你当前的角色没有足够的权限执行此操作。')}
            </p>
          </div>
          <button
            type='button'
            onClick={dismiss}
            className='text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded-md p-1'
            aria-label='关闭'
          >
            <Icons.close className='h-4 w-4' />
          </button>
        </div>

        {codes.length > 0 && (
          <div className='space-y-2'>
            <div className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
              需要以下权限
            </div>
            <ul className='space-y-1.5'>
              {codes.map((code) => {
                const meta = PERMISSION_METADATA[code];
                return (
                  <li
                    key={code}
                    className='bg-muted/40 flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-sm'
                  >
                    <code className='bg-background rounded px-1.5 py-0.5 font-mono text-xs'>
                      {code}
                    </code>
                    <span className='text-muted-foreground text-xs'>
                      {meta?.description ?? '需要此权限'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className='bg-muted/40 -mx-6 -mb-6 rounded-b-lg border-t px-6 py-3 text-sm'>
          <p className='text-muted-foreground'>
            如需开通权限，请联系租户管理员在{' '}
            <span className='text-foreground font-medium'>账号管理 → 角色</span>
            中调整。
          </p>
        </div>

        <div className='flex items-center justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={dismiss}>
            我知道了
          </Button>
          <Button
            size='sm'
            onClick={() => {
              dismiss();
              if (typeof window !== 'undefined') {
                window.location.href = '/studio/accounts';
              }
            }}
          >
            <Icons.user className='mr-1.5 h-3.5 w-3.5' /> 前往账号管理
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ForbiddenBadges({
  codes
}: {
  codes: string[];
}) {
  if (codes.length === 0) return null;
  return (
    <div className='flex flex-wrap gap-1'>
      {codes.slice(0, 3).map((c) => (
        <Badge key={c} variant='secondary' className='font-mono text-[10px]'>
          {c}
        </Badge>
      ))}
      {codes.length > 3 && (
        <Badge variant='outline' className='text-[10px]'>
          +{codes.length - 3}
        </Badge>
      )}
    </div>
  );
}
