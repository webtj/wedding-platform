import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createPublicCaseDtoSchema, updatePublicCaseDtoSchema } from './dto';
import { PublicCasesService } from './public-cases.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PublicCasesController {
  constructor(private readonly publicCasesService: PublicCasesService) {}

  @RequirePermissions(PERMISSIONS.PUBLIC_CASE_READ)
  @Get('public-cases')
  list(@Req() request: { auth?: AuthContext }) { const tenant = requireTenant(request.auth); return this.publicCasesService.list({ tenantId: tenant.tenantId }); }

  @RequirePermissions(PERMISSIONS.PUBLIC_CASE_MANAGE)
  @Post('projects/:projectId/public-case')
  createFromProject(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) { const tenant = requireTenant(request.auth); return this.publicCasesService.createFromProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId, data: createPublicCaseDtoSchema.parse(body) }); }

  @RequirePermissions(PERMISSIONS.PUBLIC_CASE_MANAGE)
  @Put('public-cases/:caseId')
  update(@Req() request: { auth?: AuthContext }, @Param('caseId') caseId: string, @Body() body: unknown) { const tenant = requireTenant(request.auth); return this.publicCasesService.update({ tenantId: tenant.tenantId, caseId, data: updatePublicCaseDtoSchema.parse(body) }); }
}
