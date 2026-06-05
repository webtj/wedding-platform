import { createMaterialTypeSchema, updateMaterialTypeSchema } from '@wedding/shared';

export { createMaterialTypeSchema, updateMaterialTypeSchema };
export type CreateMaterialTypeDto = typeof createMaterialTypeSchema._type;
export type UpdateMaterialTypeDto = typeof updateMaterialTypeSchema._type;
