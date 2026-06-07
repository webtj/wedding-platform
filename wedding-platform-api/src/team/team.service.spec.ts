import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';

describe('TeamService', () => {
  describe('listMembers', () => {
    it('lists tenant members with user, roles, and tenant', async () => {
      const prisma = {
        tenantMember: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0)
        }
      };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await service.listMembers({ tenantId: 't1' });
      expect(prisma.tenantMember.findMany).toHaveBeenCalled();
      expect(prisma.tenantMember.count).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('throws Conflict when user is already a member', async () => {
      const prisma = {
        tenantMember: { findUnique: vi.fn().mockResolvedValue({ id: 'm1' }), create: vi.fn() }
      };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(
        service.create({ tenantId: 't1', userId: 'u1', displayName: '王' })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a member with default status=active', async () => {
      const prisma = {
        tenantMember: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'm1' })
        }
      };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await service.create({ tenantId: 't1', userId: 'u1', displayName: '王' });
      expect(prisma.tenantMember.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', userId: 'u1', displayName: '王', status: 'active' },
        include: { user: true, roles: { include: { role: true } } }
      });
    });
  });

  describe('getById', () => {
    it('returns the member when found and tenant matches', async () => {
      const member = { id: 'm1', tenantId: 't1' };
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue(member) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      expect(await service.getById('t1', 'm1')).toEqual(member);
    });

    it('throws NotFound when member does not exist', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.getById('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when tenant mismatch', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 'other' }) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.getById('t1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFound when member does not exist', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.update('t1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when tenant mismatch', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 'other' }) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.update('t1', 'm1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates displayName and status when provided', async () => {
      const prisma = {
        tenantMember: {
          findUnique: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 't1', userId: 'u1', user: { authAccounts: [] } }),
          update: vi.fn().mockResolvedValue({ id: 'm1' })
        },
        user: { update: vi.fn().mockResolvedValue({}) }
      };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await service.update('t1', 'm1', { displayName: '新名', status: 'inactive' as never });
      expect(prisma.tenantMember.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws NotFound when member does not exist', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.delete('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when tenant mismatch', async () => {
      const prisma = { tenantMember: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 'other' }) } };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      await expect(service.delete('t1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes the member', async () => {
      const prisma = {
        tenantMember: {
          findUnique: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 't1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new TeamService(prisma as never, { hash: vi.fn().mockResolvedValue('hashed') } as never);
      const result = await service.delete('t1', 'm1');
      expect(result).toEqual({ deleted: true });
      expect(prisma.tenantMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });
  });
});
