import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { LogQueueService } from './log-queue.service';

const analyticsPayloadSchema = z.object({
  event: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().nullable().optional(),
  tenantId: z.string().nullable().optional(),
  sessionId: z.string().min(1).optional(),
  timestamp: z.coerce.date().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

const analyticsBatchSchema = z.union([
  analyticsPayloadSchema,
  z.array(analyticsPayloadSchema),
]);

type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly logQueue: LogQueueService) {}

  @HttpCode(204)
  @Post('ingest')
  ingest(@Body() body: unknown): void {
    const parsed = analyticsBatchSchema.safeParse(body);
    if (!parsed.success) return;

    const events = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    for (const event of events) {
      this.persistEvent(event);
    }
  }

  private persistEvent(event: AnalyticsPayload): void {
    const timestamp = event.timestamp ?? new Date();
    const properties = this.normalizeProperties(event.properties);
    const page = this.resolvePage(event, properties);

    if (event.event === 'error') {
      const message =
        this.readString(properties, 'message') ??
        this.readString(properties, 'name') ??
        'analytics_error';
      const traceId = event.sessionId ?? randomUUID();

      this.logQueue.addError({
        traceId,
        message,
        stack: this.readString(properties, 'stack'),
        path: page ?? (typeof event.url === 'string' ? event.url : undefined),
        userId: event.userId ?? undefined,
        tenantId: event.tenantId ?? undefined,
        requestBody: {
          event: event.event,
          properties,
          sessionId: event.sessionId ?? null,
          url: event.url ?? null,
          userAgent: event.userAgent ?? null,
        },
        timestamp,
      });
      return;
    }

    const eventName =
      page ??
      this.readString(properties, 'label') ??
      this.readString(properties, 'name') ??
      event.event;

    this.logQueue.addEvent({
      eventType: event.event,
      eventName,
      userId: event.userId ?? undefined,
      tenantId: event.tenantId ?? undefined,
      page,
      properties: properties ?? undefined,
      sessionId: event.sessionId ?? undefined,
      timestamp,
    });
  }

  private normalizeProperties(
    properties?: Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!properties) return null;
    return Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    );
  }

  private resolvePage(
    event: AnalyticsPayload,
    properties: Record<string, unknown> | null,
  ): string | undefined {
    const explicitPath = this.readString(properties, 'path');
    if (explicitPath) return explicitPath;

    if (typeof event.url === 'string' && event.url.length > 0) {
      try {
        const url = new URL(event.url);
        return `${url.pathname}${url.search}`;
      } catch {
        return event.url;
      }
    }

    return undefined;
  }

  private readString(
    properties: Record<string, unknown> | null,
    key: string,
  ): string | undefined {
    const value = properties?.[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
