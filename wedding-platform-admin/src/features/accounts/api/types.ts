export type Account = {
  id: string;
  displayName: string;
  status: string;
  isPlatformAdmin: boolean;
  authAccounts?: { identifier: string }[];
  tenantMembers?: {
    id: string;
    tenant: { id: string; name: string };
    roles: { role: { id: string; code: string; name: string } }[];
  }[];
};

export type AccountFilters = {
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
  roleCode?: string;
};

export type AccountResponse = {
  items: Account[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FilterOptions = {
  tenants: { id: string; name: string }[];
  roles: { id: string; code: string; name: string }[];
};
