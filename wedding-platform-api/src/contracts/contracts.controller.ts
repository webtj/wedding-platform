import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Public } from '../common/auth/public.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createContractItemSchema, createContractSchema, createPaymentRecordSchema, updateContractSchema } from './dto';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('contracts')
  listAll(
    @Req() request: { auth?: AuthContext },
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.listAll({
      tenantId: tenant.tenantId, status, search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('contracts/:contractId')
  getOne(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.getById({ tenantId: tenant.tenantId, contractId });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('projects/:projectId/contracts')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Post('projects/:projectId/contracts')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createContractSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Patch('contracts/:contractId')
  update(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      contractId,
      data: updateContractSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Post('contracts/:contractId/items')
  addItem(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.addItem({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      contractId,
      data: createContractItemSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PAYMENT_RECORD)
  @Post('contracts/:contractId/payments')
  addPayment(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.addPayment({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      contractId,
      data: createPaymentRecordSchema.parse(body)
    });
  }

  // Public endpoints for contract signing (no auth required)
  @Public()
  @Get('contracts/sign/:token')
  getForSigning(@Param('token') token: string) {
    return this.contractsService.getBySignToken(token);
  }

  @Public()
  @Post('contracts/sign/:token')
  sign(@Param('token') token: string, @Body() body: { signatureData?: string; rejectReason?: string }) {
    if (body.signatureData) {
      return this.contractsService.sign(token, body.signatureData);
    }
    if (body.rejectReason !== undefined) {
      return this.contractsService.reject(token, body.rejectReason);
    }
    throw new Error('Invalid action');
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Delete('contracts/:contractId')
  delete(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.delete({ tenantId: tenant.tenantId, contractId });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Post('contracts/:contractId/void')
  void(@Req() request: { auth?: AuthContext }, @Param('contractId') contractId: string) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.void({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      contractId
    });
  }
}
