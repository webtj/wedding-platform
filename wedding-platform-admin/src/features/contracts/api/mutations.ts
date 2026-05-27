import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createContract, updateContract, addPayment } from './service';
import { contractKeys } from './queries';
import type { CreateContractPayload, CreatePaymentPayload } from './types';

export const createContractMutation = mutationOptions({
  mutationFn: ({ projectId, data }: { projectId: string; data: CreateContractPayload }) =>
    createContract(projectId, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: contractKeys.all });
  }
});

export const updateContractMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: { status?: string } }) =>
    updateContract(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: contractKeys.all });
  }
});

export const addPaymentMutation = mutationOptions({
  mutationFn: ({ contractId, data }: { contractId: string; data: CreatePaymentPayload }) =>
    addPayment(contractId, data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: contractKeys.all });
  }
});
