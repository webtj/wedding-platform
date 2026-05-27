export type Tenant = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  _count?: { members: number; projects: number };
};

export type TenantFilters = { page?: number; limit?: number; search?: string; status?: string };

export type TenantResponse = {
  items: Tenant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TenantMutationPayload = {
  name?: string;
  description?: string;
  status?: string;
};
