import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  preferInApp: z.boolean().optional(),
  preferSms: z.boolean().optional(),
  preferEmail: z.boolean().optional()
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const prefs = await this.prisma.userNotificationPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      return this.prisma.userNotificationPreference.create({
        data: { userId }
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: UpdatePreferencesDto) {
    return this.prisma.userNotificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        phone: data.phone ?? null,
        email: data.email ?? null,
        preferInApp: data.preferInApp ?? true,
        preferSms: data.preferSms ?? false,
        preferEmail: data.preferEmail ?? false
      },
      update: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.preferInApp !== undefined && { preferInApp: data.preferInApp }),
        ...(data.preferSms !== undefined && { preferSms: data.preferSms }),
        ...(data.preferEmail !== undefined && { preferEmail: data.preferEmail })
      }
    });
  }
}
