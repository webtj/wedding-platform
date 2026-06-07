import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { TeamService } from './team.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('team/members')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('search') search?: string,
    @Query('roleCode') roleCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.teamService.listMembers({
      tenantId: tenant.tenantId,
      search,
      roleCode,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @Get('filter-options')
  filterOptions(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.teamService.listRolesForFilter(tenant.tenantId).then((roles) => ({ roles }));
  }

  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @Get(':id')
  getById(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.teamService.getById(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.MEMBER_MANAGE)
  @Post()
  create(
    @Req() request: { auth?: AuthContext },
    @Body() body: { identifier: string; password: string; displayName: string; roleIds: string[] }
  ) {
    const tenant = requireTenant(request.auth);
    return this.teamService.createAccount(tenant.tenantId, {
      identifier: body.identifier,
      password: body.password,
      displayName: body.displayName,
      roleIds: body.roleIds
    });
  }

  @RequirePermissions(PERMISSIONS.MEMBER_MANAGE)
  @Patch(':id')
  update(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body: { displayName?: string; status?: string; password?: string; roleIds?: string[] }
  ) {
    const tenant = requireTenant(request.auth);
    return this.teamService.update(tenant.tenantId, id, {
      displayName: body.displayName,
      status: body.status as any,
      password: body.password,
      roleIds: body.roleIds
    });
  }

  @RequirePermissions(PERMISSIONS.MEMBER_MANAGE)
  @Delete(':id')
  delete(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.teamService.delete(tenant.tenantId, id);
  }
}
