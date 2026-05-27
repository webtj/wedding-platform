import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { AiTemplatesService } from './ai-templates.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/templates')
export class AiTemplatesController {
  constructor(private readonly aiTemplatesService: AiTemplatesService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Get()
  list(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.aiTemplatesService.list({ tenantId: tenant.tenantId });
  }
}
