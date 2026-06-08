import KBar from '@/components/kbar';
import { AuthGuard } from '@/components/auth-guard';
import { StudioModeGuard } from '@/components/mode-guards';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { RouteStaleProvider } from '@/components/layout/route-stale-provider';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AutoTracker } from '@/lib/analytics/auto-tracker';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: '婚礼 SaaS 平台',
  description: '婚策工作台',
  robots: { index: false, follow: false }
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <AuthGuard>
      <StudioModeGuard>
        <KBar>
          <AutoTracker />
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>
              <Header />
              <InfobarProvider defaultOpen={false}>
                <RouteStaleProvider>
                  {children}
                </RouteStaleProvider>
                <InfoSidebar side='right' />
              </InfobarProvider>
            </SidebarInset>
          </SidebarProvider>
        </KBar>
      </StudioModeGuard>
    </AuthGuard>
  );
}
