export type FinanceSummary = {
  totalContractAmount: number;
  totalPaid: number;
  totalReceivable: number;
  totalExpenses: number;
  profit: number;
  projectCount: number;
  contractCount: number;
};

export type FinanceFilters = {
  page?: number;
  limit?: number;
};

export type FinanceResponse = FinanceSummary;
