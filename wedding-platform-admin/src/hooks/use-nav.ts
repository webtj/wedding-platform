'use client';

/**
 * Client-side hook for filtering navigation items based on permissions.
 *
 * Menus from the backend are already scoped (platform vs tenant), so this
 * hook only applies additional access checks when `item.access` is set
 * on static/kbar nav items. Permission and role checks use the auth
 * context (backed by /api/identity/me) instead of Clerk hooks.
 *
 * Performance: all checks are synchronous, no server calls, no loading states.
 *
 * Note: For actual security (API routes, server actions), always use server-side checks.
 * This is only for UI visibility.
 */

import { useMemo } from 'react';
import { useAuthContext } from '@/lib/auth/auth-context';
import type { NavItem, NavGroup } from '@/types';

/**
 * Hook to filter navigation items based on RBAC (fully client-side)
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items
 */
export function useFilteredNavItems(items: NavItem[]) {
  const { permissions, membership, orgId, isPlatformAdmin } = useAuthContext();

  const accessContext = useMemo(
    () => ({
      permissions,
      role: membership?.role,
      // Platform admins live in /admin/* and have no orgId by design (privacy
      // boundary). They have permissions=['*'] and should always satisfy
      // `requireOrg`/`permission`/`role` checks regardless of orgId.
      hasOrg: !!orgId || isPlatformAdmin
    }),
    [permissions, membership?.role, orgId, isPlatformAdmin]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (!item.access) return true;

        if (item.access.requireOrg && !accessContext.hasOrg) return false;

        if (item.access.permission) {
          if (!accessContext.hasOrg) return false;
          if (
            !accessContext.permissions.includes(item.access.permission) &&
            !accessContext.permissions.includes('*')
          ) {
            return false;
          }
        }

        if (item.access.role) {
          if (!accessContext.hasOrg) return false;
          if (accessContext.role !== item.access.role) return false;
        }

        return true;
      })
      .map((item) => {
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((childItem) => {
            if (!childItem.access) return true;

            if (childItem.access.requireOrg && !accessContext.hasOrg) return false;

            if (childItem.access.permission) {
              if (!accessContext.hasOrg) return false;
              if (
                !accessContext.permissions.includes(childItem.access.permission) &&
                !accessContext.permissions.includes('*')
              ) {
                return false;
              }
            }

            if (childItem.access.role) {
              if (!accessContext.hasOrg) return false;
              if (accessContext.role !== childItem.access.role) return false;
            }

            return true;
          });

          return { ...item, items: filteredChildren };
        }

        return item;
      });
  }, [items, accessContext]);

  return filteredItems;
}

/**
 * Hook to filter navigation groups based on RBAC (fully client-side)
 *
 * @param groups - Array of navigation groups to filter
 * @returns Filtered groups (empty groups are removed)
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some((gi) => gi.title === item.title && filteredSet.has(gi.title))
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filteredItems]);
}
