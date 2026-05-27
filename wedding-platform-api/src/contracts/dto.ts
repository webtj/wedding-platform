import {
  createContractItemSchema,
  createContractSchema,
  createPaymentRecordSchema,
  updateContractSchema,
  type CreateContractInput,
  type CreateContractItemInput,
  type CreatePaymentRecordInput,
  type UpdateContractInput
} from '@wedding/shared';

export { createContractSchema, updateContractSchema, createContractItemSchema, createPaymentRecordSchema };
export type CreateContractDto = CreateContractInput;
export type UpdateContractDto = UpdateContractInput;
export type CreateContractItemDto = CreateContractItemInput;
export type CreatePaymentRecordDto = CreatePaymentRecordInput;
