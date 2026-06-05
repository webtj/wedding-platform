'use client';

import { useQuery } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';

// ── Types ────────────────────────────────────────────────────────────────

interface TimelineAssignee {
  id: string;
  memberId: string;
  member?: { id: string; displayName: string };
}

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  isBlocked: boolean;
  assigneeType: string;
  assignees: TimelineAssignee[];
  daysUntilDue: number | null;
}

interface TimelineStage {
  id: string;
  name: string;
  status: string;
  sortOrder: number;
  tasks: TimelineTask[];
}

interface ProjectTimeline {
  project: {
    id: string;
    projectNo: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    venue: string | null;
    status: string;
  };
  weddingDate: string;
  daysUntilWedding: number;
  stages: TimelineStage[];
  unassignedTasks: TimelineTask[];
}

// ── Query ────────────────────────────────────────────────────────────────

const timelineQ = (projectId: string) =>
  queryOptions({
    queryKey: ['project-timeline', projectId],
    queryFn: () => apiClient<ProjectTimeline>(`/projects/${projectId}/timeline`),
  });

// ── Status colors ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bar: string; badge: string }> = {
  todo: { bar: 'bg-slate-300', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  in_progress: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-300' },
  done: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  closed: { bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500 border-gray-300' },
};

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  closed: '已关闭',
};

const STAGE_STATUS_LABELS: Record<string, string> = {
  pending: '未开始',
  active: '进行中',
  done: '已完成',
  skipped: '已跳过',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function computeTimelineRange(data: ProjectTimeline): { start: Date; end: Date; totalDays: number } {
  const wedding = new Date(data.weddingDate);
  // Default range: 180 days before wedding to wedding date
  const defaultStart = new Date(wedding);
  defaultStart.setDate(defaultStart.getDate() - 180);
  const defaultEnd = new Date(wedding);

  let earliest = defaultStart;
  let latest = defaultEnd;

  const allTasks = [...data.stages.flatMap((s) => s.tasks), ...data.unassignedTasks];
  for (const task of allTasks) {
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      if (d < earliest) earliest = new Date(d);
      if (d > latest) latest = new Date(d);
    }
  }

  // Add some padding
  earliest.setDate(earliest.getDate() - 7);
  latest.setDate(latest.getDate() + 7);

  const totalDays = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / 86400000));
  return { start: earliest, end: latest, totalDays };
}

