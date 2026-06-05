import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

function makePrisma() {
  return {
    refreshSession: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 })
    },
    memberRole: {
      findMany: vi.fn().mockResolvedValue([])
    }
  };
}

function makeConfig(overrides: Record<string, string | number> = {}) {
  return new ConfigService({
    JWT_ACCESS_SECRET: 'test-access-secret-must-be-32-chars-long-please',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL_DAYS: 7,
    ...overrides
  });
}

function makeJwt() {
  return {
    signAsync: vi.fn(),
    verifyAsync: vi.fn()
  };
}

describe('TokenService', () => {
  describe('issueTokenPair', () => {
    it('returns access and refresh tokens and persists a refresh session', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const jwt = makeJwt();
      jwt.signAsync.mockResolvedValue('signed.access.token');
      prisma.refreshSession.create.mockResolvedValue({ id: 'session_1' });

      const service = new TokenService(jwt as never, config, prisma as never);
      const result = await service.issueTokenPair({
        sub: 'u1',
        tenantId: 't1',
        memberId: 'm1',
        isPlatformAdmin: false,
        permissions: ['lead.read']
      });

      expect(result.accessToken).toBe('signed.access.token');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(prisma.refreshSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date)
        }
      });
    });

    it('uses default refresh TTL of 30 days when config missing', async () => {
      const prisma = makePrisma();
      const config = new ConfigService({ JWT_ACCESS_SECRET: 'a'.repeat(40) });
      const jwt = makeJwt();
      jwt.signAsync.mockResolvedValue('t');

      const service = new TokenService(jwt as never, config, prisma as never);
      await service.issueTokenPair({
        sub: 'u1',
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        permissions: []
      });

      const call = prisma.refreshSession.create.mock.calls[0]![0];
      const expected = 30 * 24 * 60 * 60 * 1000;
      const actual = (call.data.expiresAt as Date).getTime() - Date.now();
      expect(Math.abs(actual - expected)).toBeLessThan(5_000);
    });
  });

  describe('verifyAccessToken', () => {
    it('returns the payload on success', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const jwt = makeJwt();
      const payload = { sub: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] };
      jwt.verifyAsync.mockResolvedValue(payload);

      const service = new TokenService(jwt as never, config, prisma as never);
      await expect(service.verifyAccessToken('good')).resolves.toEqual(payload);
    });

    it('throws Unauthorized on verification failure', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const jwt = makeJwt();
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const service = new TokenService(jwt as never, config, prisma as never);
      await expect(service.verifyAccessToken('bad')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('hashRefreshToken', () => {
    it('returns a stable sha256 hex digest', () => {
      const service = new TokenService(makeJwt() as never, makeConfig(), makePrisma() as never);
      const hash = service.hashRefreshToken('refresh-token-xyz');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(service.hashRefreshToken('refresh-token-xyz')).toBe(hash);
    });
  });

  describe('revokeSessionsByRoleId', () => {
    it('returns 0 when no members hold the role', async () => {
      const prisma = makePrisma();
      prisma.memberRole.findMany.mockResolvedValue([]);
      const service = new TokenService(makeJwt() as never, makeConfig(), prisma as never);

      const count = await service.revokeSessionsByRoleId('role_1');
      expect(count).toBe(0);
      expect(prisma.refreshSession.updateMany).not.toHaveBeenCalled();
    });

    it('revokes all active sessions for affected users', async () => {
      const prisma = makePrisma();
      prisma.memberRole.findMany.mockResolvedValue([
        { member: { userId: 'u1' } },
        { member: { userId: 'u2' } },
        { member: { userId: 'u1' } }
      ]);
      prisma.refreshSession.updateMany.mockResolvedValue({ count: 3 });
      const service = new TokenService(makeJwt() as never, makeConfig(), prisma as never);

      const count = await service.revokeSessionsByRoleId('role_1');
      expect(count).toBe(3);
      expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] }, revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
    });
  });
});
