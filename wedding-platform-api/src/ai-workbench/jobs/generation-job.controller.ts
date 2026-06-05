import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireTenant } from '../../common/tenant-context';
import { GenerationJobService } from './generation-job.service';
import { GenerationEventsService, GenerationEvent } from '../events/generation-events.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai')
export class GenerationJobController {
  constructor(
    private readonly jobService: GenerationJobService,
    private readonly eventsService: GenerationEventsService,
  ) {}

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get('generation-jobs/:id')
  getJob(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.jobService.findById(id, tenant.tenantId);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Sse('conversations/:id/events')
  streamEvents(
    @Req() request: { auth?: AuthContext },
    @Param('id') conversationId: string,
  ): Observable<{ data: GenerationEvent }> {
    const tenant = requireTenant(request.auth);
    // Subscribe to all events for this tenant; clients filter by conversationId on the frontend
    return this.eventsService.getEvents(conversationId).pipe(
      map((event) => ({ data: event })),
    );
  }
}
