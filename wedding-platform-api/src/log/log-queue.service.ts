import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogQueue, LogEntry } from './queue/log-queue.interface';
import { createLogQueue } from './queue/log-queue.factory';

@Injectable()
export class LogQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(LogQueueService.name);
  private readonly queue: LogQueue;

  constructor(private readonly prisma: PrismaService) {
    this.queue = createLogQueue(prisma);
  }

  addRequest(data: {
    traceId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    tenantId?: string;
    ip?: string;
    userAgent?: string;
    timestamp?: Date;
  }): void {
    this.enqueue('request', data, data.timestamp);
  }

  addError(data: {
    traceId: string;
    message: string;
    stack?: string;
    path?: string;
    userId?: string;
    tenantId?: string;
    requestBody?: unknown;
    timestamp?: Date;
  }): void {
    this.enqueue(
      'error',
      { ...data, requestBody: data.requestBody ?? undefined },
      data.timestamp,
    );
  }

  addAudit(data: {
    action: string;
    entity: string;
    entityId: string;
    userId?: string;
    tenantId?: string;
    changes?: unknown;
    metadata?: unknown;
    timestamp?: Date;
  }): void {
    this.enqueue(
      'audit',
      { ...data, changes: data.changes ?? undefined, metadata: data.metadata ?? undefined },
      data.timestamp,
    );
  }

  addEvent(data: {
    eventType: string;
    eventName: string;
    userId?: string;
    tenantId?: string;
    page?: string;
    properties?: unknown;
    sessionId?: string;
    timestamp?: Date;
  }): void {
    this.enqueue(
      'event',
      { ...data, properties: data.properties ?? undefined },
      data.timestamp,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  private enqueue(
    type: LogEntry['type'],
    data: Record<string, unknown>,
    timestamp?: Date,
  ): void {
    try {
      this.queue.add({ type, data, timestamp: timestamp ?? new Date() });
    } catch (err) {
      this.logger.error(
        `Failed to enqueue ${type} log entry`,
        (err as Error).stack,
      );
    }
  }
}
