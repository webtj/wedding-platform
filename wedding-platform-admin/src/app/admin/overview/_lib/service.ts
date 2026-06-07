// Browser-side fetch of the platform overview. Uses apiClient so the
// access token from localStorage is attached and the 401-refresh flow
// kicks in transparently.

import { apiClient } from '@/lib/api-client';
import type { PlatformOverviewSummary as _ } from './service-shared';

export type { PlatformOverviewSummary } from './service-shared';

export async function getPlatformOverview(): Promise<_> {
  return apiClient<_>('/super/overview/summary');
}
