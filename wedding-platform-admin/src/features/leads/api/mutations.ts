import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createLead, updateLead, deleteLead, convertLead } from './service';
import { leadKeys } from './queries';
import type { LeadMutationPayload } from './types';

export const createLeadMutation = mutationOptions({
  mutationFn: (data: LeadMutationPayload) => createLead(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: leadKeys.all });
  }
});

export const updateLeadMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: LeadMutationPayload }) =>
    updateLead(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: leadKeys.all });
  }
});

export const deleteLeadMutation = mutationOptions({
  mutationFn: (id: string) => deleteLead(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: leadKeys.all });
  }
});

export const convertLeadMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
    convertLead(id, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: leadKeys.all });
  }
});
