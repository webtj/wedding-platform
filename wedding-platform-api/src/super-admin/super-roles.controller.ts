import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { assignRoleMenusSchema, createTenantRoleSchema, updateTenantRoleSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { SuperRolesService } from './super-roles.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('super/roles')
export class SuperRolesController {
  constructor(private readonly superRolesService: SuperRolesService) {}

  @Get()
  list(@Query('search') search?: string, @Query('tenantId') tenantId?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.superRolesService.list({
      search,
      tenantId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @Get(':roleId')
  getById(@Param('roleId') roleId: string) {
    return this.superRolesService.getById(roleId);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.superRolesService.create(createTenantRoleSchema.parse(body));
  }

  @Patch(':roleId')
  update(@Param('roleId') roleId: string, @Body() body: unknown) {
    return this.superRolesService.update(roleId, updateTenantRoleSchema.parse(body));
  }

  @Delete(':roleId')
  delete(@Param('roleId') roleId: string) {
    return this.superRolesService.delete(roleId);
  }

  @Get(':roleId/menus')
  getMenus(@Param('roleId') roleId: string) {
    return this.superRolesService.getMenusForRole(roleId);
  }

  @Put(':roleId/menus')
  assignMenus(@Param('roleId') roleId: string, @Body() body: unknown) {
    return this.superRolesService.assignMenus({
      roleId,
      data: assignRoleMenusSchema.parse(body)
    });
  }
}
