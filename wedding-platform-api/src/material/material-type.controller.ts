import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PERMISSIONS } from '@wedding/shared';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant, getTenantContext } from '../common/tenant-context';
import { createMaterialTypeSchema, updateMaterialTypeSchema } from './dto';
import { MaterialTypeService } from './material-type.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('material-types')
export class MaterialTypeController {
  constructor(private readonly materialTypeService: MaterialTypeService) {}

  @RequirePermissions(PERMISSIONS.MATERIAL_TYPE_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const ctx = getTenantContext(request.auth);
    return this.materialTypeService.list(
      ctx.tenantId,
      search,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20
    );
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_TYPE_READ)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.materialTypeService.getById(id);
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_TYPE_MANAGE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.materialTypeService.create(tenant.tenantId, createMaterialTypeSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_TYPE_MANAGE)
  @Put(':id')
  update(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    return this.materialTypeService.update(id, tenant.tenantId, updateMaterialTypeSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_TYPE_MANAGE)
  @Delete(':id')
  delete(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.materialTypeService.delete(id, tenant.tenantId);
  }
}
