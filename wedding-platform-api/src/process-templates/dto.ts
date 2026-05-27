import {
  createProcessTemplateSchema, updateProcessTemplateSchema,
  createTemplateStageSchema, updateTemplateStageSchema,
  createTemplateTaskSchema, updateTemplateTaskSchema,
  createChecklistItemSchema,
  type CreateProcessTemplateInput, type UpdateProcessTemplateInput,
  type CreateTemplateStageInput, type UpdateTemplateStageInput,
  type CreateTemplateTaskInput, type UpdateTemplateTaskInput,
  type CreateChecklistItemInput
} from '@wedding/shared';

export {
  createProcessTemplateSchema, updateProcessTemplateSchema,
  createTemplateStageSchema, updateTemplateStageSchema,
  createTemplateTaskSchema, updateTemplateTaskSchema,
  createChecklistItemSchema
};
export type CreateProcessTemplateDto = CreateProcessTemplateInput;
export type UpdateProcessTemplateDto = UpdateProcessTemplateInput;
export type CreateTemplateStageDto = CreateTemplateStageInput;
export type UpdateTemplateStageDto = UpdateTemplateStageInput;
export type CreateTemplateTaskDto = CreateTemplateTaskInput;
export type UpdateTemplateTaskDto = UpdateTemplateTaskInput;
export type CreateChecklistItemDto = CreateChecklistItemInput;
