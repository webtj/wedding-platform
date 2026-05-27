import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns liveness without database dependency', () => {
    const service = new HealthService({ $queryRaw: vi.fn() } as never);
    expect(service.live()).toEqual({ service: 'wedding-api', ok: true });
  });

  it('returns ready when database responds', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ one: 1 }]) };
    const service = new HealthService(prisma as never);
    await expect(service.ready()).resolves.toEqual({
      service: 'wedding-api',
      ok: true,
      checks: { database: 'up' }
    });
  });

  it('returns not ready when database fails', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('connection refused')) };
    const service = new HealthService(prisma as never);
    const result = await service.ready();
    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe('down');
  });
});
