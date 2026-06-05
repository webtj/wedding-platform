import { describe, expect, it, vi } from 'vitest';
import { MessageSenderService } from './message-sender.service';

const buildPreferences = (overrides: Record<string, unknown> = {}) => ({
  getPreferences: vi.fn().mockResolvedValue({
    preferInApp: true, preferSms: false, preferEmail: false, phone: null, email: null, ...overrides
  })
});

const buildNotifications = () => ({
  create: vi.fn().mockResolvedValue({ id: 'n1' })
});

describe('MessageSenderService', () => {
  describe('sendNotification', () => {
    it('sends in-app notification when preferInApp is true', async () => {
      const prefs = buildPreferences();
      const notifs = buildNotifications();
      const service = new MessageSenderService(notifs as never, prefs as never);

      const result = await service.sendNotification({
        userId: 'u1', tenantId: 't1', type: 'task' as never, title: 'T', body: 'B', link: '/p/1'
      });

      expect(result).toEqual({ success: true });
      expect(notifs.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'in_app', title: 'T', body: 'B', link: '/p/1' })
      );
    });

    it('skips in-app when preferInApp is false', async () => {
      const prefs = buildPreferences({ preferInApp: false });
      const notifs = buildNotifications();
      const service = new MessageSenderService(notifs as never, prefs as never);

      await service.sendNotification({ userId: 'u1', tenantId: 't1', type: 'task' as never, title: 'T', body: 'B' });
      expect(notifs.create).not.toHaveBeenCalled();
    });

    it('sends SMS when preferSms and phone are set', async () => {
      const prefs = buildPreferences({ preferSms: true, phone: '13800138000' });
      const notifs = buildNotifications();
      const service = new MessageSenderService(notifs as never, prefs as never);

      await service.sendNotification({ userId: 'u1', tenantId: 't1', type: 'task' as never, title: 'T', body: 'B' });

      expect(notifs.create).toHaveBeenCalledTimes(2);
      expect(notifs.create).toHaveBeenCalledWith(expect.objectContaining({ channel: 'sms' }));
    });

    it('sends email when preferEmail and email are set', async () => {
      const prefs = buildPreferences({ preferEmail: true, email: 'test@example.com' });
      const notifs = buildNotifications();
      const service = new MessageSenderService(notifs as never, prefs as never);

      await service.sendNotification({ userId: 'u1', tenantId: 't1', type: 'task' as never, title: 'T', body: 'B' });

      expect(notifs.create).toHaveBeenCalledTimes(2);
      expect(notifs.create).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email' }));
    });

    it('sends all three channels when all prefs are enabled with contact info', async () => {
      const prefs = buildPreferences({ preferInApp: true, preferSms: true, preferEmail: true, phone: '138', email: 'a@b.com' });
      const notifs = buildNotifications();
      const service = new MessageSenderService(notifs as never, prefs as never);

      await service.sendNotification({ userId: 'u1', tenantId: 't1', type: 'task' as never, title: 'T', body: 'B' });

      expect(notifs.create).toHaveBeenCalledTimes(3);
      const channels = notifs.create.mock.calls.map((c: unknown[]) => (c[0] as { channel: string }).channel);
      expect(channels).toContain('in_app');
      expect(channels).toContain('sms');
      expect(channels).toContain('email');
    });
  });
});
