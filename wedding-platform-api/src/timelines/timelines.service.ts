import { Injectable, NotFoundException } from '@nestjs/common';
import type { CalendarData, CalendarDayItem, CalendarQueryInput } from '@wedding/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTimelineItemDto, ReorderTimelineItemsDto, UpdateTimelineItemDto } from './dto';

// ── Lightweight date helpers (no date-fns needed) ──────────────────────
function fm(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function endOfMonth(d: Date): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

@Injectable()
export class TimelinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.weddingTimelineItem.findMany({
      where: {
        tenantId: input.tenantId,
        projectId: input.projectId
      },
      orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }]
    });
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  async getCalendar(input: { tenantId: string } & CalendarQueryInput): Promise<CalendarData> {
    const today = startOfDay(new Date());
    const anchor = startOfDay(new Date(`${input.date}T00:00:00Z`));
    let monthStart: Date;
    let monthEnd: Date;

    if (input.view === 'recent') {
      monthStart = startOfDay(new Date(`${input.date}T00:00:00Z`));
      monthEnd = addDays(monthStart, 29);
    } else {
      monthStart = startOfMonth(anchor);
      monthEnd = endOfMonth(anchor);
    }

    // ── Fetch projects with weddingDate in range ──
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId: input.tenantId,
        weddingDate: { gte: monthStart, lte: monthEnd }
      },
      select: { id: true, projectNo: true, brideName: true, groomName: true, venue: true, weddingDate: true, status: true }
    });

    // ── Fetch tasks with dueDate in range ──
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: input.tenantId,
        dueDate: { gte: monthStart, lte: monthEnd },
        status: { not: 'closed' }
      },
      select: {
        id: true, title: true, dueDate: true, priority: true, status: true,
        project: { select: { id: true, brideName: true, groomName: true } }
      }
    });

    // ── Stats ──
    const [allProjectCount, activeProjectCount] = await Promise.all([
      this.prisma.project.count({ where: { tenantId: input.tenantId } }),
      this.prisma.project.count({ where: { tenantId: input.tenantId, status: 'active' } }),
    ]);
    const [pendingTaskCount, doneTaskCount] = await Promise.all([
      this.prisma.task.count({ where: { tenantId: input.tenantId, status: { notIn: ['done', 'closed'] } } }),
      this.prisma.task.count({ where: { tenantId: input.tenantId, status: 'done' } }),
    ]);

    const stats = {
      projects: allProjectCount,
      activeProjects: activeProjectCount,
      pendingTasks: pendingTaskCount,
      doneTasks: doneTaskCount
    };

    // ── Build day-by-day structure ──
    const dayCount = input.view === 'recent' ? 30 : endOfMonth(anchor).getUTCDate();
    const days: CalendarDayItem[] = [];

    for (let i = 0; i < dayCount; i++) {
      const d = addDays(monthStart, i);
      const dateStr = fm(d);
      const dayProjects = projects.filter((p) => fm(p.weddingDate) === dateStr);
      const dayTasks = tasks.filter((t) => t.dueDate && fm(t.dueDate) === dateStr);

      // Weekend flag
      const dow = d.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;

      days.push({
        date: dateStr,
        isWeekend,
        projects: dayProjects.map((p) => ({
          id: p.id, no: p.projectNo,
          name: `${p.brideName} & ${p.groomName}`,
          venue: p.venue
        })),
        tasks: dayTasks.map((t) => ({
          id: t.id, title: t.title, time: null,
          projectId: t.project.id,
          projectName: `${t.project.brideName} & ${t.project.groomName}`,
          priority: t.priority
        })),
      });
    }

    return {
      today: fm(today),
      monthStart: fm(monthStart),
      monthEnd: fm(monthEnd),
      view: input.view,
      mode: input.mode,
      stats,
      days
    };
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateTimelineItemDto }) {
    const item = await this.prisma.weddingTimelineItem.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        startTime: new Date(input.data.startTime),
        title: input.data.title,
        description: input.data.description,
        owner: input.data.owner,
        location: input.data.location,
        status: input.data.status,
        sortOrder: input.data.sortOrder,
        reminderMinutesBefore: input.data.reminderMinutesBefore
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.create',
      entity: 'wedding_timeline_item',
      entityId: item.id,
      metadata: { projectId: input.projectId }
    });
    return item;
  }

  async update(input: { tenantId: string; userId: string; timelineItemId: string; data: UpdateTimelineItemDto }) {
    const existing = await this.prisma.weddingTimelineItem.findFirst({
      where: { id: input.timelineItemId, tenantId: input.tenantId }
    });
    if (!existing) {
      throw new NotFoundException('Timeline item not found');
    }
    const updated = await this.prisma.weddingTimelineItem.update({
      where: { id: input.timelineItemId, tenantId: input.tenantId },
      data: {
        ...input.data,
        startTime: input.data.startTime ? new Date(input.data.startTime) : undefined
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.update',
      entity: 'wedding_timeline_item',
      entityId: input.timelineItemId,
      metadata: { projectId: existing.projectId }
    });
    return updated;
  }

  async reorder(input: { tenantId: string; userId: string; projectId: string; data: ReorderTimelineItemsDto }) {
    await this.prisma.$transaction(
      input.data.items.map((item: { id: string; sortOrder: number }) =>
        this.prisma.weddingTimelineItem.updateMany({
          where: { id: item.id, tenantId: input.tenantId, projectId: input.projectId },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.reorder',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return this.list({ tenantId: input.tenantId, projectId: input.projectId });
  }

  async delete(input: { tenantId: string; userId: string; timelineItemId: string }) {
    const existing = await this.prisma.weddingTimelineItem.findFirst({
      where: { id: input.timelineItemId, tenantId: input.tenantId }
    });
    if (!existing) {
      throw new NotFoundException('Timeline item not found');
    }
    await this.prisma.weddingTimelineItem.delete({
      where: { id: input.timelineItemId }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.delete',
      entity: 'wedding_timeline_item',
      entityId: input.timelineItemId,
      metadata: { projectId: existing.projectId }
    });
    return { success: true };
  }
}
