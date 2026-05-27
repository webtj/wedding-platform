import { apiClient } from '@/lib/api-client';
import type { Lead, LeadFilters, LeadResponse, LeadMutationPayload } from './types';

export async function getLeads(filters: LeadFilters): Promise<LeadResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('pageSize', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiClient<LeadResponse>(`/leads${qs ? `?${qs}` : ''}`);
}

export async function getLeadById(id: string): Promise<Lead> {
  return apiClient<Lead>(`/leads/${id}`);
}

export async function createLead(data: LeadMutationPayload) {
  return apiClient<Lead>('/leads', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateLead(id: string, data: LeadMutationPayload) {
  return apiClient<Lead>(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteLead(id: string) {
  return apiClient<{ id: string; deleted: boolean }>(`/leads/${id}`, {
    method: 'DELETE'
  });
}

export async function convertLead(id: string, data: Record<string, unknown>) {
  return apiClient<{ projectId: string }>(`/leads/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
