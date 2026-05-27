import {
  createPlanPackageSchema,
  updatePlanPackageSchema,
  updateTenantSubscriptionSchema,
  upsertChannelBindingSchema,
  upsertPlatformSettingSchema
} from '@wedding/shared';

export const createPlanDtoSchema = createPlanPackageSchema;
export const updatePlanDtoSchema = updatePlanPackageSchema;
export const updateTenantSubscriptionDtoSchema = updateTenantSubscriptionSchema;
export const upsertPlatformSettingDtoSchema = upsertPlatformSettingSchema;
export const upsertChannelBindingDtoSchema = upsertChannelBindingSchema;
