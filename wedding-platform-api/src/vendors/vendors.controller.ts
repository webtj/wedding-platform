import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createVendorDtoSchema, updateVendorDtoSchema } from './dto';
import { VendorsService } from './vendors.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @RequirePermissions(PERMISSIONS.VENDOR_READ)
  @Get()
  list(@Req() request: { auth?: AuthContext }) { const tenant = requireTenant(request.auth); return this.vendorsService.list({ tenantId: tenant.tenantId }); }

  @RequirePermissions(PERMISSIONS.VENDOR_MANAGE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) { const tenant = requireTenant(request.auth); return this.vendorsService.create({ tenantId: tenant.tenantId, userId: tenant.userId, data: createVendorDtoSchema.parse(body) }); }

  @RequirePermissions(PERMISSIONS.VENDOR_MANAGE)
  @Put(':vendorId')
  update(@Req() request: { auth?: AuthContext }, @Param('vendorId') vendorId: string, @Body() body: unknown) { const tenant = requireTenant(request.auth); return this.vendorsService.update({ tenantId: tenant.tenantId, vendorId, data: updateVendorDtoSchema.parse(body) }); }
}
