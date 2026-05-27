import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createTimelineItemSchema, reorderTimelineItemsSchema, updateTimelineItemSchema } from './dto';
import { TimelinesService } from './timelines.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class TimelinesController {
  constructor(private readonly timelinesService: TimelinesService) {}

  @RequirePermissions(PERMISSIONS.TIMELINE_READ)
  @Get('projects/:projectId/timeline-items')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.timelinesService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.TIMELINE_MANAGE)
  @Post('projects/:projectId/timeline-items')
  create(
    @Req() request: { auth?: AuthContext },
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    return this.timelinesService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createTimelineItemSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.TIMELINE_MANAGE)
  @Patch('timeline-items/:timelineItemId')
  update(
    @Req() request: { auth?: AuthContext },
    @Param('timelineItemId') timelineItemId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    return this.timelinesService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      timelineItemId,
      data: updateTimelineItemSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.TIMELINE_MANAGE)
  @Put('projects/:projectId/timeline-items/reorder')
  reorder(
    @Req() request: { auth?: AuthContext },
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    return this.timelinesService.reorder({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: reorderTimelineItemsSchema.parse(body)
    });
  }
}
