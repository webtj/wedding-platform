'use client';

import { useCallback, useMemo, useState } from 'react';
import { add, endOfMonth, format, getDate, getDay, startOfDay, sub } from 'date-fns';
import { useSuspenseQuery } from '@tanstack/react-query';
import { calendarQueryOptions } from '../api/queries';
import type { CalendarDayItem, CalendarQuery } from '../api/types';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ── Constants ───────────────────────────────────────────────────────────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-red-500', 2: 'bg-orange-500', 3: 'bg-yellow-500', 4: 'bg-blue-500', 5: 'bg-gray-400'
};

const modeIcons = { project: Icons.heart, task: Icons.checks } as const;

const VIEW_OPTIONS = [
  { value: 'recent' as const, label: '最近一月' },
  { value: 'natural' as const, label: '自然月' },
];

// ── Date helpers ─────────────────────────────────────────────────────────────
function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function monthLabel(view: 'recent' | 'natural', anchor: Date): string {
  if (view === 'recent') {
    const end = add(anchor, { days: 29 });
    return `${format(anchor, 'MM月dd日')} - ${format(end, 'MM月dd日')}`;
  }
  return format(anchor, 'yyyy年M月');
}

// ── Inline stats ─────────────────────────────────────────────────────────────
function InlineStats({ stats }: { stats: { projects: number; activeProjects: number; pendingTasks: number; doneTasks: number } }) {
  return (
    <div className='text-muted-foreground flex items-center gap-3 text-xs'>
      <span className='inline-flex items-center gap-1'>
        <span className='size-1.5 rounded-full bg-violet-500' />
        项目 <span className='text-foreground font-medium'>{stats.projects}</span>
      </span>
      <span className='inline-flex items-center gap-1'>
        <span className='size-1.5 rounded-full bg-rose-500' />
        进行中 <span className='text-foreground font-medium'>{stats.activeProjects}</span>
      </span>
      <span className='inline-flex items-center gap-1'>
        <span className='size-1.5 rounded-full bg-orange-500' />
        待办 <span className='text-foreground font-medium'>{stats.pendingTasks}</span>
      </span>
      <span className='inline-flex items-center gap-1'>
        <span className='size-1.5 rounded-full bg-emerald-500' />
        完成 <span className='text-foreground font-medium'>{stats.doneTasks}</span>
      </span>
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────
function Legend({ mode }: { mode: 'project' | 'task' }) {
  if (mode === 'project') return null; // project colors are self-explanatory from day cells
  return (
    <span className='text-muted-foreground/70 flex items-center gap-2.5 text-[11px]'>
      <span className='inline-flex items-center gap-1'><span className='size-1.5 rounded-sm bg-red-400' />紧急</span>
      <span className='inline-flex items-center gap-1'><span className='size-1.5 rounded-sm bg-orange-400' />高优</span>
      <span className='inline-flex items-center gap-1'><span className='size-1.5 rounded-sm bg-blue-400' />一般</span>
      <span className='inline-flex items-center gap-1'><span className='size-1.5 rounded-sm bg-gray-300' />低优</span>
    </span>
  );
}

// ── Overflow popover ─────────────────────────────────────────────────────────
function OverflowPopover({
  type,
  items,
  date,
  onProjectClick,
}: {
  type: 'project' | 'task';
  items: CalendarDayItem['projects'] | CalendarDayItem['tasks'];
  date: string;
  onProjectClick: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  const label = type === 'project' ? '项目' : '任务';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type='button' className='text-primary hover:underline ml-0 cursor-pointer text-[10px]'>
          {open ? '收起' : `更多(${count})`}
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' side='bottom' className='max-h-64 w-56 overflow-y-auto p-2'>
        <p className='text-muted-foreground mb-1 px-1 text-[11px] font-medium'>
          {date} · {count} 个{label}
        </p>
        <div className='flex flex-col gap-0.5'>
          {type === 'project'
            ? (items as CalendarDayItem['projects']).map((p) => (
                <button
                  key={p.id}
                  type='button'
                  onClick={() => { setOpen(false); onProjectClick(p.id); }}
                  className='hover:bg-accent flex items-center gap-2 truncate rounded px-1.5 py-1 text-left text-xs transition-colors'
                  title={`${p.no}: ${p.name}`}
                >
                  <span className='size-1.5 shrink-0 rounded-full bg-rose-500' />
                  <span className='text-foreground truncate'>{p.name}</span>
                  {p.venue && <span className='text-muted-foreground shrink-0 text-[10px]'>{p.venue}</span>}
                </button>
              ))
            : (items as CalendarDayItem['tasks']).map((t) => (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => { setOpen(false); onProjectClick(t.projectId); }}
                  className='hover:bg-accent flex items-center gap-2 truncate rounded px-1.5 py-1 text-left text-xs transition-colors'
                  title={`${t.projectName}: ${t.title}`}
                >
                  <span className={cn('size-1.5 shrink-0 rounded-sm', PRIORITY_COLORS[t.priority] ?? 'bg-gray-400')} />
                  <span className='text-foreground truncate'>{t.title}</span>
                  <span className='text-muted-foreground shrink-0 truncate text-[10px]'>{t.projectName}</span>
                </button>
              ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Day cell ─────────────────────────────────────────────────────────────────
function DayCell({
  day,
  isToday,
  isCurrentMonth,
  mode,
  onProjectClick,
}: {
  day: CalendarDayItem;
  isToday: boolean;
  isCurrentMonth: boolean;
  mode: 'project' | 'task';
  onProjectClick: (projectId: string) => void;
}) {
  const dateNum = parseInt(day.date.slice(8), 10);
  const hasContent = mode === 'project' ? day.projects.length > 0 : day.tasks.length > 0;
  const isWeekendDay = day.isWeekend;

  return (
    <div
      className={cn(
        'flex min-h-24 flex-col border-r border-b p-1.5 transition-colors',
        isToday && 'bg-primary/5',
        isWeekendDay && !isToday && 'bg-muted/20',
        !isCurrentMonth && 'bg-muted/30',
        hasContent && 'bg-background'
      )}
    >
      {/* ── Date number ── */}
      <span
        className={cn(
          'mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
          isToday && 'bg-primary text-primary-foreground',
          !isToday && 'text-foreground'
        )}
      >
        {dateNum}
      </span>

      {mode === 'project' && day.projects.length > 0 && (
        <div className='flex flex-col gap-0.5 overflow-hidden'>
          {day.projects.slice(0, 3).map((p, i) => (
            <div key={p.id} className='flex items-center gap-1 truncate px-1 py-0.5'>
              <button
                type='button'
                onClick={(e) => { e.stopPropagation(); onProjectClick(p.id); }}
                className='hover:bg-accent flex min-w-0 items-center gap-1 rounded text-left text-[11px] leading-tight transition-colors'
                title={`${p.no}: ${p.name}${p.venue ? ` @${p.venue}` : ''}`}
              >
                <span className='size-1.5 shrink-0 rounded-full bg-rose-500' />
                <span className='truncate'>{p.name}</span>
              </button>
              {day.projects.length > 3 && i === 2 && (
                <OverflowPopover type='project' items={day.projects} date={day.date} onProjectClick={onProjectClick} />
              )}
            </div>
          ))}
        </div>
      )}

      {mode === 'task' && day.tasks.length > 0 && (
        <div className='flex flex-col gap-0.5 overflow-hidden'>
          {day.tasks.slice(0, 3).map((t, i) => (
            <div key={t.id} className='flex items-center gap-1 truncate px-1 py-0.5'>
              <button
                type='button'
                onClick={(e) => { e.stopPropagation(); onProjectClick(t.projectId); }}
                className='hover:bg-accent flex min-w-0 items-center gap-1 rounded text-left text-[11px] leading-tight transition-colors'
                title={`${t.projectName}: ${t.title}`}
              >
                <span className={cn('size-1.5 shrink-0 rounded-sm', PRIORITY_COLORS[t.priority] ?? 'bg-gray-400')} />
                <span className='truncate'>{t.title}</span>
              </button>
              {day.tasks.length > 3 && i === 2 && (
                <OverflowPopover type='task' items={day.tasks} date={day.date} onProjectClick={onProjectClick} />
              )}
            </div>
          ))}
        </div>
      )}

      {!hasContent && <div className='flex-1' />}
    </div>
  );
}

// ── Calendar grid ────────────────────────────────────────────────────────────
function CalendarGrid({
  days,
  monthStart,
  view,
  mode,
  onProjectClick,
}: {
  days: CalendarDayItem[];
  monthStart: Date;
  view: 'recent' | 'natural';
  mode: 'project' | 'task';
  onProjectClick: (projectId: string) => void;
}) {
  const today = todayStr();
  // For natural month, pad leading empty cells for correct weekday alignment
  const startDayOfWeek = getDay(monthStart);

  const allCells: (CalendarDayItem | null)[] = [];
  if (view === 'natural') {
    for (let i = 0; i < startDayOfWeek; i++) {
      allCells.push(null);
    }
  }
  allCells.push(...days);

  return (
    <div className='bg-card overflow-hidden rounded-xl border'>
      {/* Weekday header */}
      <div className='bg-muted/50 grid grid-cols-7 border-b'>
        {WEEKDAYS.map((wd) => (
          <div key={wd} className='text-muted-foreground px-2 py-2 text-center text-xs font-medium'>
            {wd}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className='grid grid-cols-7'>
        {allCells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className='min-h-20 border-r border-b bg-muted/20' />;
          }
          return (
            <DayCell
              key={day.date}
              day={day}
              isToday={day.date === today}
              isCurrentMonth={true}
              mode={mode}
              onProjectClick={onProjectClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function CalendarViewPage() {
  const r = useRouter();
  const [mode, setMode] = useState<'project' | 'task'>('project');
  const [view, setView] = useState<'recent' | 'natural'>('recent');
  const [anchorDate, setAnchorDate] = useState<string>(todayStr());

  const query: CalendarQuery = useMemo(() => ({
    mode,
    view,
    date: anchorDate,
  }), [mode, view, anchorDate]);

  const { data } = useSuspenseQuery(calendarQueryOptions(query));

  const monthStartDate = useMemo(() => startOfDay(new Date(`${data.monthStart}T00:00:00`)), [data.monthStart]);

  const navigate = useCallback((dir: -1 | 1) => {
    setAnchorDate((prev) => {
      const d = startOfDay(new Date(`${prev}T00:00:00`));
      const delta = view === 'recent' ? 30 : getDate(endOfMonth(dir === 1 ? add(d, { months: 1 }) : sub(d, { months: 1 })));
      const next = dir === 1 ? add(d, { days: delta }) : sub(d, { days: delta });
      return format(next, 'yyyy-MM-dd');
    });
  }, [view]);

  const goToday = useCallback(() => {
    setAnchorDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const handleProjectClick = useCallback((projectId: string) => {
    r.push(`/studio/projects/${projectId}`);
  }, [r]);

  return (
    <div className='flex flex-1 flex-col gap-3 p-4 lg:p-6'>
      {/* ── Controls row: stats+legend left, mode+nav right ── */}
      <div className='bg-card flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border px-4 py-2'>
        {/* Left block: stats + legend */}
        <div className='flex items-center gap-4'>
          <InlineStats stats={data.stats} />
          {mode === 'task' && (
            <>
              <span className='bg-border/50 h-4 w-px' />
              <Legend mode={mode} />
            </>
          )}
        </div>

        {/* Spacer */}
        <div className='flex-1' />

        {/* Right block: mode + date nav */}
        <div className='flex items-center gap-2'>
          {/* Mode toggle */}
          <div className='bg-muted flex shrink-0 rounded-lg p-0.5'>
            {([{ value: 'project', label: '项目' }, { value: 'task', label: '任务' }] as const).map((opt) => {
              const Icon = modeIcons[opt.value];
              return (
                <button key={opt.value} type='button' onClick={() => setMode(opt.value)}
                  className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    mode === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className='size-3.5' />{opt.label}
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className='bg-muted flex shrink-0 rounded-lg p-0.5'>
            {VIEW_OPTIONS.map((opt) => (
              <button key={opt.value} type='button' onClick={() => setView(opt.value)}
                className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  view === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className='flex items-center'>
            <Button variant='ghost' size='icon' className='size-7' onClick={() => navigate(-1)}>
              <Icons.chevronsLeft className='size-3.5' />
            </Button>
            <span className='text-foreground w-36 text-center text-sm font-medium tabular-nums'>{monthLabel(view, monthStartDate)}</span>
            <Button variant='ghost' size='icon' className='size-7' onClick={() => navigate(1)}>
              <Icons.chevronsRight className='size-3.5' />
            </Button>
            <Button variant='outline' size='sm' className='ml-1 h-7 text-xs' onClick={goToday}>今天</Button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <CalendarGrid
        days={data.days}
        monthStart={monthStartDate}
        view={view}
        mode={mode}
        onProjectClick={handleProjectClick}
      />
    </div>
  );
}
