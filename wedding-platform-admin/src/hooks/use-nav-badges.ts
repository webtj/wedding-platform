import { useQuery } from '@tanstack/react-query';
import { navBadgesOptions } from '@/lib/api/nav-badges';
import type { NavBadgeSourceKey } from '@/config/nav-badges';

export function useNavBadges() {
  const { data } = useQuery(navBadgesOptions());
  const badges = data?.badges ?? {};
  return {
    badges,
    getCount: (key: NavBadgeSourceKey) => badges[key]?.count ?? 0
  };
}
