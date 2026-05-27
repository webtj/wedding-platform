import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateContractDto, CreateContractItemDto, CreatePaymentRecordDto, UpdateContractDto } from './dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.contract.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listAll(input: { tenantId: string; status?: string; page?: number; pageSize?: number; search?: string }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: input.tenantId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [
        { contractNo: { contains: input.search } },
        { title: { contains: input.search } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          items: true,
          payments: true,
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
        amountCents: input.data.amountCents,
        depositCents: input.data.depositCents,
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
      include: { items: true, payments: true, project: { select: { id: true, brideName: true, groomName: true } } }
    });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async update(input: { tenantId: string; userId: string; contractId: string; data: UpdateContractDto }) {
    const contract = await this.prisma.contract.findFirst({ where: { id: input.contractId, tenantId: input.tenantId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
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
      metadata: { projectId: contract.projectId ?? "" }
    });
    return updated;
  }

  async addItem(input: { tenantId: string; userId: string; contractId: string; data: CreateContractItemDto }) {
    const contract = await this.prisma.contract.findFirst({ where: { id: input.contractId, tenantId: input.tenantId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    const totalCents = Math.round(input.data.quantity * input.data.unitPriceCents);
    const item = await this.prisma.contractItem.create({
      data: {
        contractId: input.contractId,
        name: input.data.name,
        quantity: input.data.quantity,
        unitPriceCents: input.data.unitPriceCents,
        totalCents,
        note: input.data.note
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'contract_item.create',
      entity: 'contract',
      entityId: input.contractId,
      metadata: { projectId: contract.projectId ?? "", itemId: item.id }
    });
    return item;
  }

  async addPayment(input: { tenantId: string; userId: string; contractId: string; data: CreatePaymentRecordDto }) {
    const contract = await this.prisma.contract.findFirst({ where: { id: input.contractId, tenantId: input.tenantId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    const payment = await this.prisma.paymentRecord.create({
      data: {
        tenantId: input.tenantId,
        projectId: contract.projectId ?? "",
        contractId: input.contractId,
        amountCents: input.data.amountCents,
        paidAt: new Date(input.data.paidAt),
        method: input.data.method,
        note: input.data.note,
        voucherAssetId: input.data.voucherAssetId
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'payment.create',
      entity: 'payment_record',
      entityId: payment.id,
      metadata: { projectId: contract.projectId ?? "", contractId: input.contractId }
    });
    return payment;
  }

  async getBySignToken(token: string) {
    const contract = await this.prisma.contract.findUnique({ where: { signToken: token } });
    if (!contract) throw new NotFoundException('合同不存在或已失效');
    return contract;
  }

  async sign(token: string, signatureData: string) {
    const contract = await this.prisma.contract.findUnique({ where: { signToken: token } });
    if (!contract) throw new NotFoundException('合同不存在');
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'signed', signedAt: new Date(), signatureData }
    });
  }

  async reject(token: string, rejectReason: string) {
    const contract = await this.prisma.contract.findUnique({ where: { signToken: token } });
    if (!contract) throw new NotFoundException('合同不存在');
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'voided', rejectedAt: new Date(), rejectReason }
    });
  }

  async delete(input: { tenantId: string; contractId: string }) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId }
    });
    if (!contract) throw new NotFoundException('Contract not found');
    await this.prisma.paymentRecord.deleteMany({ where: { contractId: input.contractId } });
    await this.prisma.contractItem.deleteMany({ where: { contractId: input.contractId } });
    await this.prisma.contract.delete({ where: { id: input.contractId, tenantId: input.tenantId } });
    return { id: contract.id, deleted: true };
  }

  async void(input: { tenantId: string; userId: string; contractId: string }) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId },
      include: { lead: true }
    });
    if (!contract) throw new NotFoundException('Contract not found');

    return this.prisma.$transaction(async (tx) => {
      if (contract.leadId) {
        await tx.lead.update({
          where: { id: contract.leadId },
          data: { contractId: null, status: 'lost', lostReason: '合同已撤销' }
        });
      }

      await tx.paymentRecord.deleteMany({ where: { contractId: input.contractId } });
      await tx.contractItem.deleteMany({ where: { contractId: input.contractId } });
      await tx.contract.delete({ where: { id: input.contractId, tenantId: input.tenantId } });

      await this.audit.record({
        tenantId: input.tenantId,
        userId: input.userId,
        action: 'contract.void',
        entity: 'contract',
        entityId: input.contractId,
        metadata: { leadId: contract.leadId }
      });

      return { id: contract.id, deleted: true };
    });
  }
}
