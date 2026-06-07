import { z } from 'zod';

export const createQuickPromptCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().optional()
});

export const updateQuickPromptCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.number().int().optional()
});

export const createQuickPromptSchema = z.object({
  categoryId: z.string(),
  name: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(2000),
  sortOrder: z.number().int().optional()
});

export const updateQuickPromptSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(1).max(2000).optional(),
  sortOrder: z.number().int().optional()
});

export type CreateQuickPromptCategoryDto = z.infer<typeof createQuickPromptCategorySchema>;
export type UpdateQuickPromptCategoryDto = z.infer<typeof updateQuickPromptCategorySchema>;
export type CreateQuickPromptDto = z.infer<typeof createQuickPromptSchema>;
export type UpdateQuickPromptDto = z.infer<typeof updateQuickPromptSchema>;
