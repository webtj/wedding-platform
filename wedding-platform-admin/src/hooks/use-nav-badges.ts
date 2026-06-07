import { useQuery } from '@tanstack/react-query';
import { navBadgesOptions } from '@/lib/api/nav-badges';
import type { NavBadgeSourceKey } from '@/config/nav-badges';
import { useAuth } from '@/lib/auth/use-auth';

export function useNavBadges() {
  const { isPlatformAdmin } = useAuth();
  // Skip the network round-trip entirely for platform admins: every
  // NAV_BADGE_SOURCES entry is tenant-scoped, so the API would return an
  // empty map anyway. Defense-in-depth alongside the controller check.
  const { data } = useQuery({
    ...navBadgesOptions(),
    enabled: !isPlatformAdmin
  });
  const badges = data?.badges ?? {};
  return {
    badges,
    getCount: (key: NavBadgeSourceKey) => badges[key]?.count ?? 0
  };
}
