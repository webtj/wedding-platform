import { describe, expect, it, vi } from 'vitest';
import { ChannelBindingsService } from './channel-bindings.service';

describe('ChannelBindingsService', () => {
  it('creates a WeChat mini channel binding', async () => {
    const prisma = { channelBinding: { create: vi.fn().mockResolvedValue({ id: 'channel_1', channel: 'wechat_mini' }) } };
    const service = new ChannelBindingsService(prisma as never);
    const result = await service.create({ tenantId: 'tenant_1', channel: 'wechat_mini', name: '默认微信小程序', appId: 'wx-dev-appid', status: 'active', config: { env: 'dev' } });
    expect(result.channel).toBe('wechat_mini');
  });
});
