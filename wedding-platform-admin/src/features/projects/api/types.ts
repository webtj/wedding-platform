export type Project = {
  id: string;
  projectNo: string;
  brideName: string | null;
  groomName: string | null;
  weddingDate: string | null;
  ceremonyType?: string | null;
  venue: string | null;
  guestCount: number | null;
  guestCountFinal?: number | null;
  colorTheme?: string | null;
  style: string | null;
  status: string;
  contracts?: { id: string; contractNo: string }[];
  lead?: { id: string; leadNo: string; name: string } | null;
  planner?: { id: string; displayName: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
};

export type ProjectResponse = {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProjectMutationPayload = {
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
  ceremonyType?: string;
  venue?: string;
  guestCount?: number;
  guestCountFinal?: number;
  colorTheme?: string;
  style?: string;
  specialRequirements?: string;
  plannerId?: string;
  status?: string;
};
