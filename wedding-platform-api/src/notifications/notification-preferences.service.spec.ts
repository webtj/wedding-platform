import { describe, expect, it, vi } from 'vitest';
import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationPreferencesService', () => {
  describe('getPreferences', () => {
    it('returns existing preferences when found', async () => {
      const prefs = { userId: 'u1', preferInApp: true, preferSms: false, preferEmail: false };
      const prisma = { userNotificationPreference: { findUnique: vi.fn().mockResolvedValue(prefs) } };
      const service = new NotificationPreferencesService(prisma as never);
      const result = await service.getPreferences('u1');
      expect(result).toEqual(prefs);
    });

    it('creates default preferences when none exist', async () => {
      const created = { userId: 'u1', preferInApp: true, preferSms: false, preferEmail: false };
      const prisma = {
        userNotificationPreference: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(created)
        }
      };
      const service = new NotificationPreferencesService(prisma as never);
      const result = await service.getPreferences('u1');
      expect(prisma.userNotificationPreference.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });
      expect(result).toEqual(created);
    });
  });

  describe('updatePreferences', () => {
    it('upserts preferences with provided fields', async () => {
      const updated = { userId: 'u1', phone: '138', email: 'a@b.com', preferInApp: true, preferSms: true, preferEmail: true };
      const prisma = { userNotificationPreference: { upsert: vi.fn().mockResolvedValue(updated) } };
      const service = new NotificationPreferencesService(prisma as never);
      await service.updatePreferences('u1', { phone: '138', email: 'a@b.com', preferSms: true, preferEmail: true });
      expect(prisma.userNotificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', phone: '138', email: 'a@b.com', preferInApp: true, preferSms: true, preferEmail: true },
        update: { phone: '138', email: 'a@b.com', preferSms: true, preferEmail: true }
      });
    });

    it('only includes provided fields in the update', async () => {
      const prisma = { userNotificationPreference: { upsert: vi.fn().mockResolvedValue({}) } };
      const service = new NotificationPreferencesService(prisma as never);
      await service.updatePreferences('u1', { preferSms: true });
      expect(prisma.userNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { preferSms: true }
        })
      );
    });
  });
});