function positionPercent(date: Date, start: Date, totalDays: number): number {
  const diff = (date.getTime() - start.getTime()) / 86400000;
  return Math.max(0, Math.min(100, (diff / totalDays) * 100));
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Component ────────────────────────────────────────────────────────────

export function ProjectTimelineView({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery(timelineQ(projectId));

  if (isLoading || !data) {
    return <div className='py-20 text-center text-sm text-muted-foreground'>加载中...</div>;
  }

  const { start, end, totalDays } = computeTimelineRange(data);
  const weddingDate = new Date(data.weddingDate);
  const weddingPos = positionPercent(weddingDate, start, totalDays);
  const today = new Date();
  const todayPos = positionPercent(today, start, totalDays);

  // Generate month markers
  const months: { label: string; pos: number }[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push({
      label: `${cursor.getFullYear()}/${cursor.getMonth() + 1}`,
      pos: positionPercent(cursor, start, totalDays),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return (
    <div className='space-y-6'>
      {/* Summary row */}
      <div className='grid grid-cols-4 gap-4'>
        <SummaryCard label='距婚期' value={data.daysUntilWedding} suffix='天' color='rose' />
        <SummaryCard
          label='总阶段'
          value={data.stages.length}
          color='blue'
        />
        <SummaryCard
          label='总任务'
          value={data.stages.reduce((n, s) => n + s.tasks.length, 0) + data.unassignedTasks.length}
          color='slate'
        />
        <SummaryCard
          label='已完成'
          value={
            data.stages.reduce(
              (n, s) => n + s.tasks.filter((t) => t.status === 'done').length,
              0
            ) + data.unassignedTasks.filter((t) => t.status === 'done').length
          }
          color='emerald'
        />
      </div>

      {/* Gantt chart */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>项目时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='relative overflow-x-auto'>
            {/* Time axis header */}
            <div className='relative h-8 mb-1 border-b border-border min-w-[600px]'>
              {months.map((m, i) => (
                <span
                  key={i}
                  className='absolute top-0 text-[10px] text-muted-foreground -translate-x-1/2'
                  style={{ left: `${m.pos}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Wedding date marker + Today marker */}
            <div className='relative h-6 mb-2 min-w-[600px]'>
              <div
                className='absolute top-0 bottom-0 w-px bg-rose-500 z-10'
                style={{ left: `${weddingPos}%` }}
              >
                <span className='absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-rose-600 whitespace-nowrap'>
                  婚期 {formatDateShort(data.weddingDate)}
                </span>
              </div>
              <div
                className='absolute top-0 bottom-0 w-px bg-amber-500 z-10 border-dashed'
                style={{ left: `${todayPos}%` }}
              >
                <span className='absolute -top-5 -translate-x-1/2 text-[10px] font-medium text-amber-600 whitespace-nowrap'>
                  今天
                </span>
              </div>
            </div>

            {/* Stage swim lanes */}
            {data.stages.map((stage) => (
              <StageLane
                key={stage.id}
                stage={stage}
                start={start}
                totalDays={totalDays}
                weddingPos={weddingPos}
                todayPos={todayPos}
              />
            ))}

            {/* Unassigned tasks */}
            {data.unassignedTasks.length > 0 && (
              <StageLane
                stage={{
                  id: '__unassigned',
                  name: '未分阶段任务',
                  status: 'pending',
                  sortOrder: 999,
                  tasks: data.unassignedTasks,
                }}
                start={start}
                totalDays={totalDays}
                weddingPos={weddingPos}
                todayPos={todayPos}
                isUnassigned
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className='flex items-center gap-4 text-xs text-muted-foreground'>
        {Object.entries(STATUS_COLORS).map(([key, colors]) => (
          <div key={key} className='flex items-center gap-1.5'>
            <div className={`w-3 h-3 rounded-sm ${colors.bar}`} />
            <span>{STATUS_LABELS[key]}</span>
          </div>
        ))}
        <div className='flex items-center gap-1.5 ml-4'>
          <div className='w-px h-3 bg-rose-500' />
          <span>婚期</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-px h-3 bg-amber-500 border-dashed' />
          <span>今天</span>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  const borderMap: Record<string, string> = {
    rose: 'border-l-rose-500',
    blue: 'border-l-blue-500',
    slate: 'border-l-slate-400',
    emerald: 'border-l-emerald-500',
  };
  return (
    <Card className={`border-l-4 ${borderMap[color] ?? borderMap.slate}`}>
      <CardContent className='py-3 px-4'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='text-2xl font-bold font-mono tabular-nums mt-0.5'>
          {value}
          {suffix && <span className='text-sm font-normal ml-0.5'>{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function StageLane({
  stage,
  start,
  totalDays,
  weddingPos,
  todayPos,
  isUnassigned,
}: {
  stage: TimelineStage;
  start: Date;
  totalDays: number;
  weddingPos: number;
  todayPos: number;
  isUnassigned?: boolean;
}) {
  const stageColor = isUnassigned
    ? 'border-l-gray-300'
    : stage.status === 'done'
      ? 'border-l-emerald-500'
      : stage.status === 'active'
        ? 'border-l-blue-500'
        : 'border-l-slate-300';

  return (
    <div className={`border-l-4 ${stageColor} mb-2 min-w-[600px]`}>
      {/* Stage header */}
      <div className='flex items-center gap-2 py-1.5 px-3 bg-muted/30'>
        <span className='text-sm font-medium'>{stage.name}</span>
        {!isUnassigned && (
          <Badge variant='outline' className='text-[10px]'>
            {STAGE_STATUS_LABELS[stage.status] ?? stage.status}
          </Badge>
        )}
        <span className='text-[10px] text-muted-foreground ml-auto'>
          {stage.tasks.length} 任务
        </span>
      </div>

      {/* Task bars area */}
      <div className='relative py-1 px-3 min-h-[36px]'>
        {/* Wedding date line in task area */}
        <div
          className='absolute top-0 bottom-0 w-px bg-rose-500/20 z-0'
          style={{ left: `calc(${weddingPos}% + 12px)` }}
        />
        <div
          className='absolute top-0 bottom-0 w-px bg-amber-500/20 z-0'
          style={{ left: `calc(${todayPos}% + 12px)` }}
        />

        {stage.tasks.length === 0 ? (
          <span className='text-[10px] text-muted-foreground italic'>无任务</span>
        ) : (
          <div className='flex flex-col gap-0.5'>
            {stage.tasks.map((task) => (
              <TaskBar
                key={task.id}
                task={task}
                start={start}
                totalDays={totalDays}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskBar({
  task,
  start,
  totalDays,
}: {
  task: TimelineTask;
  start: Date;
  totalDays: number;
}) {
  const colors = STATUS_COLORS[task.status] ?? STATUS_COLORS.todo;
  const hasDueDate = !!task.dueDate;

  // Position: if task has dueDate, show a bar from start-of-timeline to dueDate
  // otherwise show at the end with a dashed style
  const dueDatePos = hasDueDate
    ? positionPercent(new Date(task.dueDate!), start, totalDays)
    : 100;

  // Bar starts from a reasonable point (approximate task start based on priority)
  // For simplicity, each task bar starts at its "implied start" and ends at dueDate
  // We use a minimum width for visibility
  const barLeft = Math.max(0, dueDatePos - 5);
  const barWidth = Math.max(2, dueDatePos - barLeft);

  const assigneeNames = task.assignees
    .map((a) => a.member?.displayName)
    .filter(Boolean)
    .join(', ');

  return (
    <div className='relative group h-6'>
      {/* Task bar */}
      <div
        className={`absolute top-1 h-4 rounded-sm ${colors.bar} transition-opacity hover:opacity-80 cursor-pointer ${!hasDueDate ? 'opacity-50 border border-dashed border-current' : ''}`}
        style={{
          left: `${barLeft}%`,
          width: `${barWidth}%`,
          minWidth: '8px',
        }}
        title={`${task.title}\n状态: ${STATUS_LABELS[task.status] ?? task.status}${task.dueDate ? `\n截止: ${formatDateShort(task.dueDate)}` : ''}${task.daysUntilDue !== null ? `\n剩余: ${task.daysUntilDue} 天` : ''}${task.isBlocked ? '\n已阻塞' : ''}`}
      >
        {/* Task title inside bar */}
        <span className='absolute inset-0 flex items-center px-1.5 text-[10px] font-medium text-white truncate'>
          {task.title}
        </span>
      </div>

      {/* Due date marker */}
      {hasDueDate && (
        <div
          className='absolute top-0 w-1.5 h-6 -translate-x-1/2 z-10'
          style={{ left: `${dueDatePos}%` }}
        >
          <div className={`w-1.5 h-1.5 rounded-full mt-2.5 ${colors.bar}`} />
        </div>
      )}

      {/* Hover tooltip */}
      <div className='absolute left-0 top-7 z-20 hidden group-hover:block w-56 p-2 bg-popover border border-border rounded-md shadow-md text-xs'>
        <p className='font-medium mb-1'>{task.title}</p>
        <div className='flex items-center gap-1.5 mb-0.5'>
          <Badge variant='outline' className={`text-[10px] ${colors.badge}`}>
            {STATUS_LABELS[task.status] ?? task.status}
          </Badge>
          {task.isBlocked && (
            <Badge variant='outline' className='text-[10px] bg-red-50 text-red-700 border-red-300'>
              阻塞
            </Badge>
          )}
        </div>
        {task.dueDate && (
          <p className='text-muted-foreground'>截止: {toDateDisplay(task.dueDate)}</p>
        )}
        {task.daysUntilDue !== null && (
          <p
            className={`font-medium ${
              task.daysUntilDue < 0
                ? 'text-destructive'
                : task.daysUntilDue <= 7
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            {task.daysUntilDue < 0
              ? `已逾期 ${Math.abs(task.daysUntilDue)} 天`
              : task.daysUntilDue === 0
                ? '今天到期'
                : `剩余 ${task.daysUntilDue} 天`}
          </p>
        )}
        {assigneeNames && (
          <p className='text-muted-foreground mt-0.5'>
            <Icons.user className='inline h-3 w-3 mr-0.5' />
            {assigneeNames}
          </p>
        )}
      </div>
    </div>
  );
}
