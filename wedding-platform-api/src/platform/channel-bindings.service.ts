import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpsertChannelBindingInput } from '@wedding/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelBindingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.channelBinding.findMany({ include: { tenant: true }, orderBy: [{ channel: 'asc' }, { createdAt: 'desc' }] }); }

  create(data: UpsertChannelBindingInput) {
    return this.prisma.channelBinding.create({ data: { tenantId: data.tenantId ?? null, channel: data.channel, name: data.name, appId: data.appId, status: data.status, config: data.config as Prisma.InputJsonValue } });
  }

  async update(channelId: string, data: UpsertChannelBindingInput) {
    const existing = await this.prisma.channelBinding.findUnique({ where: { id: channelId } });
    if (!existing) { throw new NotFoundException('Channel binding not found'); }
    return this.prisma.channelBinding.update({ where: { id: channelId }, data: { tenantId: data.tenantId ?? null, channel: data.channel, name: data.name, appId: data.appId, status: data.status, config: data.config as Prisma.InputJsonValue } });
  }
}
