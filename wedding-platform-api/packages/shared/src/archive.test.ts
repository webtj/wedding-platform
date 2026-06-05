import { describe, expect, it } from 'vitest';
import {
  archiveProjectSchema,
  createArchivePackageSchema,
  refineAiOutputSchema,
  upsertRetentionPolicySchema
} from './business';

describe('M7 archive storage AI schemas', () => {
  it('accepts retention policy inside allowed range', () => {
    expect(
      upsertRetentionPolicySchema.parse({
        retentionDays: 365,
        archiveAfterDays: 30,
        notifyBeforeDays: 15
      })
    ).toMatchObject({ retentionDays: 365 });
  });

  it('rejects too short retention policy', () => {
    expect(() => upsertRetentionPolicySchema.parse({ retentionDays: 7 })).toThrow();
  });

  it('accepts archive package request', () => {
    expect(
      createArchivePackageSchema.parse({
        type: 'full_project',
        title: '项目完整资料包'
      })
    ).toMatchObject({
      type: 'full_project',
      includeAssets: true,
      includeAiOutputs: true
    });
  });

  it('accepts AI refinement instruction', () => {
    expect(refineAiOutputSchema.parse({ instruction: '更温柔一点' })).toEqual({
      instruction: '更温柔一点',
      saveAsVersion: true
    });
  });

  it('accepts archive reason', () => {
    expect(archiveProjectSchema.parse({ reason: '婚礼已完成并交付资料' })).toEqual({
      reason: '婚礼已完成并交付资料'
    });
  });
});
