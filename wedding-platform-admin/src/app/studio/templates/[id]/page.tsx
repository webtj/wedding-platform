'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  templateByIdOptions,
  updateTemplateMutation,
  deleteTemplateMutation,
  addStageMutation,
  updateStageMutation,
  deleteStageMutation,
  addTaskMutation,
  updateTaskMutation,
  deleteTaskMutation
} from '@/features/templates/api/queries';
import { updateStage as updateStageSvc } from '@/features/templates/api/service';
import type { TemplateStage, TemplateTask } from '@/features/templates/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

const ASSIGNEE: Record<string, string> = { planner: '策划师', couple: '新人' };

export default function TemplateEditorPage() {
  const p = useParams();
  const r = useRouter();
  const id = p.id as string;
  const { data, isLoading, refetch } = useQuery(templateByIdOptions(id));
  const upd = useMutationToast({ ...updateTemplateMutation, successMsg: '已更新' });
  const del = useMutationToast({ ...deleteTemplateMutation, successMsg: '模板已删除' });
  const addS = useMutationToast({ ...addStageMutation, successMsg: '阶段已添加' });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [addOpen, setAddOpen] = useState(false);
  const [sName, setSName] = useState('');
  const [delOpen, setDelOpen] = useState(false);

  if (isLoading || !data)
    return <div className='py-32 text-center text-sm text-muted-foreground'>加载中...</div>;
  const stages = data.stages ?? [];
  const totalTasks = stages.reduce((s, st) => s + (st.tasks?.length ?? 0), 0);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = stages.findIndex((s) => s.id === active.id);
    const newI = stages.findIndex((s) => s.id === over.id);
    if (oldI === -1 || newI === -1) return;
    const re = [...stages];
    const [mv] = re.splice(oldI, 1);
    re.splice(newI, 0, mv);
    re.forEach((s, i) => {
      if (s.sortOrder !== i) updateStageSvc(s.id, { sortOrder: i });
    });
    refetch();
  }

  return (
    <PageContainer pageTitle={data.name}>
      <div className='max-w-4xl'>
        {/* Header */}
        <div className='flex items-end justify-between mb-10'>
          <div className='flex items-baseline gap-4'>
            <Button variant='ghost' size='icon' className='h-8 w-8 -ml-2' onClick={() => r.back()}>
              <Icons.chevronLeft className='h-5 w-5' />
            </Button>
            <div>
              <Input
                className='text-2xl font-bold border-none shadow-none focus-visible:ring-0 h-auto py-0 px-0'
                value={data.name}
                onChange={(e) => upd.mutate({ id: data.id, data: { name: e.target.value } })}
              />
              <p className='text-sm text-muted-foreground mt-1'>
                {stages.length} 个阶段 · {totalTasks} 个任务
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button size='sm' onClick={() => setAddOpen(true)}>
              <Icons.add className='mr-1.5 h-4 w-4' />
              添加阶段
            </Button>
            <Button variant='destructive' size='sm' onClick={() => setDelOpen(true)}>
              删除模板
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className='relative'>
              {/* Vertical line */}
              <div className='absolute left-[27px] top-12 bottom-12 w-0.5 bg-border' />

              {stages.map((stage, idx) => (
                <SortableStage
                  key={stage.id}
                  stage={stage}
                  index={idx}
                  isLast={idx === stages.length - 1}
                />
              ))}

              {/* Add stage placeholder */}
              <div className='relative pl-[72px]'>
                <button
                  onClick={() => setAddOpen(true)}
                  className='flex items-center gap-3 py-4 px-5 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/40 hover:bg-primary/5 transition-all w-full group'
                >
                  <div className='w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors'>
                    <Icons.add className='h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors' />
                  </div>
                  <span className='text-sm text-muted-foreground group-hover:text-primary transition-colors'>
                    添加阶段
                  </span>
                </button>
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add stage dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加阶段</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>阶段名称</Label>
            <Input
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              placeholder='如：基础信息确认'
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                sName.trim() &&
                addS.mutate(
                  { templateId: id, data: { name: sName.trim(), sortOrder: stages.length } },
                  {
                    onSuccess: () => {
                      setAddOpen(false);
                      setSName('');
                    }
                  }
                )
              }
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() =>
                addS.mutate(
                  { templateId: id, data: { name: sName.trim(), sortOrder: stages.length } },
                  {
                    onSuccess: () => {
                      setAddOpen(false);
                      setSName('');
                    }
                  }
                )
              }
              disabled={!sName.trim()}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除模板将同时删除所有阶段和任务，不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDelOpen(false)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => del.mutate(data.id, { onSuccess: () => r.push('/studio/templates') })}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function SortableStage({
  stage,
  index,
  isLast: _isLast
}: {
  stage: TemplateStage;
  index: number;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState(stage.name);
  const updS = useMutationToast({ ...updateStageMutation, successMsg: '已更新' });
  const delS = useMutationToast({ ...deleteStageMutation, successMsg: '阶段已删除' });
  const tasks = stage.tasks ?? [];

  function saveName() {
    const t = eName.trim();
    if (t && t !== stage.name) updS.mutate({ stageId: stage.id, data: { name: t } });
    else setEName(stage.name);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative pl-[72px] pb-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Node circle */}
      <div className='absolute left-0 top-6 z-10'>
        <div className='w-[54px] h-[54px] rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-sm'>
          <span className='text-primary font-bold text-lg'>{index + 1}</span>
        </div>
      </div>

      {/* Stage card */}
      <Card className='overflow-hidden'>
        {/* Card header */}
        <div className='flex items-center gap-2.5 px-4 py-2.5 bg-secondary/20'>
          <div
            {...attributes}
            {...listeners}
            className='cursor-grab active:cursor-grabbing p-1 rounded hover:bg-secondary transition-colors'
          >
            <Icons.chevronsUpDown className='h-4 w-4 text-muted-foreground' />
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className='p-1 rounded hover:bg-secondary transition-colors'
          >
            <Icons.chevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          </button>

          {editing ? (
            <Input
              value={eName}
              onChange={(e) => setEName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className='h-8 text-sm font-semibold flex-1'
            />
          ) : (
            <span
              className='font-semibold flex-1 cursor-pointer hover:text-primary transition-colors'
              onClick={() => setEditing(true)}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
              role='button'
              tabIndex={0}
            >
              {stage.name}
            </span>
          )}

          <Badge variant='secondary' className='text-xs'>
            {tasks.length} 个任务
          </Badge>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-muted-foreground hover:text-destructive'
            onClick={() => delS.mutate(stage.id)}
          >
            <Icons.trash className='h-4 w-4' />
          </Button>
        </div>

        {/* Task list */}
        {expanded && (
          <>
            <div className='divide-y'>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <div className='py-8 text-center text-sm text-muted-foreground'>
                  暂无任务，点击下方添加
                </div>
              )}
            </div>
            <div className='border-t px-4 py-2 bg-secondary/10'>
              <QuickAddTask stageId={stage.id} sortOrder={tasks.length} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function TaskRow({ task }: { task: TemplateTask }) {
  const [editing, setEditing] = useState(false);
  const delT = useMutationToast({ ...deleteTaskMutation, successMsg: '已删除' });

  if (editing) return <EditTaskInline task={task} onClose={() => setEditing(false)} />;

  return (
    <div
      className='flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary/20 transition-colors cursor-pointer group'
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      role='button'
      tabIndex={0}
    >
      <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0' />
      <div className='flex-1 min-w-0 flex items-center gap-3'>
        <span className='truncate'>{task.title}</span>
        {task.description && (
          <span className='text-xs text-muted-foreground truncate hidden sm:inline'>
            {task.description}
          </span>
        )}
      </div>
      <div className='flex items-center gap-3 flex-shrink-0'>
        <Badge variant='outline' className='text-xs font-normal'>
          {ASSIGNEE[task.assigneeType] ?? task.assigneeType}
        </Badge>
        <span className='text-xs text-muted-foreground font-mono tabular-nums w-14 text-right'>
          D{task.offsetDays >= 0 ? '+' : ''}
          {task.offsetDays}
        </span>
        <span className='text-xs tracking-widest'>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={i < task.priority ? 'text-amber-500' : 'text-muted-foreground/30'}
            >
              {i < task.priority ? '◆' : '◇'}
            </span>
          ))}
        </span>
      </div>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive flex-shrink-0'
        onClick={(e) => {
          e.stopPropagation();
          delT.mutate(task.id);
        }}
      >
        <Icons.close className='h-3.5 w-3.5' />
      </Button>
    </div>
  );
}

