import { apiClient } from '@/lib/api-client';
import type {
  MaterialType,
  Tenant,
  PagedMaterialTypesResponse,
  CreateMaterialTypePayload,
  UpdateMaterialTypePayload,
  ManagerMode,
} from './types';

function getApiBase(mode: ManagerMode): string {
  return mode === 'super' ? '/super/material-types' : '/material-types';
}

export async function getMaterialTypes(
  mode: ManagerMode,
  params: { page: number; pageSize: number; tenantId?: string; search?: string }
): Promise<PagedMaterialTypesResponse> {
  const apiBase = getApiBase(mode);
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.tenantId) searchParams.set('tenantId', params.tenantId);
  if (params.search) searchParams.set('search', params.search);
  return apiClient<PagedMaterialTypesResponse>(`${apiBase}?${searchParams}`);
}

export async function createMaterialType(
  mode: ManagerMode,
  data: CreateMaterialTypePayload
): Promise<MaterialType> {
  const apiBase = getApiBase(mode);
  return apiClient<MaterialType>(apiBase, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMaterialType(
  mode: ManagerMode,
  id: string,
  data: UpdateMaterialTypePayload
): Promise<MaterialType> {
  const apiBase = getApiBase(mode);
  return apiClient<MaterialType>(`${apiBase}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMaterialType(
  mode: ManagerMode,
  id: string
): Promise<void> {
  const apiBase = getApiBase(mode);
  await apiClient(`${apiBase}/${id}`, { method: 'DELETE' });
}

export async function getTenants(): Promise<{ items: Tenant[] }> {
  return apiClient<{ items: Tenant[] }>('/super/tenants?pageSize=1000');
}
