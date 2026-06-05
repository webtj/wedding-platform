import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { assignRoleMenusSchema, createTenantRoleSchema, updateTenantRoleSchema } from '@wedding/shared';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { SuperRolesService } from './super-roles.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/roles')
export class SuperRolesController {
  constructor(private readonly superRolesService: SuperRolesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.superRolesService.list({
      auth,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @Get(':roleId')
  getById(@CurrentAuth() auth: AuthContext, @Param('roleId') roleId: string) {
    return this.superRolesService.getById(auth, roleId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.superRolesService.create(auth, createTenantRoleSchema.parse(body));
  }

  @Patch(':roleId')
  update(@CurrentAuth() auth: AuthContext, @Param('roleId') roleId: string, @Body() body: unknown) {
    return this.superRolesService.update(auth, roleId, updateTenantRoleSchema.parse(body));
  }

  @Delete(':roleId')
  delete(@CurrentAuth() auth: AuthContext, @Param('roleId') roleId: string) {
    return this.superRolesService.delete(auth, roleId);
  }

  @Get(':roleId/menus')
  getMenus(@CurrentAuth() auth: AuthContext, @Param('roleId') roleId: string) {
    return this.superRolesService.getMenusForRole(auth, roleId);
  }

  @Put(':roleId/menus')
  assignMenus(@CurrentAuth() auth: AuthContext, @Param('roleId') roleId: string, @Body() body: unknown) {
    return this.superRolesService.assignMenus(auth, roleId, assignRoleMenusSchema.parse(body));
  }
}
