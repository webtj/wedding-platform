import {
  createConfirmationSchema,
  respondConfirmationSchema,
  type CreateConfirmationInput,
  type RespondConfirmationInput
} from '@wedding/shared';

export { createConfirmationSchema, respondConfirmationSchema };
export type CreateConfirmationDto = CreateConfirmationInput;
export type RespondConfirmationDto = RespondConfirmationInput;
