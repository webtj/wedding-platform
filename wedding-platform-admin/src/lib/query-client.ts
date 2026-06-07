import {
  QueryClient,
  QueryCache,
  MutationCache,
  defaultShouldDehydrateQuery,
  isServer
} from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

/**
 * Global 403 bridge: any useQuery or useMutation that throws a
 * PERMISSION_DENIED is routed to the ForbiddenProvider panel via a window
 * event. Components do NOT need to wrap with QueryErrorBoundary — this is
 * the single place that turns API 403s into UI, alongside the manual
 * dispatch in api-client.ts for non-React callers.
 */
function dispatchForbiddenFromError(err: unknown, source: 'query' | 'mutation') {
  if (typeof window === 'undefined') return;
  if (!(err instanceof ApiError) || err.statusCode !== 403) return;
  const details = err.details as
    | { requiredPermissions?: string[]; resource?: string }
    | undefined;
  window.dispatchEvent(
    new CustomEvent('app:forbidden', {
      detail: {
        requiredPermissions: details?.requiredPermissions,
        resource: details?.resource,
        source,
        message: err.message
      }
    })
  );
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
      }
    },
    queryCache: new QueryCache({
      onError: (err) => dispatchForbiddenFromError(err, 'query')
    }),
    mutationCache: new MutationCache({
      onError: (err) => dispatchForbiddenFromError(err, 'mutation')
    })
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
