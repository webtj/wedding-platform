import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { convertLeadSchema, createLeadFollowupSchema, createLeadSchema, updateLeadSchema } from './dto';
import { LeadsService } from './leads.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.list({
      tenantId: tenant.tenantId,
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get(':leadId')
  get(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.get({ tenantId: tenant.tenantId, leadId });
  }

  @RequirePermissions(PERMISSIONS.LEAD_CREATE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      data: createLeadSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Patch(':leadId')
  update(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      leadId,
      data: updateLeadSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Post(':leadId/followups')
  addFollowup(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.addFollowup({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      leadId,
      data: createLeadFollowupSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Delete(':leadId')
  delete(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.delete({ tenantId: tenant.tenantId, leadId });
  }

  @RequirePermissions(PERMISSIONS.LEAD_CONVERT)
  @Post(':leadId/contract')
  createContract(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.createContract({
      tenantId: tenant.tenantId,
      leadId,
      data: body as { contractNo: string; title: string; amountCents: number }
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_CONVERT)
  @Post(':leadId/convert')
  convert(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.convert({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      memberId: tenant.memberId,
      leadId,
      data: convertLeadSchema.parse(body)
    });
  }
}
