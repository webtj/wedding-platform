import { describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  it('creates a task scoped to tenant and project', async () => {
    const prisma = { task: { create: vi.fn().mockResolvedValue({ id: 'task_1' }) } };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new TasksService(prisma as never, audit as never, { create: vi.fn() } as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { title: '确认宾客名单', assigneeType: 'planner', priority: 3, sortOrder: 0 }
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        title: '确认宾客名单',
        description: undefined,
        assigneeType: 'planner',
        assignedRoleId: undefined,
        dueDate: undefined,
        priority: 3
      }
    });
  });

  it('allows any user to update a task with no assignees', async () => {
    const task = { id: 'task_1', tenantId: 'tenant_1', projectId: 'proj_1', assigneeType: 'planner', assignees: [] };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue({ ...task, title: 'Updated' }),
      },
      projectMember: { findFirst: vi.fn() },
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new TasksService(prisma as never, audit as never, { create: vi.fn() } as never);

    await service.update({
      tenantId: 'tenant_1',
      userId: 'user_1',
      taskId: 'task_1',
      data: { title: 'Updated' } as never,
    });

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task_1', tenantId: 'tenant_1' },
      include: { assignees: true },
    });
    expect(prisma.projectMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.task.update).toHaveBeenCalled();
  });

  it('blocks users who are not project members', async () => {
    const task = {
      id: 'task_1', tenantId: 'tenant_1', projectId: 'proj_1',
      assigneeType: 'planner', assignees: [{ id: 'a1', taskId: 'task_1', memberId: 'm1' }],
    };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn(),
      },
      projectMember: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const audit = { record: vi.fn() };
    const service = new TasksService(prisma as never, audit as never, { create: vi.fn() } as never);

    await expect(
      service.update({
        tenantId: 'tenant_1',
        userId: 'user_1',
        taskId: 'task_1',
        data: { title: 'Updated' } as never,
      })
    ).rejects.toThrow('You are not a member of this project');
  });

  it('allows project members to update a task', async () => {
    const task = {
      id: 'task_1', tenantId: 'tenant_1', projectId: 'proj_1',
      assigneeType: 'planner', assignees: [{ id: 'a1', taskId: 'task_1', memberId: 'm1' }],
    };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue({ ...task, title: 'Updated' }),
      },
      projectMember: { findFirst: vi.fn().mockResolvedValue({ role: 'planner' }) },
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new TasksService(prisma as never, audit as never, { create: vi.fn() } as never);

    await service.update({
      tenantId: 'tenant_1',
      userId: 'user_1',
      taskId: 'task_1',
      data: { title: 'Updated' } as never,
    });

    expect(prisma.projectMember.findFirst).toHaveBeenCalled();
    expect(prisma.task.update).toHaveBeenCalled();
  });

  it('allows any user to complete a task with no assignees', async () => {
    const task = { id: 'task_1', tenantId: 'tenant_1', projectId: 'proj_1', assigneeType: 'planner', assignees: [], title: 'Test task' };
    const projectMemberFindFirst = vi.fn().mockResolvedValue(null);
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue({ ...task, status: 'done' }),
      },
      projectMember: { findFirst: projectMemberFindFirst },
      project: { findFirst: vi.fn().mockResolvedValue({ status: 'active' }), update: vi.fn() },
      projectStage: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const notifications = { create: vi.fn() };
    const service = new TasksService(prisma as never, audit as never, notifications as never);

    await service.complete({
      tenantId: 'tenant_1',
      userId: 'user_1',
      taskId: 'task_1',
    });

    expect(prisma.task.update).toHaveBeenCalled();
  });
});
