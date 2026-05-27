import { describe, expect, it } from 'vitest';
import { normalizeTenantSlug } from './tenant';

describe('tenant helpers', () => {
  it('normalizes tenant slug', () => {
    expect(normalizeTenantSlug('  Flower House 上海  ')).toBe('flower-house');
  });
});
