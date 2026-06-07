export type TeamMember = {
  id: string;
  displayName: string;
  status: string;
  user: {
    id: string;
    displayName: string;
    authAccounts?: { identifier: string }[];
  };
  roles: { role: { id: string; code: string; name: string } }[];
};

export type TeamAccountFilters = {
  page?: number;
  limit?: number;
  search?: string;
  roleCode?: string;
};

export type TeamAccountResponse = {
  items: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TeamFilterOptions = {
  roles: { id: string; code: string; name: string }[];
};
