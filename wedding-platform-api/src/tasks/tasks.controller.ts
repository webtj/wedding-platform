import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createTaskSchema, updateTaskSchema } from './dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @RequirePermissions(PERMISSIONS.TASK_READ)
  @Get('projects/:projectId/tasks')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.tasksService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.TASK_CREATE)
  @Post('projects/:projectId/tasks')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.tasksService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createTaskSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.TASK_ASSIGN)
  @Patch('tasks/:taskId')
  update(@Req() request: { auth?: AuthContext }, @Param('taskId') taskId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.tasksService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      taskId,
      data: updateTaskSchema.parse(body),
    });
  }

  @RequirePermissions(PERMISSIONS.TASK_COMPLETE)
  @Post('tasks/:taskId/complete')
  complete(@Req() request: { auth?: AuthContext }, @Param('taskId') taskId: string) {
    const tenant = requireTenant(request.auth);
    return this.tasksService.complete({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      taskId,
    });
  }

  @RequirePermissions(PERMISSIONS.TASK_ASSIGN)
  @Post('tasks/reorder')
  reorderTasks(
    @Req() request: { auth?: AuthContext },
    @Body() body: { tasks: Array<{ id: string; stageId: string; sortOrder: number }> }
  ) {
    const tenant = requireTenant(request.auth);
    return this.tasksService.reorderTasks({ tenantId: tenant.tenantId, tasks: body.tasks });
  }

  @RequirePermissions(PERMISSIONS.TASK_READ)
  @Get('tasks/:taskId/assignees')
  getAssignees(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string) {
    return this.tasksService.getAssignees({ tenantId: requireTenant(r.auth).tenantId, taskId: tid });
  }

  @RequirePermissions(PERMISSIONS.TASK_ASSIGN)
  @Post('tasks/:taskId/assignees')
  addAssignee(@Req() r: { auth?: AuthContext }, @Param('taskId') tid: string, @Body() b: { memberId: string }) {
    return this.tasksService.addAssignee({ tenantId: requireTenant(r.auth).tenantId, taskId: tid, memberId: b.memberId });
  }

  @RequirePermissions(PERMISSIONS.TASK_ASSIGN)
  @Delete('task-assignees/:id')
  removeAssignee(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    return this.tasksService.removeAssignee({ tenantId: requireTenant(r.auth).tenantId, id });
  }

  @RequirePermissions(PERMISSIONS.TASK_READ)
  @Get('tenant-members')
  listMembers(@Req() r: { auth?: AuthContext }) {
    return this.tasksService.listMembers({ tenantId: requireTenant(r.auth).tenantId });
  }

  @RequirePermissions(PERMISSIONS.TASK_CREATE)
  @Post('tasks/:taskId/subtasks')
  createSubtask(
    @Req() r: { auth?: AuthContext },
    @Param('taskId') taskId: string,
    @Body() body: { title: string }
  ) {
    const tenant = requireTenant(r.auth);
    return this.tasksService.createSubtask({ tenantId: tenant.tenantId, taskId, title: body.title });
  }

  @RequirePermissions(PERMISSIONS.TASK_READ)
  @Get('tasks/:taskId/subtasks')
  listSubtasks(@Req() r: { auth?: AuthContext }, @Param('taskId') taskId: string) {
    const tenant = requireTenant(r.auth);
    return this.tasksService.listSubtasks({ tenantId: tenant.tenantId, taskId });
  }

  @RequirePermissions(PERMISSIONS.TASK_COMPLETE)
  @Patch('subtasks/:subtaskId/toggle')
  toggleSubtask(@Req() r: { auth?: AuthContext }, @Param('subtaskId') subtaskId: string) {
    const tenant = requireTenant(r.auth);
    return this.tasksService.toggleSubtask({ tenantId: tenant.tenantId, subtaskId });
  }

  @RequirePermissions(PERMISSIONS.TASK_ASSIGN)
  @Delete('subtasks/:subtaskId')
  deleteSubtask(@Req() r: { auth?: AuthContext }, @Param('subtaskId') subtaskId: string) {
    const tenant = requireTenant(r.auth);
    return this.tasksService.deleteSubtask({ tenantId: tenant.tenantId, subtaskId });
  }
}
