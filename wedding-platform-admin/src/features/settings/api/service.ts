import { apiClient } from '@/lib/api-client';
import type { PlatformSetting, AiServiceConfig } from './types';

export async function getSettings(): Promise<PlatformSetting[]> {
  return apiClient<PlatformSetting[]>('/super/settings');
}

export async function upsertSetting(
  group: string,
  key: string,
  data: { value: unknown; label?: string; encrypted?: boolean; defaultValue?: unknown }
): Promise<PlatformSetting> {
  return apiClient<PlatformSetting>(`/super/settings/${group}/${key}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function testConnection(
  config: Pick<AiServiceConfig, 'provider' | 'baseUrl' | 'apiKey' | 'model'>
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>('/super/settings/ai/test-connection', {
    method: 'POST',
    body: JSON.stringify(config)
  });
}
