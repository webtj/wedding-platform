import { describe, expect, it } from 'vitest';
import { SEED_NATURE_PASSWORD, SEED_ROOT_PASSWORD } from './seed-credentials';

describe('seed credentials', () => {
  it('exposes a non-empty root password sourced from env or dev default', () => {
    expect(typeof SEED_ROOT_PASSWORD).toBe('string');
    expect(SEED_ROOT_PASSWORD.length).toBeGreaterThan(0);
  });

  it('exposes a non-empty nature password sourced from env or dev default', () => {
    expect(typeof SEED_NATURE_PASSWORD).toBe('string');
    expect(SEED_NATURE_PASSWORD.length).toBeGreaterThan(0);
  });
});
