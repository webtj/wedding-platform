import { PrismaService } from '../../prisma/prisma.service';
import { LogQueue } from './log-queue.interface';
import { MemoryLogQueue } from './memory-log-queue';

export function createLogQueue(prisma: PrismaService): LogQueue {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    // TODO: Return RedisLogQueue when implemented
    // return new RedisLogQueue(redisUrl, prisma);
  }
  return new MemoryLogQueue(prisma);
}
