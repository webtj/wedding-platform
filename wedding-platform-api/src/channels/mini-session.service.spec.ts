import { describe, expect, it, vi } from 'vitest';
import { MiniSessionService } from './mini-session.service';

const mockWechatProvider = { exchangeCode: vi.fn().mockResolvedValue({ provider: 'wechat_mini', openId: 'dev-openid-001' }) };
const mockDouyinProvider = { exchangeCode: vi.fn().mockResolvedValue({ provider: 'douyin_mini', openId: 'dev-openid-002' }) };

describe('MiniSessionService', () => {
  it('maps development code to provider identifier', async () => {
    const prisma = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'default-wedding-studio' }) },
      authAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { create: vi.fn().mockResolvedValue({ id: 'user_1', displayName: '新人', tenantMembers: [{ id: 'member_1', tenantId: 'default-wedding-studio' }] }) }
    };
    const tokenService = { issueTokenPair: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }) };
    const service = new MiniSessionService(prisma as never, tokenService as never, mockWechatProvider as never, mockDouyinProvider as never);
    const result = await service.exchange({ channel: 'wechat_mini', tenantId: 'default-wedding-studio', code: 'dev-openid-001', displayName: '新人' });
    expect(result.tokens.accessToken).toBe('access');
    expect(result.provider).toBe('wechat_mini');
  });

  it('uses douyin provider for douyin channel', async () => {
    const prisma = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'default-wedding-studio' }) },
      authAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { create: vi.fn().mockResolvedValue({ id: 'user_1', displayName: '新人', tenantMembers: [{ id: 'member_1', tenantId: 'default-wedding-studio' }] }) }
    };
    const tokenService = { issueTokenPair: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }) };
    const service = new MiniSessionService(prisma as never, tokenService as never, mockWechatProvider as never, mockDouyinProvider as never);
    const result = await service.exchange({ channel: 'douyin_mini', tenantId: 'default-wedding-studio', code: 'dev-openid-002', displayName: '新人' });
    expect(result.provider).toBe('douyin_mini');
  });
});
