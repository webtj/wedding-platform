import { describe, expect, it } from 'vitest';
import { createLeadSchema, convertLeadSchema, createAssetUploadIntentSchema, TASK_ASSIGNEE_TYPE } from './business';

describe('business schemas', () => {
  it('accepts a minimal lead', () => {
    expect(createLeadSchema.parse({ name: '李想', phone: '13800000000' })).toEqual({
      name: '李想',
      phone: '13800000000'
    });
  });

  it('requires wedding date format when converting a lead', () => {
    expect(() =>
      convertLeadSchema.parse({
        brideName: '李想',
        groomName: '周安',
        weddingDate: '2026/06/18'
      })
    ).toThrow();
  });

  it('accepts planner or couple task assignee type', () => {
    expect(TASK_ASSIGNEE_TYPE.COUPLE).toBe('couple');
  });

  it('limits upload intent file size to 1GB', () => {
    expect(() =>
      createAssetUploadIntentSchema.parse({
        filename: 'large.mov',
        contentType: 'video/quicktime',
        sizeBytes: 1024 * 1024 * 1024 + 1
      })
    ).toThrow();
  });
});
