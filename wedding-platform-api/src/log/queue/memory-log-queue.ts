import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogEntry, LogQueue } from './log-queue.interface';

const FLUSH_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5_000;

export class MemoryLogQueue implements LogQueue {
  private readonly logger = new Logger(MemoryLogQueue.name);
  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing: Promise<void> | null = null;
  private closed = false;

  constructor(private readonly prisma: PrismaService) {
    this.timer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  add(entry: LogEntry): void {
    if (this.closed) return;
    this.buffer.push(entry);
    if (this.buffer.length >= FLUSH_BATCH_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    if (this.flushing) {
      await this.flushing;
      return;
    }

    this.flushing = this.flushBufferedEntries().finally(() => {
      this.flushing = null;
    });

    await this.flushing;
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  private async writeBatch(batch: LogEntry[]): Promise<void> {
    const grouped = {
      request: [] as LogEntry[],
      error: [] as LogEntry[],
      audit: [] as LogEntry[],
      event: [] as LogEntry[],
    };

    for (const entry of batch) {
      grouped[entry.type].push(entry);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: any[] = [];

    if (grouped.request.length > 0) {
      tx.push(
        this.prisma.logRequest.createMany({
          data: grouped.request.map((e) => this.toRow(e)) as any,
        }),
      );
    }

    if (grouped.error.length > 0) {
      tx.push(
        this.prisma.logError.createMany({
          data: grouped.error.map((e) => this.toRow(e)) as any,
        }),
      );
    }

    if (grouped.audit.length > 0) {
      tx.push(
        this.prisma.logAudit.createMany({
          data: grouped.audit.map((e) => this.toRow(e)) as any,
        }),
      );
    }

    if (grouped.event.length > 0) {
      tx.push(
        this.prisma.logEvent.createMany({
          data: grouped.event.map((e) => this.toRow(e)) as any,
        }),
      );
    }

    await this.prisma.$transaction(tx);
  }

  private async flushBufferedEntries(): Promise<void> {
    while (this.buffer.length > 0) {
      const batch = this.buffer.slice(0, FLUSH_BATCH_SIZE);

      try {
        await this.writeBatch(batch);
        this.buffer.splice(0, batch.length);
      } catch (err) {
        this.logger.error('Failed to flush log batch', (err as Error).stack);
        return;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toRow(entry: LogEntry): Record<string, any> {
    const { timestamp: _, ...rest } = entry.data;
    return { ...rest, createdAt: entry.timestamp };
  }
}
