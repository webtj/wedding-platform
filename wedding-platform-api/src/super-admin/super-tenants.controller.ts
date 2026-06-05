import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createTenantAdminSchema, updateTenantAdminSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { SuperTenantsService } from './super-tenants.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/tenants')
export class SuperTenantsController {
  constructor(private readonly superTenantsService: SuperTenantsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.superTenantsService.list(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
      search,
      status
    );
  }

  @Get(':tenantId')
  getById(@Param('tenantId') tenantId: string) {
    return this.superTenantsService.getById(tenantId);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.superTenantsService.create(createTenantAdminSchema.parse(body));
  }

  @Patch(':tenantId')
  update(@Param('tenantId') tenantId: string, @Body() body: unknown) {
    return this.superTenantsService.update({
      tenantId,
      data: updateTenantAdminSchema.parse(body)
    });
  }

  @Delete(':tenantId')
  delete(@Param('tenantId') tenantId: string) {
    return this.superTenantsService.delete(tenantId);
  }
}
