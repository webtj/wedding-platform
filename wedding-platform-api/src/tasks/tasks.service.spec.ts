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
      data: { title: '确认宾客名单', assigneeType: 'couple', priority: 3, sortOrder: 0 }
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        title: '确认宾客名单',
        description: undefined,
        assigneeType: 'couple',
        dueDate: undefined,
        priority: 3
      }
    });
  });
});
