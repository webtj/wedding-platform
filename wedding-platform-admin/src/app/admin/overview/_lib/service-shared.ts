// Shared type for the platform overview payload. Lives in its own file so
// both the client fetcher and the consuming component can import it without
// pulling in server-only or client-only dependencies.

export type PlatformOverviewSummary = {
  totals: {
    tenants: number;
    activeTenants: number;
    users: number;
    leads: number;
    projects: number;
    contracts: number;
    aiGenerations: number;
  };
  recentTenants: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    memberCount: number;
    projectCount: number;
  }>;
  recentUsers: Array<{
    id: string;
    displayName: string;
    createdAt: string;
    tenantName: string | null;
    isPlatformAdmin: boolean;
  }>;
  aiUsageLast7Days: Array<{ date: string; count: number }>;
};
