import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createSceneSchema, updateSceneSchema, sceneQuerySchema, autoArrangeSchema, suggestLayoutSchema, generateSeatCardsSchema } from './dto';
import { ScenesService } from './scenes.service';
import { SceneAiService } from './scene-ai.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('scenes')
export class ScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly sceneAiService: SceneAiService,
  ) {}

  @RequirePermissions(PERMISSIONS.SCENE_READ)
  @Get()
  list(@Req() request: { auth?: AuthContext }, @Query() query: Record<string, string>) {
    const tenant = requireTenant(request.auth);
    const parsed = sceneQuerySchema.parse({
      projectId: query.projectId,
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20
    });
    return this.scenesService.list(tenant.tenantId, parsed);
  }

  @RequirePermissions(PERMISSIONS.SCENE_READ)
  @Get('by-project/:projectId')
  getByProject(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.scenesService.getByProject(tenant.tenantId, projectId);
  }

  @RequirePermissions(PERMISSIONS.SCENE_READ)
  @Get(':id')
  get(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.scenesService.get(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.SCENE_CREATE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.scenesService.create(tenant.tenantId, createSceneSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.SCENE_UPDATE)
  @Put(':id')
  update(@Req() request: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.scenesService.update(tenant.tenantId, id, updateSceneSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.SCENE_DELETE)
  @Delete(':id')
  delete(@Req() request: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(request.auth);
    return this.scenesService.delete(tenant.tenantId, id);
  }

  // ── AI-Powered Scene Endpoints ──────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.SCENE_UPDATE)
  @Post(':id/auto-arrange')
  autoArrange(@Req() request: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.sceneAiService.autoArrange(tenant.tenantId, id, autoArrangeSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.SCENE_UPDATE)
  @Post(':id/suggest-layout')
  suggestLayout(@Req() request: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.sceneAiService.suggestLayout(tenant.tenantId, id, suggestLayoutSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.SCENE_UPDATE)
  @Post(':id/seat-cards')
  generateSeatCards(@Req() request: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.sceneAiService.generateSeatCards(tenant.tenantId, id, generateSeatCardsSchema.parse(body));
  }
}
