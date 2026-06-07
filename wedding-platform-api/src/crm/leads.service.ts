import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { LeadStatus, ProjectMemberRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { parseDateOnly } from '../common/parse-date';
import { PrismaService } from '../prisma/prisma.service';
import type { ConvertLeadDto, CreateLeadDto, CreateLeadFollowupDto, UpdateLeadDto } from './dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async list(input: { tenantId: string; search?: string; status?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: input.tenantId, deletedAt: null };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [
        { leadNo: { contains: input.search } },
        { name: { contains: input.search } },
        { phone: { contains: input.search } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          followups: { orderBy: { createdAt: 'desc' }, take: 1 },
          createdBy: { select: { displayName: true } },
          convertedProject: { select: { id: true } },
          contract: { select: { id: true, contractNo: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.lead.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async get(input: { tenantId: string; leadId: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: input.leadId, tenantId: input.tenantId, deletedAt: null },
      include: {
        followups: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { displayName: true } } }
        },
        createdBy: { select: { displayName: true } },
        convertedProject: { select: { id: true } },
        contract: { select: { id: true, contractNo: true } }
      }
    });
    if (!lead) {
      throw AppError.notFound('Lead', input.leadId);
    }
    return lead;
  }

  async create(input: { tenantId: string; userId: string; data: CreateLeadDto }) {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    const leadNo = `LD-${randomPart}-${datePart}`;

    const lead = await this.prisma.lead.create({
      data: {
        tenantId: input.tenantId,
        leadNo,
        name: input.data.name,
        phone: input.data.phone,
        email: input.data.email,
        sourceChannel: input.data.sourceChannel,
        consultationTime: input.data.consultationTime ? new Date(input.data.consultationTime) : undefined,
        weddingDate: parseDateOnly(input.data.weddingDate),
        note: input.data.note,
        createdByUserId: input.userId
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'lead.create',
      entity: 'lead',
      entityId: lead.id
    });
    return lead;
  }

  async update(input: { tenantId: string; userId: string; leadId: string; data: UpdateLeadDto }) {
    const lead = await this.get({ tenantId: input.tenantId, leadId: input.leadId });

    // Prevent changing status from 'won' back to other statuses
    if (lead.status === LeadStatus.won && input.data.status && input.data.status !== LeadStatus.won) {
      throw AppError.badRequest('Cannot change status of a won lead');
    }

    const updated = await this.prisma.lead.update({
      where: { id: input.leadId, tenantId: input.tenantId },
      data: {
        ...input.data,
        consultationTime: input.data.consultationTime ? new Date(input.data.consultationTime) : undefined,
        weddingDate: parseDateOnly(input.data.weddingDate)
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'lead.update',
      entity: 'lead',
      entityId: updated.id
    });
    return updated;
  }

  async delete(input: { tenantId: string; leadId: string }) {
    const lead = await this.get({ tenantId: input.tenantId, leadId: input.leadId });
    await this.prisma.lead.update({
      where: { id: input.leadId, tenantId: input.tenantId },
      data: { deletedAt: new Date() }
    });
    return { id: lead.id, deleted: true };
  }

  async addFollowup(input: { tenantId: string; userId: string; leadId: string; data: CreateLeadFollowupDto }) {
    const lead = await this.get({ tenantId: input.tenantId, leadId: input.leadId });
    const followup = await this.prisma.leadFollowup.create({
      data: {
        tenantId: input.tenantId,
        leadId: input.leadId,
        content: input.data.content,
        nextFollowUpAt: input.data.nextFollowUpAt ? new Date(input.data.nextFollowUpAt) : undefined,
        createdByUserId: input.userId
      }
    });
    if (lead.status === LeadStatus.new) {
      await this.prisma.lead.update({
        where: { id: input.leadId, tenantId: input.tenantId },
        data: { status: LeadStatus.contacted }
      });
    }
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'lead.followup.create',
      entity: 'lead',
      entityId: input.leadId
    });
    return followup;
  }

  async createContract(input: { tenantId: string; leadId: string; data: {
    contractNo?: string; title: string;
    brideName?: string; groomName?: string; phone?: string;
    weddingDate?: string; venue?: string;
    serviceContent?: string; companyName?: string; companyAddress?: string;
  } }) {
    const lead = await this.get({ tenantId: input.tenantId, leadId: input.leadId });
    if (lead.status !== 'won' as LeadStatus) throw AppError.badRequest('Lead is not in won status');
    if (lead.contractId) throw AppError.badRequest('Lead already has a contract');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, address: true }
    });

    const signToken = randomBytes(32).toString('hex');
    const signTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    const contractNo = input.data.contractNo || `HT-${randomPart}-${datePart}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          tenantId: input.tenantId,
          leadId: input.leadId,
          contractNo,
          title: input.data.title,
          brideName: input.data.brideName ?? lead.name ?? undefined,
          groomName: input.data.groomName ?? undefined,
          phone: input.data.phone ?? lead.phone ?? undefined,
          weddingDate: input.data.weddingDate ? new Date(input.data.weddingDate) : lead.weddingDate ?? undefined,
          venue: input.data.venue ?? undefined,
          serviceContent: input.data.serviceContent ?? undefined,
          companyName: input.data.companyName ?? tenant?.name ?? undefined,
          companyAddress: input.data.companyAddress ?? tenant?.address ?? undefined,
          signToken,
          signTokenExpiresAt,
          status: 'pending_sign'
        }
      });
      await tx.lead.update({
        where: { id: input.leadId },
        data: { contractId: contract.id }
      });
      return contract;
    });
    return result;
  }

  async convert(input: { tenantId: string; userId: string; memberId: string; leadId: string; data: ConvertLeadDto }) {
    const lead = await this.get({ tenantId: input.tenantId, leadId: input.leadId });
    if (lead.status === LeadStatus.won && lead.convertedProjectId) {
      return this.prisma.project.findUniqueOrThrow({ where: { id: lead.convertedProjectId } });
    }

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    const projectNo = `PJ-${randomPart}-${datePart}`;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          tenantId: input.tenantId,
          leadId: lead.id,
          projectNo,
          brideName: input.data.brideName,
          groomName: input.data.groomName,
          weddingDate: parseDateOnly(input.data.weddingDate)!,
          ceremonyType: input.data.ceremonyType,
          venue: input.data.venue,
          guestCount: input.data.guestCount,
          colorTheme: input.data.colorTheme,
          style: input.data.style,
          specialRequirements: input.data.specialRequirements,
          plannerId: input.data.plannerId,
          members: {
            create: {
              tenantId: input.tenantId,
              userId: input.userId,
              memberId: input.memberId,
              role: ProjectMemberRole.planner
            }
          }
        }
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.won,
          convertedAt: new Date(),
          convertedProjectId: project.id
        }
      });
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          action: 'lead.convert',
          entity: 'project',
          entityId: project.id,
          metadata: { leadId: lead.id, projectId: project.id }
        }
      });
      return project;
    });
  }
}
