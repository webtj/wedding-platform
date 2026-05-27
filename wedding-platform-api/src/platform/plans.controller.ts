import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { createPlanDtoSchema, updatePlanDtoSchema } from './dto';
import { PlansService } from './plans.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @RequirePermissions(PERMISSIONS.PLATFORM_PLAN_READ)
  @Get()
  list() { return this.plansService.list(); }

  @RequirePermissions(PERMISSIONS.PLATFORM_PLAN_MANAGE)
  @Post()
  create(@Body() body: unknown) { return this.plansService.create(createPlanDtoSchema.parse(body)); }

  @RequirePermissions(PERMISSIONS.PLATFORM_PLAN_MANAGE)
  @Put(':planId')
  update(@Param('planId') planId: string, @Body() body: unknown) { return this.plansService.update(planId, updatePlanDtoSchema.parse(body)); }
}
