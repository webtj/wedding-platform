import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateContractDto, UpdateContractDto } from './dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.contract.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  recent(input: { tenantId: string }) {
    return this.prisma.contract.findMany({
      where: { tenantId: input.tenantId },
      include: {
        project: { select: { id: true, projectNo: true, brideName: true, groomName: true } },
        lead: { select: { id: true, leadNo: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
  }

  async listAll(input: { tenantId: string; status?: string; page?: number; pageSize?: number; search?: string }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(input);

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          project: { select: { id: true, projectNo: true, brideName: true, groomName: true } },
          lead: { select: { id: true, leadNo: true, name: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.contract.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  private buildWhere(input: { tenantId: string; status?: string; search?: string }) {
    const where: Record<string, unknown> = { tenantId: input.tenantId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [
        { contractNo: { contains: input.search } },
        { title: { contains: input.search } }
      ];
    }
    return where;
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateContractDto }) {
    const contract = await this.prisma.contract.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        contractNo: input.data.contractNo,
        title: input.data.title,
        brideName: input.data.brideName,
        groomName: input.data.groomName,
        phone: input.data.phone,
        weddingDate: input.data.weddingDate ? new Date(input.data.weddingDate) : undefined,
        venue: input.data.venue,
        serviceContent: input.data.serviceContent,
        companyName: input.data.companyName,
        companyAddress: input.data.companyAddress,
        note: input.data.note
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'contract.create',
      entity: 'contract',
      entityId: contract.id,
      metadata: { projectId: input.projectId }
    });
    return contract;
  }

  async getById(input: { tenantId: string; contractId: string }) {
    const c = await this.prisma.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId },
      include: {
        project: { select: { id: true, brideName: true, groomName: true } },
        lead: { select: { id: true, leadNo: true, name: true, phone: true } }
      }
    });
    if (!c) throw AppError.notFound('Contract', input.contractId);
    return c;
  }

  async update(input: { tenantId: string; userId: string; contractId: string; data: UpdateContractDto }) {
    const contract = await this.getById(input);
    const updated = await this.prisma.contract.update({
      where: { id: input.contractId, tenantId: input.tenantId },
      data: {
        ...input.data,
        weddingDate: input.data.weddingDate ? new Date(input.data.weddingDate) : undefined,
        signedAt: input.data.signedAt ? new Date(input.data.signedAt) : undefined
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'contract.update',
      entity: 'contract',
      entityId: input.contractId,
      ...(contract.projectId ? { metadata: { projectId: contract.projectId } } : {})
    });
    return updated;
  }

  async getBySignToken(token: string) {
    const contract = await this.prisma.contract.findUnique({ where: { signToken: token } });
    if (!contract) throw AppError.notFound('Contract', token);
    if (contract.signTokenExpiresAt && contract.signTokenExpiresAt < new Date()) {
      throw AppError.badRequest('签署链接已过期');
    }
    return contract;
  }

  async sign(token: string, signatureData: string) {
    const contract = await this.getBySignToken(token);
    if (contract.status !== ContractStatus.pending_sign) {
      throw AppError.badRequest(`合同当前状态为 ${contract.status}，无法签署`);
    }
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'signed', signedAt: new Date(), signatureData }
    });
  }

  async reject(token: string, rejectReason: string) {
    const contract = await this.getBySignToken(token);
    if (contract.status !== ContractStatus.pending_sign) {
      throw AppError.badRequest(`合同当前状态为 ${contract.status}，无法拒绝`);
    }
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'voided', rejectedAt: new Date(), rejectReason }
    });
  }

  async reissueSignToken(input: { tenantId: string; userId: string; contractId: string }) {
    const contract = await this.getById(input);
    if (contract.status === ContractStatus.signed) {
      throw AppError.badRequest('已签署合同无需重发签署链接');
    }
    if (contract.status === ContractStatus.voided) {
      throw AppError.badRequest('已撤销合同无法重发签署链接');
    }
    const signToken = randomBytes(32).toString('hex');
    const signTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.contract.update({
      where: { id: input.contractId },
      data: { signToken, signTokenExpiresAt }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'contract.reissue_sign_token',
      entity: 'contract',
      entityId: input.contractId,
      metadata: {}
    });
    return updated;
  }

  async delete(input: { tenantId: string; contractId: string }) {
    const contract = await this.getById(input);
    if (contract.status === ContractStatus.signed) {
      throw AppError.badRequest('已签署合同不能删除，请使用"撤销"');
    }
    await this.prisma.contract.delete({ where: { id: input.contractId, tenantId: input.tenantId } });
    return { id: contract.id, deleted: true };
  }

  async void(input: { tenantId: string; userId: string; contractId: string }) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId },
      include: { lead: true }
    });
    if (!contract) throw AppError.notFound('Contract', input.contractId);
    if (contract.status === ContractStatus.voided) {
      throw AppError.badRequest('合同已撤销');
    }

    return this.prisma.$transaction(async (tx) => {
      if (contract.leadId) {
        await tx.lead.update({
          where: { id: contract.leadId },
          data: { contractId: null, status: 'lost', lostReason: '合同已撤销' }
        });
      }

      await tx.contract.delete({ where: { id: input.contractId, tenantId: input.tenantId } });

      await this.audit.record(
        {
          tenantId: input.tenantId,
          userId: input.userId,
          action: 'contract.void',
          entity: 'contract',
          entityId: input.contractId,
          metadata: { leadId: contract.leadId }
        },
        tx
      );

      return { id: contract.id, deleted: true };
    });
  }
}
