import { Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { coupleTaskStatusFilterSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { CoupleAccessService } from './couple-access.service';

@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleTasksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CoupleAccessService,
    private readonly tasksService: TasksService
  ) {}

  @Get('projects/:projectId/tasks')
  async list(
    @Req() request: { auth?: AuthContext },
    @Param('projectId') projectId: string,
    @Query('status') status?: string
  ) {
    const tenant = requireTenant(request.auth);
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
    const filter = coupleTaskStatusFilterSchema.parse({ status });
    return this.prisma.task.findMany({
      where: {
        tenantId: tenant.tenantId,
        projectId,
        assigneeType: 'couple',
        ...(filter.status ? { status: filter.status } : {})
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
    });
  }

  @Post('tasks/:taskId/complete')
  async complete(@Req() request: { auth?: AuthContext }, @Param('taskId') taskId: string) {
    const tenant = requireTenant(request.auth);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId: tenant.tenantId, assigneeType: 'couple' }
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.access.requireCoupleProject({ tenantId: tenant.tenantId, userId: tenant.userId, projectId: task.projectId });
    return this.tasksService.complete({ tenantId: tenant.tenantId, userId: tenant.userId, taskId });
  }
}
