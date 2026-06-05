'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { applyTemplate, getTemplates } from '@/features/templates/api/service';
import { MaterialPickerDialog } from '@/components/materials/MaterialPickerDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { ProjectTimelineEditor } from '@/features/projects/components/project-timeline-editor';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import type { KanbanStage, KanbanTask, KanbanAssignee, KanbanTaskMaterial } from '@/components/kanban/types';
import type { ProcessTemplate } from '@/features/templates/api/types';

interface ProjectData {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate?: string | null;
  venue?: string | null;
  projectNo?: string | null;
  createdAt?: string;
  appliedTemplateId?: string | null;
}

const projectQ = (id: string) =>
  queryOptions({ queryKey: ['project', id], queryFn: () => apiClient<ProjectData>(`/projects/${id}`) });
const kanbanQ = (pid: string) =>
  queryOptions({
    queryKey: ['kanban', pid],
    queryFn: () => apiClient<{ stages: KanbanStage[] }>(`/projects/${pid}/kanban`)
  });

export default function ProjectEditPage() {
  const { projectId } = useParams() as { projectId: string };
  const { data: proj, isLoading: projLoading, isError: projError } = useQuery(projectQ(projectId));
  const {
    data: kanban,
    refetch,
    isLoading: kanbanLoading,
    isError: kanbanError
  } = useQuery(kanbanQ(projectId));
  const { data: templates } = useQuery(
    queryOptions({ queryKey: ['templates', 'select'], queryFn: () => getTemplates({ limit: 100 }) })
  );

  const [tab, setTab] = useState('流程管理');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState(proj?.appliedTemplateId ?? '');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPrioFilter, setTaskPrioFilter] = useState('__all__');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (tab === '物料清单') refetch();
  }, [tab, refetch]);

  const stages: KanbanStage[] = useMemo(() => kanban?.stages ?? [], [kanban?.stages]);
  const allTasks: KanbanTask[] = stages.flatMap((s) => s.tasks ?? []);
  const active = stages.find((s) => s.id === selectedId);
  const rawTasks = selectedId ? (active?.tasks ?? []) : allTasks;
  const tasks = rawTasks.filter((t) => {
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
    if (taskPrioFilter !== '__all__' && String(t.priority || 3) !== taskPrioFilter) return false;
    return true;
  });
  const loading = projLoading || kanbanLoading;

  const weddingDate = proj?.weddingDate ? new Date(proj.weddingDate) : null;
  const days = weddingDate ? Math.ceil((weddingDate.getTime() - Date.now()) / 86400000) : null;
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const fmtWedding = weddingDate
    ? `${weddingDate.getFullYear()}/${weddingDate.getMonth() + 1}/${weddingDate.getDate()} 星期${weekDays[weddingDate.getDay()]}`
    : '';
  const createdAt = proj?.createdAt ? new Date(proj.createdAt) : null;
  const fmtCreated = createdAt
    ? `${createdAt.getFullYear()}/${createdAt.getMonth() + 1}/${createdAt.getDate()}`
    : '';

  useEffect(() => {
    if (proj?.appliedTemplateId) setSelectedTplId(proj.appliedTemplateId);
  }, [proj?.appliedTemplateId]);

  useEffect(() => {
    if (stages.length === 0) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const urgentStage = stages.find((s) =>
      (s.tasks ?? []).some(
        (t) => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) <= todayStr
      )
    );
    setSelectedId(urgentStage?.id ?? stages[0].id);
  }, [stages]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldI = stages.findIndex((s) => s.id === a.id);
    const newI = stages.findIndex((s) => s.id === over.id);
    if (oldI === -1 || newI === -1) return;
    const re = [...stages];
    const [mv] = re.splice(oldI, 1);
    re.splice(newI, 0, mv);
    re.forEach((s, i) => {
      if (s.sortOrder !== i)
        apiClient(`/tasks/${s.id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i }) });
    });
    // Update stage sortOrder
    Promise.all(
      re.map((s, i) =>
        apiClient(`/project-stages/${s.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sortOrder: i })
        })
      )
    ).then(() => refetch());
  }, [stages, refetch]);

  const moveStage = useCallback((id: string, dir: number) => {
    const i = stages.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    const re = [...stages];
    const [mv] = re.splice(i, 1);
    re.splice(j, 0, mv);
    Promise.all(
      re.map((s, idx) =>
        apiClient(`/project-stages/${s.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sortOrder: idx })
        })
      )
    ).then(() => refetch());
  }, [stages, refetch]);

  const isError = projError || kanbanError;

  if (isError) {
    return (
      <PageContainer pageTitle=''>
        <div className='flex flex-col items-center justify-center py-32 gap-3'>
          <p className='text-sm text-muted-foreground'>加载失败，项目不存在或无权访问</p>
          <Link href='/studio/projects' className='text-sm text-primary hover:underline'>
            返回项目列表
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (loading || !proj) {
    return (
      <PageContainer pageTitle=''>
        <div className='flex items-center justify-center py-32'>
          <Icons.spinner className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      </PageContainer>
    );
  }

  const currentTemplate = (templates?.items ?? []).find((t: ProcessTemplate) => t.id === selectedTplId);

  return (
    <PageContainer pageTitle=''>
      <div className='space-y-6 w-full min-w-0'>
        {/* Breadcrumb + Header */}
        <div className='flex items-center gap-2 text-[13px] text-muted-foreground'>
          <Link href='/studio/overview' className='hover:text-foreground transition-colors'>
            工作台
          </Link>
          <Icons.chevronRight className='h-3.5 w-3.5' />
          <span className='text-foreground'>
            {proj.brideName} & {proj.groomName}
          </span>
        </div>
        <div className='flex items-start justify-between flex-wrap gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-baseline gap-3'>
              {proj.brideName} & {proj.groomName}
              {proj.projectNo && (
                <a
                  href={`/studio/contracts?search=${proj.projectNo}`}
                  className='inline-flex items-center gap-1 text-xs text-primary font-mono hover:underline'
                >
                  <Icons.post className='h-3 w-3' />
                  {proj.projectNo}
                </a>
              )}
            </h1>
            <div className='flex items-center gap-2 mt-2 flex-wrap text-[13px] text-muted-foreground'>
              {fmtWedding && (
                <span className='flex items-center gap-1.5'>
                  <span className='text-red-500 font-serif text-base'>囍</span> {fmtWedding}{' '}
                  {days !== null &&
                    (days < 0
                      ? `已过 ${Math.abs(days)} 天`
                      : days === 0
                        ? '今天'
                        : `距婚期 ${days} 天`)}
                </span>
              )}
              <span className='text-muted-foreground/30 mx-1'>｜</span>
              {proj.venue && (
                <span className='flex items-center gap-1.5'>
                  <Icons.location className='h-3.5 w-3.5' />
                  {proj.venue}
                </span>
              )}
              <span className='text-muted-foreground/30 mx-1'>｜</span>
              {fmtCreated && (
                <span className='flex items-center gap-1.5'>
                  <Icons.clock className='h-3.5 w-3.5' />
                  策划开始于：{fmtCreated}
                </span>
              )}
            </div>
          </div>
          {/* Template Bar — moved to top right */}
          <div className='flex items-center gap-2 flex-wrap'>
            <Select value={selectedTplId} onValueChange={setSelectedTplId}>
              <SelectTrigger className='h-8 text-[13px] w-[180px]'>
                <SelectValue placeholder='选择模板...' />
              </SelectTrigger>
              <SelectContent>
                {(templates?.items ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => {
                if (selectedTplId) setApplyOpen(true);
              }}
            >
              应用模板
            </Button>
            <Link href='/studio/templates'>
              <Button variant='outline' size='sm' className='h-8 text-xs'>
                添加模板
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-0 border-b'>
          {['流程管理', '时间线', '物料清单', '标注评论'].map((l) => (
            <button
              key={l}
              onClick={() => setTab(l)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === l ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === '流程管理' && (
          <div className='min-w-0'>
            {stages.length === 0 ? (
              <div className='py-16 text-center text-muted-foreground text-sm'>
                暂无阶段和任务，请选择模板并点击"应用模板"
              </div>
            ) : (
              <>
                {/* Stage Cards — compact, draggable */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToHorizontalAxis]}
                >
                  <SortableContext
                    items={stages.map((s) => s.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div
                      className='flex gap-2 overflow-x-auto py-2 px-1 mb-5'
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {stages.map((s, i) => (
                        <StageCard
                          key={s.id}
                          stage={s}
                          index={i}
                          total={stages.length}
                          selected={selectedId === s.id}
                          onSelect={() => setSelectedId(selectedId === s.id ? null : s.id)}
                          onMoveLeft={() => moveStage(s.id, -1)}
                          onMoveRight={() => moveStage(s.id, 1)}
                          onRefresh={refetch}
                          projectId={projectId}
                        />
                      ))}
                      <AddStageCard projectId={projectId} onRefresh={refetch} insertAt={0} />
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Task List */}
                <div>
                  <div className='flex items-center justify-between mb-3 gap-3'>
                    <h3 className='text-sm font-semibold flex-shrink-0'>
                      {selectedId ? `${active?.name ?? ''} · 子任务` : `全部任务 (${tasks.length})`}
                    </h3>
                    <div className='flex items-center gap-2'>
                      <div className='relative w-40'>
                        <Icons.search className='absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground' />
                        <Input
                          placeholder='搜索任务...'
                          className='pl-7 h-7 text-xs'
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                        />
                      </div>
                      <Select value={taskPrioFilter} onValueChange={setTaskPrioFilter}>
                        <SelectTrigger className='h-7 w-20 text-xs'>
                          <SelectValue placeholder='优先级' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='__all__'>全部</SelectItem>
                          <SelectItem value='3'>重要</SelectItem>
                          <SelectItem value='2'>一般</SelectItem>
                          <SelectItem value='1'>次要</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedId && (
                        <AddTaskInline
                          stageId={selectedId}
                          projectId={projectId}
                          onRefresh={refetch}
                        />
                      )}
                    </div>
                  </div>
                  {tasks.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center py-12'>
                      {selectedId ? '此阶段暂无任务' : '暂无任务'}
                    </p>
                  ) : (
                    <div className='flex flex-col gap-2'>
                      {tasks.map((t) => (
                        <TaskRow key={t.id} task={t} projectId={projectId} onRefresh={refetch} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {tab === '时间线' && <ProjectTimelineEditor projectId={projectId} />}
        {tab === '物料清单' && <MaterialsTab stages={stages} selectedId={selectedId} />}
        {tab === '标注评论' && (
          <div className='py-16 text-center text-muted-foreground text-sm'>即将上线</div>
        )}
        <ApplyDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          templateName={currentTemplate?.name ?? ''}
          onConfirm={() => {
            applyTemplate(projectId, selectedTplId, true).then(() => {
              refetch();
              setApplyOpen(false);
            });
          }}
        />
      </div>
    </PageContainer>
  );
}

function StageCard({
  stage,
  index,
  total,
  selected,
  onSelect,
  onMoveLeft,
  onMoveRight,
  onRefresh,
  projectId: _projectId
}: {
  stage: KanbanStage;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRefresh: () => void;
  projectId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [delOpen, setDelOpen] = useState(false);
  const sDone = stage.tasks?.filter((t) => t.status === 'done').length ?? 0;
  const sTotal = stage.tasks?.length ?? 0;
  const allDone = sTotal > 0 && sDone === sTotal;
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasUrgent = (stage.tasks ?? []).some(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) <= todayStr
  );

  function saveName() {
    if (name.trim() && name !== stage.name)
      apiClient(`/project-stages/${stage.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() })
      }).then(() => onRefresh());
    setEditing(false);
  }

  return (
    <>
      <div className='relative'>
        {selected && (
          <div className='absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-5 h-[3px] rounded-full z-20 bg-primary' />
        )}
        <div
          ref={setNodeRef}
          style={style}
          className={`flex-shrink-0 w-[140px] rounded-xl border-2 cursor-pointer motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out ${isDragging ? 'opacity-50 scale-95' : ''} ${
            selected ? '-translate-y-1.5 shadow-[0_10px_30px_-8px_rgba(59,130,246,0.4)] z-10' : ''
          } ${
            hasUrgent
              ? 'border-red-400 bg-red-50/30 animate-shake'
              : allDone
                ? 'border-emerald-300 bg-emerald-50/50'
                : sDone > 0 && !allDone
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-border bg-card hover:border-primary/50'
          }`}
          onClick={onSelect}
          onKeyDown={(e) => e.key === 'Enter' && onSelect()}
          role='button'
          tabIndex={0}
        >
          <div className='p-2'>
            {/* Header: status dot + number + drag */}
            <div className='flex items-center gap-1 mb-1.5'>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  hasUrgent
                    ? 'bg-red-500 animate-pulse'
                    : allDone
                      ? 'bg-emerald-500'
                      : sDone > 0 && !allDone
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-muted-foreground/30'
                }`}
              />
              <span className='text-[10px] font-mono font-bold text-muted-foreground'>
                #{index + 1}
              </span>
              <div
                {...attributes}
                {...listeners}
                className='cursor-grab active:cursor-grabbing ml-auto p-0.5 text-muted-foreground/40 hover:text-muted-foreground'
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                role='button'
                tabIndex={0}
              >
                <Icons.gripVertical className='h-3 w-3' />
              </div>
            </div>

            {/* Name */}
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className='h-6 text-xs font-semibold px-1 py-0'
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className='text-xs font-semibold truncate mb-2'
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
              >
                {stage.name}
              </div>
            )}

            {/* Mini progress bar */}
            <div className='h-1 bg-border rounded-full overflow-hidden mb-1'>
              <div
                className={`h-full rounded-full transition-all ${
                  allDone
                    ? 'bg-emerald-500'
                    : sDone > 0 && !allDone
                      ? 'bg-blue-500'
                      : 'bg-muted-foreground/20'
                }`}
                style={{ width: `${sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0}%` }}
              />
            </div>

            {/* Count */}
            <div className='flex items-center justify-between text-[10px]'>
              <span className='text-muted-foreground font-mono'>
                {sDone}/{sTotal}
              </span>
              <span className='text-muted-foreground'>
                {sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0}%
              </span>
            </div>

            {/* Action buttons */}
            <div
              className='flex items-center justify-between mt-2 pt-2 border-t border-border/50'
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
              role='presentation'
            >
              <div className='flex items-center gap-0.5'>
                <button
                  disabled={index === 0}
                  onClick={onMoveLeft}
                  className='p-0.5 rounded hover:bg-secondary disabled:opacity-20'
                >
                  <Icons.chevronLeft className='h-3 w-3' />
                </button>
                <button
                  disabled={index === total - 1}
                  onClick={onMoveRight}
                  className='p-0.5 rounded hover:bg-secondary disabled:opacity-20'
                >
                  <Icons.chevronRight className='h-3 w-3' />
                </button>
              </div>
              <div className='flex items-center gap-0.5'>
                <button
                  onClick={() => setEditing(true)}
                  className='p-0.5 rounded hover:bg-secondary'
                >
                  <Icons.edit className='h-3 w-3' />
                </button>
                <button
                  onClick={() => setDelOpen(true)}
                  className='p-0.5 rounded hover:bg-destructive/10 hover:text-destructive'
                >
                  <Icons.trash className='h-3 w-3' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除阶段</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除此阶段将同时删除其下所有任务。不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDelOpen(false)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                apiClient(`/project-stages/${stage.id}`, { method: 'DELETE' }).then(() =>
                  onRefresh()
                );
                setDelOpen(false);
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddStageCard({
  projectId,
  onRefresh,
  insertAt
}: {
  projectId: string;
  onRefresh: () => void;
  insertAt: number;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  function save() {
    if (!name.trim()) return;
    apiClient(`/projects/${projectId}/stages`, {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), sortOrder: insertAt })
    }).then(() => {
      onRefresh();
      setOpen(false);
      setName('');
    });
  }
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className='flex-shrink-0 w-[140px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 p-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors'
      >
        <Icons.add className='h-4 w-4' />
        <span className='text-[10px]'>添加阶段</span>
      </button>
    );
  return (
    <div
      className='flex-shrink-0 w-[140px] rounded-xl border-2 border-primary bg-card p-3 flex flex-col gap-2'
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
      role='button'
      tabIndex={0}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder='阶段名称'
        className='h-6 text-xs'
      />
      <div className='flex gap-1'>
        <Button size='sm' className='h-6 text-[10px] flex-1' onClick={save} disabled={!name.trim()}>
          添加
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[10px]'
          onClick={() => setOpen(false)}
        >
          取消
        </Button>
      </div>
    </div>
  );
}

function AddTaskInline({
  stageId,
  projectId,
  onRefresh
}: {
  stageId: string;
  projectId: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  function save() {
    if (!title.trim()) return;
    apiClient(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ stageId, title: title.trim() })
    }).then(() => {
      onRefresh();
      setOpen(false);
      setTitle('');
    });
  }
  if (!open)
    return (
      <Button variant='outline' size='sm' className='h-7 text-xs' onClick={() => setOpen(true)}>
        <Icons.add className='h-3 w-3 mr-1' />
        添加子任务
      </Button>
    );
  return (
    <div className='flex items-center gap-2'>
      <Input
        placeholder='任务名称'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className='h-7 text-xs flex-1'
      />
      <Button size='sm' className='h-7 text-xs' onClick={save}>
        添加
      </Button>
      <Button variant='ghost' size='sm' className='h-7 text-xs' onClick={() => setOpen(false)}>
        取消
      </Button>
    </div>
  );
}

function MemberSelect({
  taskId,
  assignees,
  onRefresh
}: {
  taskId: string;
  assignees: KanbanAssignee[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: members } = useQuery({
    queryKey: ['tenant-members'],
    queryFn: () => apiClient<{ id: string; displayName: string }[]>('/tenant-members'),
    staleTime: 2 * 60 * 1000
  });
  const assigneeIds = new Set(assignees.map((a) => a.memberId));

  async function toggleMember(memberId: string) {
    if (assigneeIds.has(memberId)) {
      const a = assignees.find((a) => a.memberId === memberId);
      if (a) await apiClient(`/task-assignees/${a.id}`, { method: 'DELETE' });
    } else {
      await apiClient(`/tasks/${taskId}/assignees`, {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
    }
    onRefresh();
  }

  const count = assignees.length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-7 text-[11px] gap-1 px-2 font-normal'>
          <Icons.user className='h-3 w-3' />
          {count > 0 ? (
            <span>{count}人</span>
          ) : (
            <span className='text-muted-foreground'>执行人</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-52 p-0' align='start'>
        <div className='p-2 border-b'>
          <input
            className='w-full text-xs border rounded px-2 py-1 outline-none focus:border-primary'
            placeholder='搜索成员...'
            aria-label='搜索成员'
            onChange={(_e) => {
              /* filter */
            }}
          />
        </div>
        <div className='max-h-48 overflow-y-auto p-1'>
          {(members ?? []).map((m) => (
            <div
              key={m.id}
              className='flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs'
              onClick={() => toggleMember(m.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggleMember(m.id)}
              role='button'
              tabIndex={0}
            >
              <Checkbox checked={assigneeIds.has(m.id)} className='h-3.5 w-3.5' />
              {m.displayName}
            </div>
          ))}
          {(!members || members.length === 0) && (
            <p className='text-xs text-muted-foreground text-center py-3'>暂无成员</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TaskRow({
  task,
  projectId,
  onRefresh
}: {
  task: KanbanTask;
  projectId: string;
  onRefresh: () => void;
}) {
  const upd = useMutationToast({
    ...mutationOptions({
      mutationFn: (data: Record<string, unknown>) =>
        apiClient(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] });
        onRefresh();
      }
    })
  });
  const del = useMutationToast({
    ...mutationOptions({
      mutationFn: () => apiClient(`/tasks/${task.id}`, { method: 'DELETE' }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] });
        onRefresh();
      }
    }),
    successMsg: '已删除'
  });
  const { data: taskMats, refetch: refetchMats } = useQuery(
    queryOptions({
      queryKey: ['task-materials', task.id],
      queryFn: () => apiClient<KanbanTaskMaterial[]>(`/tasks/${task.id}/materials`)
    })
  );
  const [matOpen, setMatOpen] = useState(false);
  const isDone = task.status === 'done';
  const prio = String(task.priority || 3);
  const mats = taskMats ?? [];
  const visibleMats = mats.slice(0, 3);
  const overflowMats = mats.slice(3);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isUrgent = !isDone && task.dueDate && task.dueDate.slice(0, 10) <= todayStr;

  return (
    <div className='flex flex-col gap-1.5'>
      <div
        className={`flex items-center gap-3 px-4 py-2.5 bg-card border rounded-lg hover:shadow-sm hover:-translate-y-px transition-all text-sm ${
          isUrgent ? 'border-red-400 animate-pulse hover:border-red-500' : 'hover:border-primary'
        }`}
      >
        {/* Left: checkbox + title + material tags */}
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <button
            onClick={() => upd.mutate({ status: isDone ? 'todo' : 'done' })}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-primary'}`}
          >
            {isDone && <Icons.check className='h-3 w-3 text-white' />}
          </button>
          <Input
            className={`flex-1 min-w-0 h-7 text-sm font-medium border-transparent bg-transparent hover:border-border focus:border-primary ${isDone ? 'line-through text-muted-foreground' : ''}`}
            value={task.title}
            onChange={(e) => upd.mutate({ title: e.target.value })}
          />
          {visibleMats.map((tm) => {
            const isMissing = tm.material?.status === 'missing';
            return (
              <Badge
                key={tm.id}
                variant='outline'
                title={isMissing ? '物料缺失，请在物料管理中补充' : ''}
                className={`text-[10px] px-1.5 py-0 h-5 gap-1 cursor-default flex-shrink-0 ${isMissing ? 'border-red-400 bg-red-50 text-red-600' : 'border-stone-200 bg-stone-50 text-stone-600'}`}
              >
                {tm.material?.name ?? '?'}
                <button
                  onClick={() =>
                    apiClient(`/task-materials/${tm.id}`, { method: 'DELETE' }).then(() => {
                      refetchMats();
                      onRefresh();
                    })
                  }
                  className='hover:text-destructive ml-0.5'
                >
                  <Icons.close className='h-2.5 w-2.5' />
                </button>
              </Badge>
            );
          })}
          {overflowMats.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='text-[10px] text-muted-foreground hover:text-primary flex-shrink-0 px-1 py-0.5 rounded hover:bg-secondary'>
                  +{overflowMats.length}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-48 max-h-60 overflow-y-auto'>
                {overflowMats.map((tm) => {
                  const isMissing = tm.material?.status === 'missing';
                  return (
                    <DropdownMenuItem
                      key={tm.id}
                      className='flex items-center justify-between text-xs py-1.5'
                    >
                      <span className='truncate flex-1'>{tm.material?.name ?? '?'}</span>
                      <Badge
                        variant='outline'
                        className={`text-[10px] px-1 py-0 h-4 ml-2 flex-shrink-0 ${isMissing ? 'border-red-400 bg-red-50 text-red-600' : 'border-stone-200 bg-stone-50 text-stone-600'}`}
                      >
                        {isMissing ? '缺失' : '已有'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          apiClient(`/task-materials/${tm.id}`, { method: 'DELETE' }).then(() => {
                            refetchMats();
                            onRefresh();
                          });
                        }}
                        className='ml-1 hover:text-destructive'
                      >
                        <Icons.close className='h-2.5 w-2.5' />
                      </button>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: action buttons */}
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          <Button
            variant='ghost'
            size='sm'
            className='h-6 w-6 p-0 text-muted-foreground hover:text-primary'
            onClick={() => setMatOpen(true)}
            title='关联物料'
          >
            <Icons.add className='h-3.5 w-3.5' />
          </Button>
          <Select value={prio} onValueChange={(v) => upd.mutate({ priority: +v })}>
            <SelectTrigger
              className={`h-6 w-16 text-[10px] font-semibold rounded-full px-1.5 border-0 ${{ '1': 'bg-emerald-50 text-emerald-600', '2': 'bg-slate-50 text-slate-500', '3': 'bg-red-50 text-red-600' }[prio] ?? ''}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='1'>次要</SelectItem>
              <SelectItem value='2'>一般</SelectItem>
              <SelectItem value='3'>重要</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type='date'
            className='w-[140px] h-7 text-xs'
            value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
            onChange={(e) => upd.mutate({ dueDate: e.target.value })}
          />
          <MemberSelect taskId={task.id} assignees={task.assignees ?? []} onRefresh={onRefresh} />
          {(task.assignees ?? []).length > 0 &&
            (task.assignees ?? []).map((a) => (
              <Badge key={a.id} variant='outline' className='text-[10px] gap-1'>
                {a.member?.displayName}
                <button
                  onClick={() =>
                    apiClient(`/task-assignees/${a.id}`, { method: 'DELETE' }).then(onRefresh)
                  }
                  className='hover:text-destructive ml-0.5'
                >
                  <Icons.close className='h-2.5 w-2.5' />
                </button>
              </Badge>
            ))}
          {task.isBlocked && (
            <Badge variant='outline' className='text-[10px] bg-red-50 text-red-600 border-red-200'>
              阻塞
            </Badge>
          )}
          <button
            onClick={() => del.mutate(undefined as never)}
            className='p-0.5 rounded hover:bg-destructive/10 hover:text-destructive'
          >
            <Icons.trash className='h-3 w-3' />
          </button>
        </div>
      </div>
      <MaterialPickerDialog
        open={matOpen}
        onOpenChange={setMatOpen}
        taskId={task.id}
        linkedIds={new Set(mats.map((m) => m.materialId))}
        onLinked={() => {
          refetchMats();
          onRefresh();
        }}
      />
    </div>
  );
}

function ApplyDialog({
  open,
  onOpenChange,
  templateName,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateName: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>应用流程模板</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>
          应用新模板将<strong>清空</strong>当前所有阶段和任务，替换为新模板内容。模板本身不会改变。
        </p>
        <p className='text-sm text-muted-foreground mt-2'>
          确定应用 <strong>{templateName}</strong>？
        </p>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm}>确认应用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaterialsTab({ stages, selectedId }: { stages: KanbanStage[]; selectedId: string | null }) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);
  const targetStages = selectedId ? stages.filter((s) => s.id === selectedId) : stages;

  // Deduplicate by materialId, collect all stage+task refs
  const matMap = new Map<
    string,
    { material: KanbanTaskMaterial['material'] & { category?: { id: string; name: string } }; refs: { stageName: string; taskTitle: string }[] }
  >();
  for (const s of targetStages) {
    for (const t of s.tasks ?? []) {
      for (const tm of t.taskMaterials ?? []) {
        if (!tm.material) continue;
        const existing = matMap.get(tm.materialId);
        if (existing) {
          existing.refs.push({ stageName: s.name, taskTitle: t.title });
        } else {
          matMap.set(tm.materialId, {
            material: tm.material,
            refs: [{ stageName: s.name, taskTitle: t.title }]
          });
        }
      }
    }
  }
  const allItems = Array.from(matMap.values());

  // Group by category
  const catMap = new Map<string, { id: string; name: string; items: typeof allItems }>();
  for (const item of allItems) {
    const cat = item.material.category;
    if (!cat) continue;
    if (!catMap.has(cat.id)) catMap.set(cat.id, { id: cat.id, name: cat.name, items: [] });
    catMap.get(cat.id)!.items.push(item);
  }
  const categories = Array.from(catMap.values());
  const activeCat = activeCatId ? catMap.get(activeCatId) : categories[0];
  const totalUnique = allItems.length;
  const missingCount = allItems.filter((m) => m.material.status === 'missing').length;

  if (allItems.length === 0) {
    return (
      <div className='py-16 text-center text-muted-foreground text-sm'>当前阶段暂无关联物料</div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className='flex items-center gap-4 mb-4 px-1'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-muted-foreground'>物料总计</span>
          <span className='font-bold text-lg'>{totalUnique}</span>
        </div>
        <div className='w-px h-5 bg-border' />
        <div className='flex items-center gap-2 text-sm'>
          <span className='w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0' />
          <span className='text-muted-foreground'>已有</span>
          <span className='font-bold'>{totalUnique - missingCount}</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='w-2 h-2 rounded-full bg-red-400 flex-shrink-0' />
          <span className='text-muted-foreground'>缺失</span>
          <span className='font-bold text-red-500'>{missingCount}</span>
        </div>
        <div className='flex-1' />
        <button
          onClick={() => setMissingOnly(!missingOnly)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
            missingOnly
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          {missingOnly ? '已筛选：仅缺货' : '仅看缺货'}
        </button>
      </div>

      {/* Two-column layout */}
      <div
        className='flex gap-0 border rounded-lg overflow-hidden min-h-[320px]'
        style={{ height: 'calc(100vh - 420px)' }}
      >
        {/* Left: category list */}
        <div className='w-56 flex-shrink-0 border-r bg-muted/20 overflow-y-auto'>
          {categories.map((cat) => {
            const catMissing = cat.items.filter((m) => m.material.status === 'missing').length;
            const isActive = (activeCat?.id ?? categories[0]?.id) === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  isActive ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                }`}
              >
                <span className='truncate'>{cat.name}</span>
                {catMissing > 0 ? (
                  <span className='text-xs text-red-500 font-medium ml-2 flex-shrink-0'>
                    ({catMissing})
                  </span>
                ) : (
                  <span className='text-xs text-emerald-500 ml-2 flex-shrink-0'>✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: material list */}
        <div className='flex-1 min-w-0 divide-y overflow-y-auto'>
          {(activeCat ?? categories[0])?.items
            .filter((item) => !missingOnly || item.material.status === 'missing')
            .map((item, i) => {
              const mat = item.material;
              const isMissing = mat.status === 'missing';
              return (
                <div
                  key={i}
                  className='px-5 py-2.5 hover:bg-muted/30 transition-colors flex items-center gap-3 text-sm'
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isMissing ? 'bg-red-400' : 'bg-emerald-400'}`}
                  />
                  <span className='font-medium truncate'>{mat.name}</span>
                  {mat.quantity != null && (
                    <span className='text-xs text-muted-foreground font-mono'>
                      (x{mat.quantity})
                    </span>
                  )}
                  <span className='text-muted-foreground/30 flex-shrink-0'>|</span>
                  <span className='text-xs text-muted-foreground truncate flex-1 min-w-0'>
                    {item.refs.map((ref, j) => (
                      <span key={j}>
                        {j > 0 && <span className='text-muted-foreground/30'>、</span>}
                        {ref.stageName}阶段 → {ref.taskTitle}任务
                      </span>
                    ))}
                  </span>
                  {isMissing && (
                    <span className='text-[11px] px-1.5 py-px rounded-full font-medium bg-red-50 text-red-600 flex-shrink-0'>
                      缺货
                    </span>
                  )}
                </div>
              );
            })}
          {(activeCat ?? categories[0])?.items.filter(
            (item) => !missingOnly || item.material.status === 'missing'
          ).length === 0 && (
            <div className='px-5 py-12 text-center text-sm text-muted-foreground'>
              {missingOnly ? '此分类无缺货物料' : '此分类暂无物料'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
