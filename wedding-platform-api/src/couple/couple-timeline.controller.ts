import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { TimelinesService } from '../timelines/timelines.service';
import { CoupleAccessService } from './couple-access.service';

@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleTimelineController {
  constructor(
    private readonly access: CoupleAccessService,
    private readonly timelinesService: TimelinesService
  ) {}

  @Get('projects/:projectId/timeline')
  async list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
    return this.timelinesService.list({ tenantId: tenant.tenantId, projectId, coupleOnly: true });
  }
}
