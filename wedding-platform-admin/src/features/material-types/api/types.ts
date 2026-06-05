export interface SizeOption {
  width: number;
  height: number;
}

export interface MaterialType {
  id: string;
  name: string;
  code: string;
  icon: string;
  defaultSize: { width: number; height: number } | null;
  sizes: SizeOption[] | null;
  isSystem: boolean;
  tenantId: string | null;
  tenant?: { id: string; name: string } | null;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface PagedMaterialTypesResponse {
  items: MaterialType[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateMaterialTypePayload {
  name: string;
  code: string;
  icon: string;
  defaultSize: SizeOption;
  sizes: SizeOption[];
}

export interface UpdateMaterialTypePayload {
  name: string;
  icon: string;
  defaultSize: SizeOption;
  sizes: SizeOption[];
}

export type ManagerMode = 'super' | 'tenant';
