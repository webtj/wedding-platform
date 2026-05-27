export type Contract = {
  id: string;
  contractNo: string;
  title: string;
  amountCents: number;
  depositCents?: number | null;
  status: string;
  brideName?: string | null;
  groomName?: string | null;
  phone?: string | null;
  weddingDate?: string | null;
  venue?: string | null;
  serviceContent?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  note?: string | null;
  project?: {
    id: string;
    projectNo: string;
    brideName?: string | null;
    groomName?: string | null;
  } | null;
  lead?: { id: string; leadNo: string; name: string; phone?: string | null } | null;
  signToken?: string | null;
  signatureData?: string | null;
  signedAt?: string | null;
  updatedAt?: string;
  payments?: {
    id: string;
    amountCents: number;
    status: string;
    method?: string | null;
    paidAt?: string | null;
    note?: string | null;
  }[];
};

export type ContractFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
};

export type ContractResponse = {
  items: Contract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ContractMutationPayload = {
  contractNo?: string;
  title?: string;
  amountCents?: number;
  status?: string;
  brideName?: string;
  groomName?: string;
  phone?: string;
  venue?: string;
  serviceContent?: string;
  companyName?: string;
  companyAddress?: string;
  note?: string;
};

export type CreateContractPayload = {
  contractNo: string;
  title: string;
  amountCents: number;
};

export type CreatePaymentPayload = {
  amountCents: number;
  method: string;
  note?: string;
};