function EditTaskInline({ task, onClose }: { task: TemplateTask; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? '');
  const [assignee, setAssignee] = useState(task.assigneeType);
  const [priority, setPriority] = useState(String(task.priority));
  const [offset, setOffset] = useState(String(task.offsetDays));
  const upd = useMutationToast({ ...updateTaskMutation, successMsg: '已更新' });
  const del = useMutationToast({ ...deleteTaskMutation, successMsg: '已删除' });
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  function save() {
    if (!title.trim()) return;
    upd.mutate(
      {
        taskId: task.id,
        data: {
          title: title.trim(),
          description: desc || undefined,
          assigneeType: assignee,
          priority: +priority,
          offsetDays: +offset
        }
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div
      className='px-4 py-3 space-y-2.5 bg-secondary/5 border-b'
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
      role='button'
      tabIndex={0}
    >
      <Input
        ref={ref}
        placeholder='任务名称'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.metaKey) save();
        }}
        className='h-9 text-sm'
      />
      <Textarea
        placeholder='任务描述（可选）'
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        className='text-sm resize-none'
      />
      <div className='flex items-center gap-4 flex-wrap'>
        <div className='flex items-center gap-2'>
          <Label className='text-xs text-muted-foreground'>负责人</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className='h-8 text-xs w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='planner'>策划师</SelectItem>
              <SelectItem value='couple'>新人</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs text-muted-foreground'>优先级</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className='h-8 text-xs w-20'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  P{v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs text-muted-foreground'>偏移天数</Label>
          <Input
            type='number'
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            className='h-8 w-16 text-xs'
          />
        </div>
      </div>
      <div className='flex items-center gap-2 pt-1'>
        <Button size='sm' onClick={save} disabled={!title.trim()}>
          保存
        </Button>
        <Button variant='ghost' size='sm' onClick={onClose}>
          取消
        </Button>
        <div className='flex-1' />
        <Button
          variant='ghost'
          size='sm'
          className='text-destructive'
          onClick={() => {
            del.mutate(task.id);
            onClose();
          }}
        >
          删除任务
        </Button>
      </div>
    </div>
  );
}

function QuickAddTask({ stageId, sortOrder }: { stageId: string; sortOrder: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const add = useMutationToast({ ...addTaskMutation, successMsg: '已添加' });
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function save() {
    if (!title.trim()) return;
    add.mutate(
      { stageId, data: { title: title.trim(), assigneeType: 'planner', sortOrder } },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle('');
        }
      }
    );
  }

  if (!open) {
    return (
      <Button
        variant='ghost'
        size='sm'
        className='text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7'
        onClick={() => setOpen(true)}
      >
        <Icons.add className='h-3.5 w-3.5' /> 添加任务
      </Button>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <Input
        ref={ref}
        placeholder='输入任务名称，回车创建...'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
        className='h-8 text-sm flex-1'
      />
      <Button size='sm' className='h-8 text-xs' onClick={save} disabled={!title.trim()}>
        添加
      </Button>
    </div>
  );
}
