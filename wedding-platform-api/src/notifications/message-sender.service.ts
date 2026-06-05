import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface SendNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class MessageSenderService {
  private readonly logger = new Logger(MessageSenderService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService
  ) {}

  async sendNotification(input: SendNotificationInput) {
    const { userId, tenantId, type, title, body, link } = input;

    const prefs = await this.preferencesService.getPreferences(userId);

    // Always send in-app notification if preferred
    if (prefs.preferInApp) {
      await this.notificationsService.create({
        tenantId,
        userId,
        type,
        channel: 'in_app' as NotificationChannel,
        title,
        body,
        link
      });
      this.logger.log(`In-app notification sent to user ${userId}: ${title}`);
    }

    // Send SMS if preferred and phone is available
    if (prefs.preferSms && prefs.phone) {
      await this.sendSms(tenantId, userId, type, prefs.phone, title, body);
    }

    // Send email if preferred and email is available
    if (prefs.preferEmail && prefs.email) {
      await this.sendEmail(tenantId, userId, type, prefs.email, title, body);
    }

    return { success: true };
  }

  private async sendSms(
    tenantId: string,
    userId: string,
    type: NotificationType,
    phone: string,
    title: string,
    body: string
  ) {
    // Placeholder for SMS provider integration
    this.logger.log(`[SMS Placeholder] To: ${phone}, Title: ${title}, Body: ${body}`);

    // Log SMS as a notification with channel=sms (no read/unread status)
    await this.notificationsService.create({
      tenantId,
      userId,
      type,
      channel: 'sms' as NotificationChannel,
      title,
      body
    });
  }

  private async sendEmail(
    tenantId: string,
    userId: string,
    type: NotificationType,
    email: string,
    title: string,
    body: string
  ) {
    // Placeholder for email provider integration
    this.logger.log(`[Email Placeholder] To: ${email}, Title: ${title}, Body: ${body}`);

    // Log email as a notification with channel=email (no read/unread status)
    await this.notificationsService.create({
      tenantId,
      userId,
      type,
      channel: 'email' as NotificationChannel,
      title,
      body
    });
  }
}
