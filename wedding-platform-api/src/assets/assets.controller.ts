import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createAnnotationSchema, createAssetUploadIntentSchema, updateAnnotationSchema } from './dto';
import { AssetsService } from './assets.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @RequirePermissions(PERMISSIONS.ASSET_READ)
  @Get('projects/:projectId/assets')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.ASSET_UPLOAD)
  @Post('projects/:projectId/assets/upload-intents')
  createUploadIntent(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.createUploadIntent({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createAssetUploadIntentSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.ASSET_UPLOAD)
  @Post('assets/:assetId/mark-ready')
  markReady(@Req() request: { auth?: AuthContext }, @Param('assetId') assetId: string) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.markReady({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      assetId
    });
  }

  @RequirePermissions(PERMISSIONS.ASSET_READ)
  @Get('assets/:assetId/annotations')
  listAnnotations(@Req() request: { auth?: AuthContext }, @Param('assetId') assetId: string) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.listAnnotations({ tenantId: tenant.tenantId, assetId });
  }

  @RequirePermissions(PERMISSIONS.ASSET_COMMENT)
  @Post('assets/:assetId/annotations')
  createAnnotation(@Req() request: { auth?: AuthContext }, @Param('assetId') assetId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.createAnnotation({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      assetId,
      data: createAnnotationSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.ASSET_COMMENT)
  @Patch('asset-annotations/:annotationId')
  updateAnnotation(@Req() request: { auth?: AuthContext }, @Param('annotationId') annotationId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.updateAnnotation({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      annotationId,
      data: updateAnnotationSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.ASSET_READ)
  @Get('assets/:assetId/preview-intent')
  previewIntent(@Req() request: { auth?: AuthContext }, @Param('assetId') assetId: string) {
    const tenant = requireTenant(request.auth);
    return this.assetsService.createPreviewIntent({ tenantId: tenant.tenantId, assetId });
  }
}
