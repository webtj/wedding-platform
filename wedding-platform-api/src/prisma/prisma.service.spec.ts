import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('extends PrismaClient', () => {
    const service = new PrismaService();
    expect(service).toBeDefined();
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
  });

  it('onModuleInit calls $connect', async () => {
    const service = new PrismaService();
    service.$connect = vi.fn().mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('onModuleDestroy calls $disconnect', async () => {
    const service = new PrismaService();
    service.$disconnect = vi.fn().mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});
