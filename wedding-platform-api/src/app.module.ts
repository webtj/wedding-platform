import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    PrismaModule,
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
  providers: [HealthService]
})
export class AppModule {}
