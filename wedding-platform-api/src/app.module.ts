import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AiModule } from './ai/ai.module';
import { AiWorkbenchModule } from './ai-workbench/ai-workbench.module';
import { AppController } from './app.controller';
import { ArchiveModule } from './archive/archive.module';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { ContractsModule } from './contracts/contracts.module';
import { validateEnv } from './config/env';
import { PlatformModule } from './platform/platform.module';
import { CrmModule } from './crm/crm.module';
import { HealthController } from './health/health.controller';
import { MaterialsModule } from './materials/materials.module';
import { MaterialTypeModule } from './material/material-type.module';
import { QuickPromptsModule } from './quick-prompts/quick-prompts.module';
import { ProcessTemplatesModule } from './process-templates/process-templates.module';
import { HealthService } from './health/health.service';
import { IdentityModule } from './identity/identity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OverviewModule } from './overview/overview.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ScenesModule } from './scenes/scenes.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamModule } from './team/team.module';
import { TenantsModule } from './tenants/tenants.module';
import { TimelinesModule } from './timelines/timelines.module';
import { LogModule } from './log/log.module';
import { RequestLoggerMiddleware } from './log/middleware/request-logger.middleware';
import { AllExceptionsFilter } from './log/filters/all-exceptions.filter';
import { AuditInterceptor } from './log/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    PrismaModule,
    LogModule,
    IdentityModule,
    TenantsModule,
    AuditModule,
    NotificationsModule,
    CrmModule,
    ProjectsModule,
    ScenesModule,
    TasksModule,
    AssetsModule,
    AiModule,
    ContractsModule,
    TeamModule,
    ArchiveModule,
    StorageModule,
    SuperAdminModule,
    TimelinesModule,
    PlatformModule,
    MaterialsModule,
    MaterialTypeModule,
    QuickPromptsModule,
    ProcessTemplatesModule,
    SettingsModule,
    AiWorkbenchModule,
    OverviewModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }])
  ],
  controllers: [AppController, HealthController],
  providers: [
    HealthService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
