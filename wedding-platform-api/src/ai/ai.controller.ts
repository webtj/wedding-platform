import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createAiJobSchema } from './dto';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('jobs')
  createJob(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiService.createJob({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createAiJobSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Get('outputs')
  listOutputs(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.aiService.listOutputs({
      tenantId: tenant.tenantId,
      projectId
    });
  }
}
