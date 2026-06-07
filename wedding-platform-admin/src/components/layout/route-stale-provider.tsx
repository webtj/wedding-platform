'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getQueryClient } from '@/lib/query-client';
import { FRESH_ROUTES } from '@/config/query-freshness';

const STALE_FRESH = 0;
const STALE_DEFAULT = 0;

/**
 * 根据当前路由自动设置 QueryClient 的默认 staleTime。
 * - 当前所有路由 → staleTime: 0（每次进入强制刷新，性能优化专案再重新评估）
 *
 * 防御策略：
 * - render 阶段同步调用 setDefaultOptions（确保首屏 query 拿到正确 staleTime）
 * - useEffect 阶段再调 refetchQueries（兜底已缓存的旧 query）
 */
export function RouteStaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = getQueryClient();
  const prevFresh = useRef(false);

  const isFresh = FRESH_ROUTES.some((r) => pathname.startsWith(r));
  const target = isFresh ? STALE_FRESH : STALE_DEFAULT;

  // ── 同步：确保当前 render tree 内的 useQuery 全部拿到正确 staleTime ──
  queryClient.setDefaultOptions({ queries: { staleTime: target } });

  // ── 异步兜底：刚切到 fresh 路由时，强制重取已缓存的旧 query ──
  useEffect(() => {
    if (isFresh && !prevFresh.current) {
      // 首次进入 fresh 路由 → 强制刷新当前页面所有活跃 query
      queryClient.refetchQueries({ type: 'active' });
    }
    prevFresh.current = isFresh;
  }, [isFresh, queryClient]);

  return <>{children}</>;
}
