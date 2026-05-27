import {
  createAnnotationSchema,
  createAssetUploadIntentSchema,
  updateAnnotationSchema,
  type CreateAnnotationInput,
  type CreateAssetUploadIntentInput,
  type UpdateAnnotationInput
} from '@wedding/shared';

export { createAssetUploadIntentSchema, createAnnotationSchema, updateAnnotationSchema };
export type CreateAssetUploadIntentDto = CreateAssetUploadIntentInput;
export type CreateAnnotationDto = CreateAnnotationInput;
export type UpdateAnnotationDto = UpdateAnnotationInput;
