import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial
} from './service';
import type { Material } from './types';

export const categoryKeys = {
  all: ['material-categories'] as const
};

export const materialKeys = {
  all: ['materials'] as const,
  byCategory: (categoryId: string) => [...materialKeys.all, categoryId] as const
};

export const categoriesQueryOptions = () =>
  queryOptions({ queryKey: categoryKeys.all, queryFn: getCategories });

export const materialsByCategoryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: materialKeys.byCategory(categoryId),
    queryFn: () => getMaterials(categoryId)
  });

export type CreateMaterialInput = {
  categoryId: string;
  name: string;
  status?: 'available' | 'missing';
  quantity?: number;
  note?: string;
};

export const createCategoryMutation = mutationOptions({
  mutationFn: (d: Parameters<typeof createCategory>[0]) => createCategory(d),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});

export const updateCategoryMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) =>
    updateCategory(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});

export const deleteCategoryMutation = mutationOptions({
  mutationFn: (id: string) => deleteCategory(id),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: categoryKeys.all });
    qc.invalidateQueries({ queryKey: materialKeys.all });
  }
});

export const createMaterialMutation = mutationOptions({
  mutationFn: (d: CreateMaterialInput) => createMaterial(d),
  onSuccess: (_data, vars) => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: materialKeys.byCategory(vars.categoryId) });
  }
});

type ToggleContext = { previous: { items: Material[]; total: number } | undefined };

export const toggleMaterialStatusMutation = mutationOptions<
  Material,
  Error,
  { id: string; categoryId: string; nextStatus: 'available' | 'missing' },
  ToggleContext
>({
  mutationFn: ({ id, nextStatus }) => updateMaterial(id, { status: nextStatus }),
  onMutate: async ({ id, categoryId, nextStatus }) => {
    const qc = getQueryClient();
    const key = materialKeys.byCategory(categoryId);
    await qc.cancelQueries({ queryKey: key });
    const previous = qc.getQueryData<{ items: Material[]; total: number }>(key);
    if (previous) {
      qc.setQueryData<{ items: Material[]; total: number }>(key, {
        ...previous,
        items: previous.items.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
      });
    }
    return { previous };
  },
  onError: (_err, { categoryId }, ctx) => {
    if (ctx?.previous) {
      getQueryClient().setQueryData(materialKeys.byCategory(categoryId), ctx.previous);
    }
  },
  onSettled: (_data, _err, { categoryId }) => {
    getQueryClient().invalidateQueries({ queryKey: materialKeys.byCategory(categoryId) });
  }
});

export const updateMaterialMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) => updateMaterial(id, data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: materialKeys.all });
    qc.invalidateQueries({ queryKey: categoryKeys.all });
  }
});

export const deleteMaterialMutation = mutationOptions({
  mutationFn: (id: string) => deleteMaterial(id),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: materialKeys.all });
    qc.invalidateQueries({ queryKey: categoryKeys.all });
  }
});
