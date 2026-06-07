import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Public } from '../common/auth/public.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createContractSchema, updateContractSchema } from './dto';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('contracts/recent')
  recent(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.recent({ tenantId: tenant.tenantId });
  }

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

  // Public endpoints for contract signing (no auth required)
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('contracts/sign/:token')
  getForSigning(@Param('token') token: string) {
    return this.contractsService.getBySignToken(token);
  }

  private static signSchema = z.object({
    signatureData: z.string().max(500000).optional(),
    rejectReason: z.string().max(500).optional(),
  }).refine((d) => d.signatureData || d.rejectReason, { message: '必须提供签名或拒绝原因' });

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('contracts/sign/:token')
  sign(@Param('token') token: string, @Body() body: unknown) {
    const data = ContractsController.signSchema.parse(body);
    if (data.signatureData) {
      return this.contractsService.sign(token, data.signatureData);
    }
    return this.contractsService.reject(token, data.rejectReason!);
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

  @RequirePermissions(PERMISSIONS.CONTRACT_MANAGE)
  @Post('contracts/:contractId/reissue-sign-token')
  reissueSignToken(
    @Req() request: { auth?: AuthContext },
    @Param('contractId') contractId: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.contractsService.reissueSignToken({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      contractId
    });
  }
}
