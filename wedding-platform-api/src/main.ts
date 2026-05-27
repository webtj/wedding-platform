import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './security/request-context.middleware';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = app.get(ConfigService).get<string[]>('CORS_ORIGINS') ?? ['http://localhost:3000'];

  app.use(helmet());
  app.use(requestContextMiddleware);
  app.useGlobalFilters(new ZodExceptionFilter());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;

  await app.listen(port);
}

void bootstrap();
