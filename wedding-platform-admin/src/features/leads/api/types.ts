export type Lead = {
  id: string;
  leadNo: string;
  name: string;
  phone: string | null;
  email: string | null;
  sourceChannel: string;
  status: string;
  weddingDate: string | null;
  budgetCents: number | null;
  note: string | null;
  consultationTime: string | null;
  lostReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { displayName: string } | null;
  convertedProject?: { id: string } | null;
  contract?: { id: string; contractNo: string } | null;
};

export type LeadFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
};

export type LeadResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LeadMutationPayload = {
  name?: string;
  phone?: string;
  email?: string;
  sourceChannel?: string;
  status?: string;
  weddingDate?: string;
  budgetCents?: number;
  note?: string;
  consultationTime?: string;
  lostReason?: string;
};
