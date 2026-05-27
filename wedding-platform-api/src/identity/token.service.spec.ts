import { describe, expect, it, vi } from 'vitest';
import { TokenService } from './token.service';

describe('TokenService', () => {
  it('hashes refresh tokens deterministically without storing raw token', () => {
    const service = new TokenService({} as never, {} as never, {} as never);

    const first = service.hashRefreshToken('refresh-token');
    const second = service.hashRefreshToken('refresh-token');

    expect(first).toBe(second);
    expect(first).not.toBe('refresh-token');
    expect(first).toHaveLength(64);
  });

  it('creates an access token and refresh session', async () => {
    const jwt = {
      signAsync: vi.fn().mockResolvedValue('access.jwt')
    };
    const config = {
      get: vi.fn((key: string) => {
        const values: Record<string, string | number> = {
          JWT_ACCESS_SECRET: 'access-secret-for-test',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL_DAYS: 30
        };
        return values[key];
      })
    };
    const prisma = {
      refreshSession: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    const service = new TokenService(jwt as never, config as never, prisma as never);
    const pair = await service.issueTokenPair({
      sub: 'user_1',
      tenantId: 'tenant_1',
      memberId: 'member_1'
    });

    expect(pair.accessToken).toBe('access.jwt');
    expect(pair.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date)
      })
    });
  });
});
