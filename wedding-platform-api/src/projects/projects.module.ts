import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessTemplatesModule } from '../process-templates/process-templates.module';
import { ProjectOperationsController } from './project-operations.controller';
import { ProjectOperationsService } from './project-operations.service';
import { ProjectStagesController } from './project-stages.controller';
import { ProjectStagesService } from './project-stages.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [IdentityModule, AuditModule, NotificationsModule, ProcessTemplatesModule],
  controllers: [ProjectOperationsController, ProjectsController, ProjectStagesController],
  providers: [ProjectsService, ProjectOperationsService, ProjectStagesService],
  exports: [ProjectsService, ProjectOperationsService, ProjectStagesService]
})
export class ProjectsModule {}
