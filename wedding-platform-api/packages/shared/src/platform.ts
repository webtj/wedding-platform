import { z } from 'zod';

export const PLAN_PACKAGE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  RETIRED: 'retired'
} as const;

export const TENANT_SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELED: 'canceled'
} as const;

export const BILLING_CYCLE = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  MANUAL: 'manual'
} as const;

export const PLATFORM_CHANNEL_TYPE = {
  WEB: 'web',
  WECHAT_MINI: 'wechat_mini',
  DOUYIN_MINI: 'douyin_mini'
} as const;

export const PLATFORM_CHANNEL_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  DISABLED: 'disabled'
} as const;

export const VENDOR_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  DISABLED: 'disabled'
} as const;

export const VENDOR_CATEGORY = {
  VENUE: 'venue',
  FLORAL: 'floral',
  PHOTO_VIDEO: 'photo_video',
  MAKEUP: 'makeup',
  PRODUCTION: 'production',
  HOST: 'host',
  OTHER: 'other'
} as const;

export const PUBLIC_CASE_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const;

export type PlanPackageStatus = (typeof PLAN_PACKAGE_STATUS)[keyof typeof PLAN_PACKAGE_STATUS];
export type TenantSubscriptionStatus = (typeof TENANT_SUBSCRIPTION_STATUS)[keyof typeof TENANT_SUBSCRIPTION_STATUS];
export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];
export type PlatformChannelType = (typeof PLATFORM_CHANNEL_TYPE)[keyof typeof PLATFORM_CHANNEL_TYPE];
export type PlatformChannelStatus = (typeof PLATFORM_CHANNEL_STATUS)[keyof typeof PLATFORM_CHANNEL_STATUS];
export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS];
export type VendorCategory = (typeof VENDOR_CATEGORY)[keyof typeof VENDOR_CATEGORY];
export type PublicCaseStatus = (typeof PUBLIC_CASE_STATUS)[keyof typeof PUBLIC_CASE_STATUS];

const featureSchema = z.enum([
  'crm',
  'project',
  'task',
  'contract',
  'finance',
  'timeline',
  'asset',
  'archive',
  'ai',
  'mini_program',
  'vendor',
  'public_case'
]);

export const createPlanPackageSchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  monthlyPriceCents: z.number().int().min(0).max(999999999),
  yearlyPriceCents: z.number().int().min(0).max(999999999),
  maxProjects: z.number().int().min(1).max(100000),
  maxMembers: z.number().int().min(1).max(10000),
  storageGb: z.number().int().min(1).max(100000),
  aiCreditsMonthly: z.number().int().min(0).max(10000000),
  features: z.array(featureSchema).min(1),
  status: z.nativeEnum(PLAN_PACKAGE_STATUS).default(PLAN_PACKAGE_STATUS.DRAFT),
  sortOrder: z.number().int().min(0).max(9999).default(100)
});

export const updatePlanPackageSchema = createPlanPackageSchema.partial().extend({
  status: z.nativeEnum(PLAN_PACKAGE_STATUS).optional()
});

export const updateTenantSubscriptionSchema = z.object({
  planPackageId: z.string().trim().min(1),
  billingCycle: z.nativeEnum(BILLING_CYCLE),
  status: z.nativeEnum(TENANT_SUBSCRIPTION_STATUS),
  startsAt: z.string().datetime(),
  renewsAt: z.string().datetime().optional(),
  canceledAt: z.string().datetime().optional()
});

export const upsertPlatformSettingSchema = z.object({
  group: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  value: z.record(z.string(), z.unknown())
});

export const upsertChannelBindingSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  channel: z.nativeEnum(PLATFORM_CHANNEL_TYPE),
  name: z.string().trim().min(1).max(120),
  appId: z.string().trim().min(1).max(120),
  status: z.nativeEnum(PLATFORM_CHANNEL_STATUS).default(PLATFORM_CHANNEL_STATUS.DRAFT),
  config: z.record(z.string(), z.unknown()).default({})
});

export const miniSessionSchema = z.object({
  channel: z.enum([PLATFORM_CHANNEL_TYPE.WECHAT_MINI, PLATFORM_CHANNEL_TYPE.DOUYIN_MINI]),
  tenantId: z.string().min(1),
  code: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(80).optional()
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.nativeEnum(VENDOR_CATEGORY),
  city: z.string().trim().min(1).max(80),
  contactName: z.string().trim().max(80).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([])
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.nativeEnum(VENDOR_STATUS).optional()
});

export const createPublicCaseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(20000),
  coverAssetId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(PUBLIC_CASE_STATUS).default(PUBLIC_CASE_STATUS.DRAFT)
});

export const updatePublicCaseSchema = createPublicCaseSchema.partial().extend({
  status: z.nativeEnum(PUBLIC_CASE_STATUS).optional()
});

export type CreatePlanPackageInput = z.infer<typeof createPlanPackageSchema>;
export type UpdatePlanPackageInput = z.infer<typeof updatePlanPackageSchema>;
export type UpdateTenantSubscriptionInput = z.infer<typeof updateTenantSubscriptionSchema>;
export type UpsertPlatformSettingInput = z.infer<typeof upsertPlatformSettingSchema>;
export type UpsertChannelBindingInput = z.infer<typeof upsertChannelBindingSchema>;
export type MiniSessionInput = z.infer<typeof miniSessionSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreatePublicCaseInput = z.infer<typeof createPublicCaseSchema>;
export type UpdatePublicCaseInput = z.infer<typeof updatePublicCaseSchema>;
