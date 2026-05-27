import { describe, expect, it } from 'vitest';
import { resolveStorageProvider } from './storage-provider';

describe('resolveStorageProvider', () => {
  it('returns local provider by default', () => {
    expect(resolveStorageProvider({ STORAGE_PROVIDER: 'local' })).toBe('local');
  });

  it('returns local for undefined', () => {
    expect(resolveStorageProvider({})).toBe('local');
  });

  it('accepts cos and oss providers', () => {
    expect(resolveStorageProvider({ STORAGE_PROVIDER: 'cos' })).toBe('cos');
    expect(resolveStorageProvider({ STORAGE_PROVIDER: 'oss' })).toBe('oss');
  });
});
