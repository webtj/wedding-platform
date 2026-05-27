import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { createAiOutputVersionSchema, refineAiOutputSchema, PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { AiVersionsService } from './ai-versions.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/outputs/:outputId')
export class AiVersionsController {
  constructor(private readonly aiVersionsService: AiVersionsService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Get('versions')
  list(@Req() request: { auth?: AuthContext }, @Param('outputId') outputId: string) {
    const tenant = requireTenant(request.auth);
    return this.aiVersionsService.list({ tenantId: tenant.tenantId, outputId });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('versions')
  createVersion(@Req() request: { auth?: AuthContext }, @Param('outputId') outputId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiVersionsService.createVersion({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      outputId,
      data: createAiOutputVersionSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('refine')
  refine(@Req() request: { auth?: AuthContext }, @Param('outputId') outputId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiVersionsService.refine({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      outputId,
      data: refineAiOutputSchema.parse(body)
    });
  }
}
