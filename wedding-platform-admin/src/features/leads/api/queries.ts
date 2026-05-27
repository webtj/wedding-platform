import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getLeads, getLeadById, createLead, updateLead, deleteLead, convertLead } from './service';
import type { Lead, LeadFilters } from './types';

export type { Lead };

export const leadKeys = {
  all: ['leads'] as const,
  list: (filters: LeadFilters) => [...leadKeys.all, 'list', filters] as const,
  detail: (id: string) => [...leadKeys.all, 'detail', id] as const
};

export const leadsQueryOptions = (filters: LeadFilters) =>
  queryOptions({ queryKey: leadKeys.list(filters), queryFn: () => getLeads(filters) });

export const leadByIdOptions = (id: string) =>
  queryOptions({ queryKey: leadKeys.detail(id), queryFn: () => getLeadById(id) });

export const createLeadMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createLead>[0]) => createLead(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: leadKeys.all })
});

export const updateLeadMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateLead>[1] }) =>
    updateLead(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: leadKeys.all })
});

export const deleteLeadMutation = mutationOptions({
  mutationFn: (id: string) => deleteLead(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: leadKeys.all })
});

export const convertLeadMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
    convertLead(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: leadKeys.all })
});
