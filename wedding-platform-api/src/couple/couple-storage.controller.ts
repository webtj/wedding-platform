import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { CoupleAccessService } from './couple-access.service';

@UseGuards(JwtAuthGuard)
@Controller('couple/projects/:projectId/post-wedding-storage')
export class CoupleStorageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CoupleAccessService
  ) {}

  @Get()
  async get(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    const project = await this.access.requireCoupleProject({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId
    });
    const [policy, packages, assets] = await Promise.all([
      this.prisma.assetRetentionPolicy.findFirst({ where: { tenantId: tenant.tenantId, projectId } }),
      this.prisma.archivePackage.findMany({
        where: {
          tenantId: tenant.tenantId,
          projectId,
          status: 'ready',
          type: { in: ['couple_delivery', 'full_project'] }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.asset.findMany({
        where: { tenantId: tenant.tenantId, projectId, status: 'ready' },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    return {
      project,
      isPostWedding: project.status === ProjectStatus.completed,
      policy,
      packages,
      assets
    };
  }
}
