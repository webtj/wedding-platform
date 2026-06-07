import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getContracts, getContractById, updateContract, voidContract, deleteContract, reissueSignToken } from './service';
import { navBadgesKey } from '@/lib/api/nav-badges';
import type { Contract, ContractFilters, ContractMutationPayload } from './types';

export type { Contract };

export const contractKeys = {
  all: ['contracts'] as const,
  list: (filters: ContractFilters) => [...contractKeys.all, 'list', filters] as const,
  detail: (id: string) => [...contractKeys.all, 'detail', id] as const
};

export const contractsQueryOptions = (filters: ContractFilters) =>
  queryOptions({
    queryKey: contractKeys.list(filters),
    queryFn: () => getContracts(filters)
  });

export const contractByIdOptions = (id: string) =>
  queryOptions({
    queryKey: contractKeys.detail(id),
    queryFn: () => getContractById(id)
  });

export const updateContractMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: ContractMutationPayload }) =>
    updateContract(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: contractKeys.all })
});

export const deleteContractMutation = mutationOptions({
  mutationFn: (id: string) => deleteContract(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: contractKeys.all })
});

export const voidContractMutation = mutationOptions({
  mutationFn: (id: string) => voidContract(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: contractKeys.all })
});

export const reissueSignTokenMutation = mutationOptions({
  mutationFn: (id: string) => reissueSignToken(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: contractKeys.all })
});
