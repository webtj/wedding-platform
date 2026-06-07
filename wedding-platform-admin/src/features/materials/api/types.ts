export type MaterialCategory = {
  id: string;
  name: string;
  sortOrder: number;
  materials?: Material[];
  _count?: { materials: number };
};

export type Material = {
  id: string;
  categoryId: string;
  name: string;
  status: 'available' | 'missing';
  quantity?: number | null;
  note?: string | null;
  sortOrder: number;
};

export type TaskMaterial = {
  id: string;
  taskId: string;
  materialId: string;
  confirmed: boolean;
  material?: Material;
};
