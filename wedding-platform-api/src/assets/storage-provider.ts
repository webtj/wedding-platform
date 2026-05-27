export type StorageProviderName = 'local' | 'cos' | 'oss';

export function resolveStorageProvider(env: { STORAGE_PROVIDER?: string }): StorageProviderName {
  if (env.STORAGE_PROVIDER === 'cos' || env.STORAGE_PROVIDER === 'oss') {
    return env.STORAGE_PROVIDER;
  }
  return 'local';
}
