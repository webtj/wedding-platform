import { apiClient } from '@/lib/api-client';
import { queryOptions } from '@tanstack/react-query';

export type NavBadgeCount = { count: number };
export type NavBadgesResponse = { badges: Record<string, NavBadgeCount> };

export const navBadgesKey = ['nav-badges'] as const;

export function getNavBadges(): Promise<NavBadgesResponse> {
  return apiClient<NavBadgesResponse>('/nav-badges');
}

export const navBadgesOptions = () =>
  queryOptions({
    queryKey: navBadgesKey,
    queryFn: getNavBadges,
    staleTime: 5 * 60 * 1000
  });
