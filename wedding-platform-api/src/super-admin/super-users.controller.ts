import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createAccountSchema, updateAccountSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { SuperUsersService } from './super-users.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('super/users')
export class SuperUsersController {
  constructor(private readonly superUsersService: SuperUsersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('roleCode') roleCode?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.superUsersService.list({
      search,
      tenantId,
      roleCode,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @Get('filter-options')
  filterOptions() {
    return Promise.all([
      this.superUsersService.listTenantsForFilter(),
      this.superUsersService.listRolesForFilter()
    ]).then(([tenants, roles]) => ({ tenants, roles }));
  }

  @Get(':userId')
  getById(@Param('userId') userId: string) {
    return this.superUsersService.getById(userId);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.superUsersService.create(createAccountSchema.parse(body));
  }

  @Patch(':userId')
  update(@Param('userId') userId: string, @Body() body: unknown) {
    return this.superUsersService.update({ userId, data: updateAccountSchema.parse(body) });
  }

  @Delete(':userId')
  delete(@Param('userId') userId: string) {
    return this.superUsersService.delete(userId);
  }
}
