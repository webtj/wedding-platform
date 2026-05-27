import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createProcessTemplateSchema, updateProcessTemplateSchema, createTemplateStageSchema, updateTemplateStageSchema, createTemplateTaskSchema, updateTemplateTaskSchema, createChecklistItemSchema } from './dto';
import { ProcessTemplatesService } from './process-templates.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('templates')
export class ProcessTemplatesController {
  constructor(private readonly service: ProcessTemplatesService) {}

  @RequirePermissions(PERMISSIONS.TEMPLATE_READ)
  @Get()
  list(@Req() r: { auth?: AuthContext }, @Query('search') s?: string, @Query('category') c?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    const t = requireTenant(r.auth);
    return this.service.list({ tenantId: t.tenantId, search: s, category: c, page: p ? +p : undefined, pageSize: ps ? +ps : undefined });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post()
  create(@Req() r: { auth?: AuthContext }, @Body() b: unknown) {
    return this.service.create({ tenantId: requireTenant(r.auth).tenantId, data: createProcessTemplateSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_READ)
  @Get(':templateId')
  get(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string) {
    return this.service.get({ tenantId: requireTenant(r.auth).tenantId, templateId: tid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Patch(':templateId')
  update(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string, @Body() b: unknown) {
    return this.service.update({ tenantId: requireTenant(r.auth).tenantId, templateId: tid, data: updateProcessTemplateSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Delete(':templateId')
  delete(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string) {
    return this.service.delete({ tenantId: requireTenant(r.auth).tenantId, templateId: tid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post(':templateId/duplicate')
  duplicate(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string) {
    return this.service.duplicate({ tenantId: requireTenant(r.auth).tenantId, templateId: tid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post(':templateId/stages')
  addStage(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string, @Body() b: unknown) {
    return this.service.addStage({ tenantId: requireTenant(r.auth).tenantId, templateId: tid, data: createTemplateStageSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Patch('stages/:stageId')
  updateStage(@Req() r: { auth?: AuthContext }, @Param('stageId') sid: string, @Body() b: unknown) {
    return this.service.updateStage({ tenantId: requireTenant(r.auth).tenantId, stageId: sid, data: updateTemplateStageSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Delete('stages/:stageId')
  deleteStage(@Req() r: { auth?: AuthContext }, @Param('stageId') sid: string) {
    return this.service.deleteStage({ tenantId: requireTenant(r.auth).tenantId, stageId: sid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Put(':templateId/stages/reorder')
  reorderStages(@Req() r: { auth?: AuthContext }, @Param('templateId') tid: string, @Body() b: { items: { id: string; sortOrder: number }[] }) {
    return this.service.reorderStages({ tenantId: requireTenant(r.auth).tenantId, templateId: tid, items: b.items });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post('stages/:stageId/tasks')
  addTask(@Req() r: { auth?: AuthContext }, @Param('stageId') sid: string, @Body() b: unknown) {
    return this.service.addTask({ tenantId: requireTenant(r.auth).tenantId, stageId: sid, data: createTemplateTaskSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Patch('tasks/:taskId')
  updateTask(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: unknown) {
    return this.service.updateTask({ tenantId: requireTenant(r.auth).tenantId, taskId: tid, data: updateTemplateTaskSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Delete('tasks/:taskId')
  deleteTask(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string) {
    return this.service.deleteTask({ tenantId: requireTenant(r.auth).tenantId, taskId: tid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Put('stages/:stageId/tasks/reorder')
  reorderTasks(@Req() r: { auth?: AuthContext }, @Param('stageId') sid: string, @Body() b: { items: { id: string; sortOrder: number }[] }) {
    return this.service.reorderTasks({ tenantId: requireTenant(r.auth).tenantId, stageId: sid, items: b.items });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post('tasks/:taskId/checklist-items')
  addChecklistItem(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: unknown) {
    return this.service.addChecklistItem({ tenantId: requireTenant(r.auth).tenantId, taskId: tid, data: createChecklistItemSchema.parse(b) });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Delete('checklist-items/:itemId')
  deleteChecklistItem(@Req() r: { auth?: AuthContext }, @Param('itemId') iid: string) {
    return this.service.deleteChecklistItem({ tenantId: requireTenant(r.auth).tenantId, itemId: iid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_READ)
  @Get('tasks/:taskId/assignees')
  getTaskAssignees(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string) {
    return this.service.getTaskAssignees({ tenantId: requireTenant(r.auth).tenantId, taskId: tid });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Post('tasks/:taskId/assignees')
  addTaskAssignee(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: { memberId: string }) {
    return this.service.addTaskAssignee({ tenantId: requireTenant(r.auth).tenantId, taskId: tid, memberId: b.memberId });
  }

  @RequirePermissions(PERMISSIONS.TEMPLATE_MANAGE)
  @Delete('task-assignees/:id')
  removeTaskAssignee(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    return this.service.removeTaskAssignee({ tenantId: requireTenant(r.auth).tenantId, id });
  }
}
