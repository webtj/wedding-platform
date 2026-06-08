import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryLogQueue } from './memory-log-queue';
import type { LogEntry } from './log-queue.interface';

function createMockPrisma() {
  return {
    logRequest: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    logError: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    logAudit: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    logEvent: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
}

function makeEntry(type: LogEntry['type'] = 'request', data = {}): LogEntry {
  return { type, data, timestamp: new Date() };
}

describe('MemoryLogQueue', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.useFakeTimers();
    prisma = createMockPrisma();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buffer accumulation', () => {
    it('accumulates entries in buffer without immediate write', () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry());
      queue.add(makeEntry());

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('drops entries after close', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      await queue.close();
      prisma.$transaction.mockClear();

      queue.add(makeEntry());

      // Should not trigger any write
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('flush on threshold (100 items)', () => {
    it('flushes synchronously when buffer reaches 100 items', async () => {
      prisma.$transaction.mockResolvedValue([]);
      const queue = new MemoryLogQueue(prisma as never);

      for (let i = 0; i < 100; i++) {
        queue.add(makeEntry('request'));
      }

      // The flush is triggered via void this.flush() so we need a microtask tick
      await Promise.resolve();
      // Also need to resolve the $transaction promise
      await Promise.resolve();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('writes batch of exactly 100 items on threshold flush', async () => {
      prisma.$transaction.mockResolvedValue([]);
      const queue = new MemoryLogQueue(prisma as never);

      for (let i = 0; i < 100; i++) {
        queue.add(makeEntry('request'));
      }

      await Promise.resolve();
      await Promise.resolve();

      expect(prisma.logRequest.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ createdAt: expect.any(Date) }),
          ]),
        }),
      );
      expect(prisma.logRequest.createMany.mock.calls[0]![0].data).toHaveLength(100);
    });
  });

  describe('flush on close', () => {
    it('flushes remaining entries on close', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry('request'));
      queue.add(makeEntry('error'));
      queue.add(makeEntry('audit'));

      await queue.close();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('clears the interval timer on close', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const queue = new MemoryLogQueue(prisma as never);

      await queue.close();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('does nothing on second close', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry());
      await queue.close();
      prisma.$transaction.mockClear();

      await queue.close();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('close flushes even when buffer has fewer than 100 items', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      for (let i = 0; i < 5; i++) {
        queue.add(makeEntry('request'));
      }

      await queue.close();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.logRequest.createMany.mock.calls[0]![0].data).toHaveLength(5);
    });
  });

  describe('periodic flush', () => {
    it('flushes on interval timer', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry('request'));
      queue.add(makeEntry('error'));

      // Advance past the 5-second flush interval
      await vi.advanceTimersByTimeAsync(5_000);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('does not flush when buffer is empty on timer', async () => {
      const queue = new MemoryLogQueue(prisma as never);

      await vi.advanceTimersByTimeAsync(5_000);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('batch writing', () => {
    it('groups entries by type and writes to correct tables', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry('request', { method: 'GET', path: '/a' }));
      queue.add(makeEntry('request', { method: 'POST', path: '/b' }));
      queue.add(makeEntry('error', { message: 'fail' }));
      queue.add(makeEntry('audit', { action: 'create', entity: 'project' }));
      queue.add(makeEntry('event', { eventType: 'click', eventName: 'btn' }));

      await queue.close();

      expect(prisma.logRequest.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ method: 'GET', path: '/a', createdAt: expect.any(Date) }),
          expect.objectContaining({ method: 'POST', path: '/b', createdAt: expect.any(Date) }),
        ],
      });
      expect(prisma.logError.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ message: 'fail', createdAt: expect.any(Date) })],
      });
      expect(prisma.logAudit.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ action: 'create', entity: 'project', createdAt: expect.any(Date) })],
      });
      expect(prisma.logEvent.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ eventType: 'click', eventName: 'btn', createdAt: expect.any(Date) })],
      });
    });

    it('only creates tables that have entries', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry('request'));

      await queue.close();

      expect(prisma.logRequest.createMany).toHaveBeenCalled();
      expect(prisma.logError.createMany).not.toHaveBeenCalled();
      expect(prisma.logAudit.createMany).not.toHaveBeenCalled();
      expect(prisma.logEvent.createMany).not.toHaveBeenCalled();
    });

    it('wraps all createMany calls in a transaction', async () => {
      const queue = new MemoryLogQueue(prisma as never);
      queue.add(makeEntry('request'));
      queue.add(makeEntry('error'));

      await queue.close();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const txArg = prisma.$transaction.mock.calls[0]![0];
      expect(Array.isArray(txArg)).toBe(true);
      expect(txArg).toHaveLength(2);
    });

    it('keeps failed batches buffered for a retry', async () => {
      // Suppress the logger.error output
      vi.spyOn(console, 'error').mockImplementation(() => {});
      prisma.$transaction
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce([]);

      const queue = new MemoryLogQueue(prisma as never);

      for (let i = 0; i < 100; i++) {
        queue.add(makeEntry('request'));
      }

      // Allow the void flush() to execute and catch
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      await queue.flush();
      await Promise.resolve();
      await Promise.resolve();

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('includes timestamp as createdAt in each record', async () => {
      const ts = new Date('2024-06-15T10:00:00Z');
      const queue = new MemoryLogQueue(prisma as never);
      queue.add({ type: 'request', data: { method: 'GET' }, timestamp: ts });

      await queue.close();

      expect(prisma.logRequest.createMany).toHaveBeenCalledWith({
        data: [{ method: 'GET', createdAt: ts }],
      });
    });
  });
});
