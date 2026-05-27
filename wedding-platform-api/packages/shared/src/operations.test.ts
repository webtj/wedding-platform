import { describe, expect, it } from 'vitest';
import {
  createContractSchema,
  createPaymentRecordSchema,
  createProjectExpenseSchema,
  createTenantRoleSchema,
  updateProjectSchema
} from './business';

describe('M5 operation schemas', () => {
  it('accepts a contract ledger entry', () => {
    expect(
      createContractSchema.parse({
        contractNo: 'HT-2026-001',
        title: '李想周安婚礼策划服务合同',
        amountCents: 18800000
      })
    ).toMatchObject({ contractNo: 'HT-2026-001' });
  });

  it('rejects a zero payment amount', () => {
    expect(() =>
      createPaymentRecordSchema.parse({
        amountCents: 0,
        paidAt: '2026-05-23T10:00:00.000Z',
        method: 'bank_transfer'
      })
    ).toThrow();
  });

  it('accepts a project expense', () => {
    expect(
      createProjectExpenseSchema.parse({
        category: 'floral',
        title: '主仪式区花艺定金',
        amountCents: 1200000,
        spentAt: '2026-05-23T10:00:00.000Z'
      })
    ).toMatchObject({ category: 'floral' });
  });

  it('accepts project operational updates', () => {
    expect(updateProjectSchema.parse({ status: 'active', venue: '西湖草坪' })).toEqual({
      status: 'active',
      venue: '西湖草坪'
    });
  });

  it('requires role code to be lowercase snake case', () => {
    expect(() =>
      createTenantRoleSchema.parse({
        code: 'Planner Manager',
        name: '策划主管',
        permissionCodes: []
      })
    ).toThrow();
  });
});
