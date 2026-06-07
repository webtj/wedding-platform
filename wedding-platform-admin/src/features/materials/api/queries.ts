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

export type CreateMaterialInput = {
  categoryId: string;
  name: string;
  status?: 'available' | 'missing';
  quantity?: number;
  note?: string;
};

export const createMaterialMutation = mutationOptions({
  mutationFn: (d: CreateMaterialInput) => createMaterial(d),
  onSuccess: (_data, vars) => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: materialKeys.byCategory(vars.categoryId) });
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
