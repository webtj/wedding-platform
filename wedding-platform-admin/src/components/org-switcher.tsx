'use client';

// WorkspaceSwitcher — replaces the Clerk-style "OrgSwitcher".
//
// Platform admins (mode='platform') are isolated to /admin/* and never see a
// workspace switcher here. They get a static "平台管理中心" badge with no
// dropdown — the privacy boundary is enforced both in the data and in the UI.
//
// Tenant users see a dropdown only when they belong to 2+ workspaces.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth/use-auth';

export function OrgSwitcher() {
  const { isMobile, state } = useSidebar();
  const router = useRouter();
  const {
    isLoaded,
    isSignedIn,
    isPlatformAdmin,
    mode,
    workspaces,
    activeWorkspaceId,
    switchActiveWorkspace,
    revalidate
  } = useAuth();

  useEffect(() => {
    void revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const [error, setError] = useState<string | null>(null);

  // Loading / not signed in
  if (!isLoaded || !isSignedIn) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
              <Icons.galleryVerticalEnd className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>加载中…</span>
              <span className='text-muted-foreground truncate text-xs'>工作空间</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Platform admin: static badge, no dropdown. They are sandboxed in /admin/*
  // and have no workspaces to switch between (server hides memberships).
  if (isPlatformAdmin || mode === 'platform') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
              <Icons.shield className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>平台管理中心</span>
              <span className='text-muted-foreground truncate text-xs'>
                {isPlatformAdmin ? '平台管理员' : '平台模式'}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const displayEntry = activeWorkspace
    ? { id: activeWorkspace.id, name: activeWorkspace.name, role: '工作空间' }
    : null;

  // No workspaces at all: prompt to /studio/workspaces (informational)
  if (workspaces.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            onClick={() => router.push('/studio/workspaces')}
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
              <Icons.add className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>无可用工作空间</span>
              <span className='text-muted-foreground truncate text-xs'>前往查看</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const handleSelect = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;
    try {
      setError(null);
      await switchActiveWorkspace(workspaceId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换失败');
    }
  };

  // Single workspace, no dropdown
  if (workspaces.length === 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg'>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
              <Icons.galleryVerticalEnd className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>{displayEntry?.name}</span>
              <span className='text-muted-foreground truncate text-xs'>
                {displayEntry?.role}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                <Icons.galleryVerticalEnd className='size-4' />
              </div>
              <div
                className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                  state === 'collapsed'
                    ? 'invisible max-w-0 overflow-hidden opacity-0'
                    : 'visible max-w-full opacity-100'
                }`}
              >
                <span className='truncate font-medium'>{displayEntry?.name}</span>
                <span className='text-muted-foreground truncate text-xs'>
                  {displayEntry?.role}
                </span>
              </div>
              <Icons.chevronsUpDown
                className={`ml-auto transition-all duration-200 ease-in-out ${
                  state === 'collapsed'
                    ? 'invisible max-w-0 opacity-0'
                    : 'visible max-w-full opacity-100'
                }`}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              切换工作空间
            </DropdownMenuLabel>

            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspaceId;
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSelect(workspace.id)}
                  className='gap-2 p-2'
                >
                  <div className='flex size-6 items-center justify-center overflow-hidden rounded-md border'>
                    <Icons.galleryVerticalEnd className='size-3.5 shrink-0' />
                  </div>
                  {workspace.name}
                  {isActive && <Icons.check className='ml-auto size-4' />}
                </DropdownMenuItem>
              );
            })}

            {error && (
              <>
                <DropdownMenuSeparator />
                <div className='px-2 py-1.5 text-xs text-red-600'>{error}</div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
