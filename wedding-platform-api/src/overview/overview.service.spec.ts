import { describe, expect, it, vi, afterEach } from 'vitest';
import { OverviewService } from './overview.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    lead: { count: vi.fn().mockResolvedValue(0) },
    project: { count: vi.fn().mockResolvedValue(0) },
    contract: {
      count: vi.fn().mockResolvedValue(0)
    },
    ...overrides
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  return new OverviewService(makePrisma(prismaOverrides) as never);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('OverviewService', () => {
  it('returns correct counts with populated data', async () => {
    const prisma = makePrisma({
      lead: { count: vi.fn().mockResolvedValue(12) },
      project: { count: vi.fn().mockResolvedValue(5) },
      contract: { count: vi.fn().mockResolvedValue(3) }
    });
    const svc = new OverviewService(prisma as never);

    const result = await svc.getStats({ tenantId: 't1' });

    expect(result).toEqual({
      leadCount: 12,
      activeProjectCount: 5,
      monthContractCount: 3,
      receivableCents: 0
    });
  });

  it('returns zero for empty tenant', async () => {
    const svc = makeService();
    const result = await svc.getStats({ tenantId: 'empty' });
    expect(result).toEqual({
      leadCount: 0,
      activeProjectCount: 0,
      monthContractCount: 0,
      receivableCents: 0
    });
  });

  it('passes tenantId to every Prisma query', async () => {
    const prisma = makePrisma();
    const svc = new OverviewService(prisma as never);
    await svc.getStats({ tenantId: 'tenant_x' });

    expect(prisma.lead.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant_x' } });
    expect(prisma.project.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_x', status: 'active' }
    });

    const countCall = (prisma.contract.count as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(countCall[0].where.tenantId).toBe('tenant_x');
    expect(countCall[0].where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('queries contracts from start of current month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    const prisma = makePrisma();
    const svc = new OverviewService(prisma as never);
    await svc.getStats({ tenantId: 't1' });

    const call = (prisma.contract.count as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const gte = call[0].where.createdAt.gte as Date;
    expect(gte.getFullYear()).toBe(2026);
    expect(gte.getMonth()).toBe(5);
    expect(gte.getDate()).toBe(1);
  });

  it('executes all queries in parallel', async () => {
    const callOrder: string[] = [];
    const delayedMock = (name: string, result: unknown, ms: number) =>
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              callOrder.push(name);
              resolve(result);
            }, ms)
          )
      );

    const prisma = makePrisma({
      lead: { count: delayedMock('lead.count', 5, 5) },
      project: { count: delayedMock('project.count', 3, 5) },
      contract: { count: delayedMock('contract.count', 2, 20) }
    });
    const svc = new OverviewService(prisma as never);
    await svc.getStats({ tenantId: 't1' });

    expect(callOrder).toContain('lead.count');
    expect(callOrder).toContain('project.count');
    expect(callOrder).toContain('contract.count');
  });
});
