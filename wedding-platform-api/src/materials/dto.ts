import {
  createMaterialCategorySchema, updateMaterialCategorySchema,
  createMaterialSchema, updateMaterialSchema,
  linkTaskMaterialSchema, confirmTaskMaterialSchema,
  type CreateMaterialCategoryInput, type UpdateMaterialCategoryInput,
  type CreateMaterialInput, type UpdateMaterialInput,
  type LinkTaskMaterialInput, type ConfirmTaskMaterialInput
} from '@wedding/shared';

export {
  createMaterialCategorySchema, updateMaterialCategorySchema,
  createMaterialSchema, updateMaterialSchema,
  linkTaskMaterialSchema, confirmTaskMaterialSchema
};
export type CreateMaterialCategoryDto = CreateMaterialCategoryInput;
export type UpdateMaterialCategoryDto = UpdateMaterialCategoryInput;
export type CreateMaterialDto = CreateMaterialInput;
export type UpdateMaterialDto = UpdateMaterialInput;
export type LinkTaskMaterialDto = LinkTaskMaterialInput;
export type ConfirmTaskMaterialDto = ConfirmTaskMaterialInput;
