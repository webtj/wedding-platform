import { describe, expect, it } from 'vitest';
import {
  createPlanPackageSchema,
  miniSessionSchema,
  PLATFORM_CHANNEL_TYPE,
  updateTenantSubscriptionSchema,
  upsertPlatformSettingSchema
} from './platform';

describe('platform contracts', () => {
  it('validates plan package limits', () => {
    const value = createPlanPackageSchema.parse({
      code: 'growth',
      name: '成长版',
      monthlyPriceCents: 199900,
      yearlyPriceCents: 1999000,
      maxProjects: 80,
      maxMembers: 12,
      storageGb: 200,
      aiCreditsMonthly: 2000,
      features: ['crm', 'timeline', 'archive']
    });

    expect(value.code).toBe('growth');
    expect(value.features).toContain('archive');
  });

  it('validates tenant subscription input', () => {
    const value = updateTenantSubscriptionSchema.parse({
      planPackageId: 'plan_1',
      billingCycle: 'monthly',
      status: 'active',
      startsAt: '2026-05-23T00:00:00.000Z',
      renewsAt: '2026-06-23T00:00:00.000Z'
    });

    expect(value.status).toBe('active');
  });

  it('validates mini session channels', () => {
    const value = miniSessionSchema.parse({
      channel: PLATFORM_CHANNEL_TYPE.WECHAT_MINI,
      code: 'dev-openid-001'
    });

    expect(value.channel).toBe('wechat_mini');
  });

  it('validates platform setting JSON value', () => {
    const value = upsertPlatformSettingSchema.parse({
      group: 'notification',
      label: '短信服务',
      value: { provider: 'disabled', signName: '婚礼平台' }
    });

    expect(value.value).toEqual({ provider: 'disabled', signName: '婚礼平台' });
  });
});
