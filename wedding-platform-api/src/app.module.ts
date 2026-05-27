import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { ArchiveModule } from './archive/archive.module';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { ChannelsModule } from './channels/channels.module';
import { ConfirmationsModule } from './confirmations/confirmations.module';
import { ContractsModule } from './contracts/contracts.module';
import { CoupleModule } from './couple/couple.module';
import { validateEnv } from './config/env';
import { PlatformModule } from './platform/platform.module';
import { CrmModule } from './crm/crm.module';
import { FinanceModule } from './finance/finance.module';
import { HealthController } from './health/health.controller';
import { MaterialsModule } from './materials/materials.module';
import { MiniModule } from './mini/mini.module';
import { ProcessTemplatesModule } from './process-templates/process-templates.module';
import { HealthService } from './health/health.service';
import { IdentityModule } from './identity/identity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { StorageModule } from './storage/storage.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamModule } from './team/team.module';
import { TenantsModule } from './tenants/tenants.module';
import { TimelinesModule } from './timelines/timelines.module';
import { VendorsModule } from './vendors/vendors.module';

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
    TasksModule,
    ConfirmationsModule,
    AssetsModule,
    AiModule,
    ContractsModule,
    FinanceModule,
    TeamModule,
    ArchiveModule,
    StorageModule,
    SuperAdminModule,
    TimelinesModule,
    CoupleModule,
    PlatformModule,
    ChannelsModule,
    MaterialsModule,
    MiniModule,
    ProcessTemplatesModule,
    VendorsModule
  ],
  controllers: [AppController, HealthController],
  providers: [HealthService]
})
export class AppModule {}
