import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createMaterialCategorySchema, updateMaterialCategorySchema, createMaterialSchema, updateMaterialSchema, linkTaskMaterialSchema, confirmTaskMaterialSchema } from './dto';
import { MaterialsService } from './materials.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('material-categories')
  listCategories(@Req() r: { auth?: AuthContext }) {
    return this.service.listCategories({ tenantId: requireTenant(r.auth).tenantId });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('material-categories')
  createCategory(@Req() r: { auth?: AuthContext }, @Body() b: unknown) {
    return this.service.createCategory({ tenantId: requireTenant(r.auth).tenantId, data: createMaterialCategorySchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('material-categories/:id')
  updateCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    return this.service.updateCategory({ tenantId: requireTenant(r.auth).tenantId, categoryId: id, data: updateMaterialCategorySchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('material-categories/:id')
  deleteCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    return this.service.deleteCategory({ tenantId: requireTenant(r.auth).tenantId, categoryId: id });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('materials')
  listMaterials(@Req() r: { auth?: AuthContext }, @Query('categoryId') cid?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    return this.service.listMaterials({ tenantId: requireTenant(r.auth).tenantId, categoryId: cid, page: p ? +p : undefined, pageSize: ps ? +ps : undefined });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('materials')
  createMaterial(@Req() r: { auth?: AuthContext }, @Body() b: unknown) {
    return this.service.createMaterial({ tenantId: requireTenant(r.auth).tenantId, data: createMaterialSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('materials/:id')
  updateMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    return this.service.updateMaterial({ tenantId: requireTenant(r.auth).tenantId, materialId: id, data: updateMaterialSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('materials/:id')
  deleteMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    return this.service.deleteMaterial({ tenantId: requireTenant(r.auth).tenantId, materialId: id });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('tasks/:taskId/materials')
  getTaskMaterials(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string) {
    return this.service.getTaskMaterials({ tenantId: requireTenant(r.auth).tenantId, taskId: tid });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('tasks/:taskId/materials')
  addTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: unknown) {
    const d = linkTaskMaterialSchema.parse(b);
    return this.service.addTaskMaterial({ tenantId: requireTenant(r.auth).tenantId, taskId: tid, materialId: d.materialId });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('task-materials/:id')
  removeTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    return this.service.removeTaskMaterial({ tenantId: requireTenant(r.auth).tenantId, id });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('task-materials/:id/confirm')
  confirmTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    const d = confirmTaskMaterialSchema.parse(b);
    return this.service.confirmTaskMaterial({ tenantId: requireTenant(r.auth).tenantId, id, confirmed: d.confirmed });
  }
}
