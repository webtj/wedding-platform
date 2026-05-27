import { queryOptions } from '@tanstack/react-query';
import { getFinanceSummary } from './service';

export const financeKeys = {
  all: ['finance'] as const,
  summary: () => [...financeKeys.all, 'summary'] as const
};

export const financeSummaryOptions = () =>
  queryOptions({
    queryKey: financeKeys.summary(),
    queryFn: () => getFinanceSummary()
  });
