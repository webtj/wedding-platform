import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createMaterial,
  updateMaterial,
  deleteMaterial
} from './service';
import type { Material } from './types';

export const categoryKeys = {
  all: ['material-categories'] as const
};

export const categoriesQueryOptions = () =>
  queryOptions({ queryKey: categoryKeys.all, queryFn: getCategories });

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
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});

export const createMaterialMutation = mutationOptions({
  mutationFn: (d: CreateMaterialInput) => createMaterial(d),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});

type ToggleContext = { previous: Material[] | undefined };

export const toggleMaterialStatusMutation = mutationOptions<
  Material,
  Error,
  { id: string; categoryId: string; nextStatus: 'available' | 'missing' },
  ToggleContext
>({
  mutationFn: ({ id, nextStatus }) => updateMaterial(id, { status: nextStatus }),
  onMutate: async ({ id, categoryId, nextStatus }) => {
    const qc = getQueryClient();
    await qc.cancelQueries({ queryKey: categoryKeys.all });
    const categories = qc.getQueryData<import('./types').MaterialCategory[]>(categoryKeys.all);
    if (categories) {
      const updated = categories.map((cat) => {
        if (cat.id !== categoryId || !cat.materials) return cat;
        return {
          ...cat,
          materials: cat.materials.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
        };
      });
      qc.setQueryData(categoryKeys.all, updated);
    }
    return { previous: categories?.flatMap((c) => c.materials ?? []) };
  },
  onError: () => {
    getQueryClient().invalidateQueries({ queryKey: categoryKeys.all });
  },
  onSettled: () => {
    getQueryClient().invalidateQueries({ queryKey: categoryKeys.all });
  }
});

export const updateMaterialMutation = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) => updateMaterial(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});

export const deleteMaterialMutation = mutationOptions({
  mutationFn: (id: string) => deleteMaterial(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: categoryKeys.all })
});
