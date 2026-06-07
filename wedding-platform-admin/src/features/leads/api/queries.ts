import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getLeads, getLeadById, createLead, updateLead, deleteLead, convertLead, addLeadFollowup } from './service';
import { navBadgesKey } from '@/lib/api/nav-badges';
import type { Lead, LeadFilters, LeadResponse } from './types';

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
  onMutate: async ({ id, data }) => {
    const queryClient = getQueryClient();
    await queryClient.cancelQueries({ queryKey: leadKeys.all });
    const previousLeads = queryClient.getQueriesData<LeadResponse>({ queryKey: leadKeys.all });
    queryClient.setQueriesData<LeadResponse>({ queryKey: leadKeys.all }, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((lead) => (lead.id === id ? { ...lead, ...data } : lead))
      };
    });
    return { previousLeads };
  },
  onError: (_err, _vars, context) => {
    const queryClient = getQueryClient();
    if (context?.previousLeads) {
      for (const [key, data] of context.previousLeads) {
        queryClient.setQueryData(key, data);
      }
    }
  },
  onSettled: () => getQueryClient().invalidateQueries({ queryKey: leadKeys.all })
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

export const addFollowupMutation = mutationOptions({
  mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
    addLeadFollowup(leadId, { content }),
  onSuccess: (_data, vars) => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: leadKeys.detail(vars.leadId) });
    qc.invalidateQueries({ queryKey: leadKeys.all });
    qc.invalidateQueries({ queryKey: navBadgesKey });
  }
});
