import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { RolesService } from './roles.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('team/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions(PERMISSIONS.ROLE_READ)
  @Get()
  list(@Req() request: { auth?: AuthContext }, @Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const tenant = requireTenant(request.auth);
    return this.rolesService.list({
      tenantId: tenant.tenantId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }
}
