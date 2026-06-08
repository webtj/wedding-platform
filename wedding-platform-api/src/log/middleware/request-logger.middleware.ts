import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthContext } from '../../common/auth/auth-context';
import { LogQueueService } from '../log-queue.service';

const SKIP_PATHS = ['/health', '/api/health', '/'];
const SKIP_PREFIXES = ['/_next/', '/api/analytics'];
const SKIP_EXACT_PATHS = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
];
const SKIP_STATIC_ASSET = /\.(?:css|js|map|png|jpe?g|gif|webp|svg|ico|txt|json|woff2?|ttf)$/i;

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logQueue: LogQueueService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const traceId = randomUUID();
    (request as any).traceId = traceId;

    const start = Date.now();

    response.on('finish', () => {
      const path = request.originalUrl || request.url;

      if (this.shouldSkipPath(path)) {
        return;
      }

      const auth: AuthContext | undefined = (request as any).auth;

      this.logQueue.addRequest({
        traceId,
        method: request.method,
        path,
        statusCode: response.statusCode,
        duration: Date.now() - start,
        ip: request.ip ?? request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        userId: auth?.userId,
        tenantId: auth?.tenantId ?? undefined,
      });
    });

    next();
  }

  private shouldSkipPath(path: string): boolean {
    if (SKIP_PATHS.some((p) => path === p || path.startsWith(p + '?'))) {
      return true;
    }

    if (SKIP_EXACT_PATHS.includes(path)) {
      return true;
    }

    if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
      return true;
    }

    return SKIP_STATIC_ASSET.test(path);
  }
}
