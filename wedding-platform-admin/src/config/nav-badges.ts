/**
 * Navigation badge registry.
 *
 * Each entry maps a backend source key (returned by GET /nav-badges) to a
 * menu item URL. The Sidebar uses this to display the count + red dot.
 *
 * To add a new badge:
 * 1. Add the source to NavBadgesService.getAll() in the backend
 * 2. Add an entry here
 * 3. The sidebar will auto-display it for any nav item matching `url`
 *
 * No sidebar code changes required.
 */
export const NAV_BADGE_SOURCES = {
  'leads-needs-followup': { url: '/studio/leads', label: '待跟进' },
  'contracts-pending-sign': { url: '/studio/contracts', label: '待签' }
} as const;

export type NavBadgeSourceKey = keyof typeof NAV_BADGE_SOURCES;

export const URL_TO_BADGE = Object.fromEntries(
  Object.entries(NAV_BADGE_SOURCES).map(([k, v]) => [v.url, k as NavBadgeSourceKey])
) as Record<string, NavBadgeSourceKey>;

export function badgeForUrl(url: string): NavBadgeSourceKey | undefined {
  return URL_TO_BADGE[url];
}
