import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type LiveStatus = {
  service: 'wedding-api';
  ok: true;
};

export type ReadyStatus = {
  service: 'wedding-api';
  ok: boolean;
  checks: {
    database: 'up' | 'down';
  };
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live(): LiveStatus {
    return {
      service: 'wedding-api',
      ok: true
    };
  }

  async ready(): Promise<ReadyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: 'wedding-api',
        ok: true,
        checks: { database: 'up' }
      };
    } catch {
      return {
        service: 'wedding-api',
        ok: false,
        checks: { database: 'down' }
      };
    }
  }

  check() {
    return this.ready();
  }
}
