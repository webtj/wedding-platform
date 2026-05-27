import {
  createLeadFollowupSchema,
  createLeadSchema,
  updateLeadSchema,
  convertLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
  type CreateLeadFollowupInput,
  type ConvertLeadInput
} from '@wedding/shared';

export { createLeadSchema, updateLeadSchema, createLeadFollowupSchema, convertLeadSchema };

export type CreateLeadDto = CreateLeadInput;
export type UpdateLeadDto = UpdateLeadInput;
export type CreateLeadFollowupDto = CreateLeadFollowupInput;
export type ConvertLeadDto = ConvertLeadInput;
