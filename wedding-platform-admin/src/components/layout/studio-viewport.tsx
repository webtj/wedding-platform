import { cn } from '@/lib/utils';

interface StudioViewportProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Route-scoped fixed viewport for studio "workspace" pages.
 * It keeps the global shell/header untouched and confines scrolling
 * to internal panels only.
 */
export function StudioViewport({ children, className }: StudioViewportProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        'h-[calc(100dvh-4rem)] md:h-[calc(100dvh-3.5rem)]',
        className
      )}
    >
      {children}
    </div>
  );
}
