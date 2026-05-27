import { queryOptions } from '@tanstack/react-query';
import { getTenants, getTenantById } from './service';
import type { Tenant, TenantFilters } from './types';

export type { Tenant };

export const tenantKeys = {
  all: ['tenants'] as const,
  list: (filters: TenantFilters) => [...tenantKeys.all, 'list', filters] as const,
  detail: (id: string) => [...tenantKeys.all, 'detail', id] as const
};

export const tenantsQueryOptions = (filters: TenantFilters) =>
  queryOptions({ queryKey: tenantKeys.list(filters), queryFn: () => getTenants(filters) });

export const tenantByIdOptions = (id: string) =>
  queryOptions({ queryKey: tenantKeys.detail(id), queryFn: () => getTenantById(id) });
