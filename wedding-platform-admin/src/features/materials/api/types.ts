export type MaterialCategory = {
  id: string;
  tenantId: string | null;
  name: string;
  sortOrder: number;
  materials?: Material[];
  _count?: { materials: number };
};

export type Material = {
  id: string;
  tenantId: string | null;
  categoryId: string;
  name: string;
  status: 'available' | 'missing';
  quantity?: number | null;
  note?: string | null;
  sortOrder: number;
};

/** Built-in items (tenantId=null) are platform-managed and read-only for tenants */
export function isBuiltIn(item: { tenantId: string | null }): boolean {
  return item.tenantId === null;
}

export type TaskMaterial = {
  id: string;
  taskId: string;
  materialId: string;
  confirmed: boolean;
  material?: Material;
};
