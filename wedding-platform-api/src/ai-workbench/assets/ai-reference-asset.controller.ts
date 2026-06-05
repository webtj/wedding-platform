import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReferenceAssetRole } from '@prisma/client';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireTenant } from '../../common/tenant-context';
import { AiReferenceAssetService } from './ai-reference-asset.service';

@Controller('ai/reference-assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiReferenceAssetController {
  constructor(private readonly service: AiReferenceAssetService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
    },
  }))
  async create(
    @Req() request: { auth?: AuthContext },
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body('role') role: ReferenceAssetRole,
    @Body('projectId') projectId?: string,
    @Body('conversationId') conversationId?: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.service.createFromFile({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      file,
      role,
      projectId,
      conversationId,
    });
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get()
  async list(
    @Req() request: { auth?: AuthContext },
    @Query('projectId') projectId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.service.list(tenant.tenantId, projectId, conversationId);
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Delete(':id')
  async delete(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.service.delete(tenant.tenantId, id);
  }
}
