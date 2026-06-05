import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './security/request-context.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggerInterceptor } from './common/logging/request-logger.interceptor';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('CORS_ORIGINS') ?? [
    'http://localhost:3000',
    'https://*.vercel.app',
  ];

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.vercel.app", "https://*.tencent.com", "https://*.aliyuncs.com"],
        connectSrc: ["'self'", "https://*.vercel.app", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(requestContextMiddleware);
  app.useGlobalInterceptors(new TenantContextInterceptor(), new RequestLoggerInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
  app.setGlobalPrefix('api');

  // Body size limits: 1MB default, 10MB for upload routes handled by multer
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  const port = config.get<number>('PORT') ?? 4000;

  await app.listen(port);
}

void bootstrap();
