import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createAccountSchema, updateAccountSchema } from '@wedding/shared';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { SuperUsersService } from './super-users.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/users')
export class SuperUsersController {
  constructor(private readonly superUsersService: SuperUsersService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query('search') search?: string,
    @Query('roleCode') roleCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.superUsersService.list({
      auth,
      search,
      roleCode,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @Get('filter-options')
  filterOptions(@CurrentAuth() auth: AuthContext) {
    return Promise.all([
      this.superUsersService.listTenantsForFilter(auth),
      this.superUsersService.listRolesForFilter(auth)
    ]).then(([tenants, roles]) => ({ tenants, roles }));
  }

  @Get(':userId')
  getById(@CurrentAuth() auth: AuthContext, @Param('userId') userId: string) {
    return this.superUsersService.getById(auth, userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.superUsersService.create(auth, createAccountSchema.parse(body));
  }

  @Patch(':userId')
  update(@CurrentAuth() auth: AuthContext, @Param('userId') userId: string, @Body() body: unknown) {
    return this.superUsersService.update(auth, { userId, data: updateAccountSchema.parse(body) });
  }

  @Delete(':userId')
  delete(@CurrentAuth() auth: AuthContext, @Param('userId') userId: string) {
    return this.superUsersService.delete(auth, userId);
  }
}
