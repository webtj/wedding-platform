import { describe, expect, it, vi } from 'vitest';
import { PlatformSettingsService } from './platform-settings.service';

describe('PlatformSettingsService', () => {
  it('upserts setting by key', async () => {
    const prisma = { platformSetting: { upsert: vi.fn().mockResolvedValue({ key: 'notification.sms', value: { provider: 'disabled' } }) } };
    const service = new PlatformSettingsService(prisma as never);
    const result = await service.upsert('notification.sms', { group: 'notification', label: '短信服务', value: { provider: 'disabled' } });
    expect(result.key).toBe('notification.sms');
  });
});
