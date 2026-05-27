import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { coupleConfirmationStatusFilterSchema, respondConfirmationSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { ConfirmationsService } from '../confirmations/confirmations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoupleAccessService } from './couple-access.service';

@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleConfirmationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CoupleAccessService,
    private readonly confirmationsService: ConfirmationsService
  ) {}

  @Get('projects/:projectId/confirmations')
  async list(
    @Req() request: { auth?: AuthContext },
    @Param('projectId') projectId: string,
    @Query('status') status?: string
  ) {
    const tenant = requireTenant(request.auth);
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
    const filter = coupleConfirmationStatusFilterSchema.parse({ status });
    return this.prisma.confirmation.findMany({
      where: {
        tenantId: tenant.tenantId,
        projectId,
        ...(filter.status ? { status: filter.status } : {})
      },
      include: { events: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post('confirmations/:confirmationId/respond')
  async respond(
    @Req() request: { auth?: AuthContext },
    @Param('confirmationId') confirmationId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    const confirmation = await this.prisma.confirmation.findFirst({
      where: { id: confirmationId, tenantId: tenant.tenantId }
    });
    if (!confirmation) {
      throw new NotFoundException('Confirmation not found');
    }
    await this.access.requireCoupleProject({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId: confirmation.projectId
    });
    return this.confirmationsService.respond({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      confirmationId,
      data: respondConfirmationSchema.parse(body)
    });
  }
}
