'use client';

import { cn } from '@/lib/utils';

interface WorkbenchShellProps {
  children: React.ReactNode;
  rightPanel: React.ReactNode;
  className?: string;
}

export function WorkbenchShell({ children, rightPanel, className }: WorkbenchShellProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 overflow-hidden', className)}>
      <main className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
        {children}
      </main>
      {rightPanel}
    </div>
  );
}
