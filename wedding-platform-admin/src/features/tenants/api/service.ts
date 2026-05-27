import { apiClient } from '@/lib/api-client';
import type { Tenant, TenantFilters, TenantResponse, TenantMutationPayload } from './types';

export async function getTenants(filters: TenantFilters): Promise<TenantResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return apiClient<TenantResponse>(`/super/tenants${qs ? `?${qs}` : ''}`);
}

export async function getTenantById(id: string): Promise<Tenant> {
  return apiClient<Tenant>(`/super/tenants/${id}`);
}

export async function createTenant(data: { name: string; description?: string }) {
  return apiClient<Tenant>('/super/tenants', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateTenant(id: string, data: TenantMutationPayload) {
  return apiClient<Tenant>(`/super/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTenant(id: string) {
  return apiClient<void>(`/super/tenants/${id}`, { method: 'DELETE' });
}
