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
    const tenant = requireTenant(r.auth);
    return this.service.listCategories({ tenantId: tenant.tenantId });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('material-categories')
  createCategory(@Req() r: { auth?: AuthContext }, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.createCategory({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      data: createMaterialCategorySchema.parse(b)
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('material-categories/:id')
  updateCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.updateCategory({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      categoryId: id,
      data: updateMaterialCategorySchema.parse(b)
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('material-categories/:id')
  deleteCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(r.auth);
    return this.service.deleteCategory({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      categoryId: id
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('materials')
  listMaterials(@Req() r: { auth?: AuthContext }, @Query('categoryId') cid?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    const tenant = requireTenant(r.auth);
    return this.service.listMaterials({
      tenantId: tenant.tenantId,
      categoryId: cid,
      page: p ? +p : undefined,
      pageSize: ps ? +ps : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('materials')
  createMaterial(@Req() r: { auth?: AuthContext }, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.createMaterial({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      data: createMaterialSchema.parse(b)
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('materials/:id')
  updateMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.updateMaterial({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      materialId: id,
      data: updateMaterialSchema.parse(b)
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('materials/:id')
  deleteMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(r.auth);
    return this.service.deleteMaterial({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      materialId: id
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('tasks/:taskId/materials')
  getTaskMaterials(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string) {
    const tenant = requireTenant(r.auth);
    return this.service.getTaskMaterials({ tenantId: tenant.tenantId, taskId: tid });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('tasks/:taskId/materials')
  addTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    const d = linkTaskMaterialSchema.parse(b);
    return this.service.addTaskMaterial({
      tenantId: tenant.tenantId,
      taskId: tid,
      materialId: d.materialId
    });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('task-materials/:id')
  removeTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(r.auth);
    return this.service.removeTaskMaterial({ tenantId: tenant.tenantId, id });
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('task-materials/:id/confirm')
  confirmTaskMaterial(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() b: unknown) {
    const tenant = requireTenant(r.auth);
    const d = confirmTaskMaterialSchema.parse(b);
    return this.service.confirmTaskMaterial({
      tenantId: tenant.tenantId,
      id,
      confirmed: d.confirmed
    });
  }
}
