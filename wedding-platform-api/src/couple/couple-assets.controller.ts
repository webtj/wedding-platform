import { Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { createAnnotationSchema } from '@wedding/shared';
import { AssetsService } from '../assets/assets.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { CoupleAccessService } from './couple-access.service';

@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleAssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CoupleAccessService,
    private readonly assetsService: AssetsService
  ) {}

  @Get('projects/:projectId/assets')
  async list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
    return this.prisma.asset.findMany({
      where: { tenantId: tenant.tenantId, projectId, status: 'ready' },
      include: { annotations: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('assets/:assetId/preview-intent')
  async previewIntent(@Req() request: { auth?: AuthContext }, @Param('assetId') assetId: string) {
    const tenant = requireTenant(request.auth);
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: tenant.tenantId }
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId: asset.projectId });
    return this.assetsService.createPreviewIntent({ tenantId: tenant.tenantId, assetId });
  }

  @Post('assets/:assetId/annotations')
  async createAnnotation(
    @Req() request: { auth?: AuthContext },
    @Param('assetId') assetId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: tenant.tenantId }
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId: asset.projectId });
    return this.assetsService.createAnnotation({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      assetId,
      data: createAnnotationSchema.parse(body)
    });
  }
}
