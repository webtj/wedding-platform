import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { updateProjectSchema } from './dto';
import { ProcessTemplatesService } from '../process-templates/process-templates.service';
import { ProjectOperationsService } from './project-operations.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectOperationsController {
  constructor(
    private readonly projectOperationsService: ProjectOperationsService,
    private readonly processTemplatesService: ProcessTemplatesService
  ) {}

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.projectOperationsService.listOperations({
      tenantId: tenant.tenantId, status, search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('operations')
  listOperations(
    @Req() request: { auth?: AuthContext },
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.projectOperationsService.listOperations({
      tenantId: tenant.tenantId, status, search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_CREATE)
  @Post('from-contract')
  createFromContract(@Req() request: { auth?: AuthContext }, @Body() body: any) {
    const tenant = requireTenant(request.auth);
    return this.projectOperationsService.createFromContract({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      memberId: tenant.memberId,
      contractId: body.contractId,
      data: {
        brideName: body.brideName,
        groomName: body.groomName,
        weddingDate: body.weddingDate,
        ceremonyType: body.ceremonyType,
        venue: body.venue,
        guestCount: body.guestCount,
        colorTheme: body.colorTheme,
        style: body.style,
        specialRequirements: body.specialRequirements,
        plannerId: body.plannerId
      }
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Post(':projectId/apply-template')
  applyTemplate(@Req() r: { auth?: AuthContext }, @Param('projectId') pid: string, @Body() b: { templateId: string; reset?: boolean }) {
    const t = requireTenant(r.auth);
    return this.processTemplatesService.applyToProject({ tenantId: t.tenantId, projectId: pid, templateId: b.templateId, reset: b.reset });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get(':projectId/kanban')
  kanban(@Req() r: { auth?: AuthContext }, @Param('projectId') pid: string) {
    return this.projectOperationsService.kanban({ tenantId: requireTenant(r.auth).tenantId, projectId: pid });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get(':projectId/dashboard')
  dashboard(@Req() r: { auth?: AuthContext }, @Param('projectId') pid: string) {
    return this.projectOperationsService.dashboard({ tenantId: requireTenant(r.auth).tenantId, projectId: pid });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Patch(':projectId')
  update(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.projectOperationsService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: updateProjectSchema.parse(body)
    });
  }
}
