import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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

  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Post()
  create(@Req() request: any, @Body() body: { code: string; name: string; description?: string; permissionIds?: string[]; menuItemIds?: string[] }) {
    const tenant = requireTenant(request.auth);
    return this.rolesService.create({
      tenantId: tenant.tenantId,
      code: body.code,
      name: body.name,
      description: body.description,
      permissionIds: body.permissionIds,
      menuItemIds: body.menuItemIds,
      userId: tenant.userId
    });
  }

  @RequirePermissions(PERMISSIONS.ROLE_READ)
  @Get(':id')
  getById(@Req() request: any, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.rolesService.getById({
      id,
      tenantId: tenant.tenantId
    });
  }

  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Patch(':id')
  update(@Req() request: any, @Param('id') id: string, @Body() body: { name?: string; description?: string; permissionIds?: string[]; menuItemIds?: string[] }) {
    const tenant = requireTenant(request.auth);
    return this.rolesService.update({
      id,
      tenantId: tenant.tenantId,
      name: body.name,
      description: body.description,
      permissionIds: body.permissionIds,
      menuItemIds: body.menuItemIds,
      userId: tenant.userId
    });
  }

  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Delete(':id')
  delete(@Req() request: any, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.rolesService.delete({
      id,
      tenantId: tenant.tenantId
    });
  }
}
