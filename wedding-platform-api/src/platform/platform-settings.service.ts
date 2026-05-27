import { Injectable } from '@nestjs/common';
import type { UpsertPlatformSettingInput } from '@wedding/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.platformSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] }); }

  upsert(key: string, data: UpsertPlatformSettingInput) {
    const payload = { group: data.group, label: data.label, value: data.value as Prisma.InputJsonValue };
    return this.prisma.platformSetting.upsert({ where: { key }, update: payload, create: { key, ...payload } });
  }
}
