import { apiClient } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth/auth-storage';
import type {
  Contract,
  ContractFilters,
  ContractResponse,
  ContractMutationPayload,
  CreateContractPayload
} from './types';

export async function getContracts(filters: ContractFilters): Promise<ContractResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiClient<ContractResponse>(`/contracts${qs ? `?${qs}` : ''}`);
}

export async function exportContractsCsv(
  filters: Pick<ContractFilters, 'status' | 'search'>
): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api/contracts/export/csv${qs ? `?${qs}` : ''}`, {
    headers,
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export async function getContractById(id: string): Promise<Contract> {
  return apiClient<Contract>(`/contracts/${id}`);
}

export async function createContract(projectId: string, data: CreateContractPayload) {
  return apiClient<Contract>(`/projects/${projectId}/contracts`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createContractFromLead(leadId: string, data: Record<string, unknown>) {
  return apiClient<Contract>(`/leads/${leadId}/contract`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateContract(id: string, data: ContractMutationPayload) {
  return apiClient<Contract>(`/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function voidContract(contractId: string) {
  return apiClient<Contract>(`/contracts/${contractId}/void`, {
    method: 'POST'
  });
}

export async function deleteContract(id: string) {
  return apiClient<void>(`/contracts/${id}`, { method: 'DELETE' });
}
