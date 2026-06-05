'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  templateKeys,
  templatesQueryOptions,
  createTemplateMutation,
  deleteTemplateMutation,
  templateByIdOptions,
  addStageMutation,
  updateStageMutation,
  deleteStageMutation,
  addTaskMutation,
  updateTaskMutation,
  deleteTaskMutation
} from '@/features/templates/api/queries';
import { updateTemplate, duplicateTemplate } from '@/features/templates/api/service';
import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import type { TemplateFilters, ProcessTemplate, TemplateStage, TemplateTask } from '@/features/templates/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { apiClient } from '@/lib/api-client';
import PageContainer from '@/components/layout/page-container';

const PRIO: Record<string, string> = {
  '1': 'bg-emerald-50 text-emerald-600',
  '2': 'bg-slate-50 text-slate-500',
  '3': 'bg-red-50 text-red-600'
};
const P_LABEL: Record<string, string> = { '1': '次要', '2': '一般', '3': '重要' };

export default function TemplatesPage() {
  const [params, setParams] = useQueryStates({ search: parseAsString.withDefault('') });
  const [q, setQ] = useState(params.search);
  const debounce = useDebouncedCallback((v: string) => setParams({ search: v }), 400);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState<ProcessTemplate | null>(null);
  const [delStageId, setDelStageId] = useState<string | null>(null);
  const [delTplId, setDelTplId] = useState<string | null>(null);

  const filters: TemplateFilters = { limit: 1000, ...(params.search && { search: params.search }) };
  const { data, isLoading } = useQuery(templatesQueryOptions(filters));
  const create = useMutationToast({ ...createTemplateMutation, successMsg: '模板已创建' });
  const del = useMutationToast({ ...deleteTemplateMutation, successMsg: '模板已删除' });
  const delS = useMutationToast({ ...deleteStageMutation, successMsg: '阶段已删除' });
  const duplicate = useMutationToast({
    ...mutationOptions({
      mutationFn: (id: string) => duplicateTemplate(id),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: templateKeys.all })
    }),
    successMsg: '模板已复制',
    errorMsg: '复制失败'
  });

  return (
    <PageContainer pageTitle='流程模板'>
      <div className='space-y-6'>
        <div className='flex items-center gap-2.5'>
          <div className='relative flex-1 max-w-xs'>
            <Icons.search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索模板...'
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                debounce(e.target.value);
              }}
              className='pl-8 h-8 text-sm'
            />
          </div>
          <div className='flex-1' />
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Icons.add className='mr-1.5 h-3.5 w-3.5' />
            新建模板
          </Button>
        </div>

        {isLoading || !data ? (
          <div className='flex items-center justify-center py-20 text-muted-foreground'>
            <Icons.spinner className='h-5 w-5 animate-spin mr-2' />
            加载中...
          </div>
        ) : data.items.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-20 text-muted-foreground rounded-lg border border-dashed'>
            <Icons.forms className='h-10 w-10 opacity-30' />
            <p className='text-sm'>暂无模板</p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {data.items.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                onEdit={() => setEditTpl(t)}
                onDuplicate={() => duplicate.mutate(t.id)}
                onDeleteRequest={() => setDelTplId(t.id)}
                onDeleteStage={(sid) => setDelStageId(sid)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={(d) => create.mutate(d, { onSuccess: () => setCreateOpen(false) })}
      />
      {editTpl && <EditDialog open onOpenChange={() => setEditTpl(null)} tpl={editTpl} />}
      <Dialog open={!!delStageId} onOpenChange={() => setDelStageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除阶段</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除此阶段将同时删除其下的所有任务，不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDelStageId(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => delS.mutate(delStageId!, { onSuccess: () => setDelStageId(null) })}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!delTplId} onOpenChange={() => setDelTplId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除模板</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除模板将同时删除其下的所有阶段和任务，不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDelTplId(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => del.mutate(delTplId!, { onSuccess: () => setDelTplId(null) })}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function TemplateCard({
  template,
  expanded,
  onToggle,
  onEdit,
  onDuplicate,
  onDeleteRequest,
  onDeleteStage
}: {
  template: ProcessTemplate;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onDeleteStage: (sid: string) => void;
}) {
  const { data: detail, refetch } = useQuery({
    ...templateByIdOptions(template.id),
    enabled: true
  });
  const stages = detail?.stages ?? [];
  const stageCount = stages.length;
  const taskCount = stages.reduce((s: number, st: TemplateStage) => s + (st.tasks?.length ?? 0), 0);

  // Local state for name/desc to avoid flashing
  const [localName, setLocalName] = useState(template.name);
  const [localDesc, setLocalDesc] = useState(template.description ?? '');
  const nameTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const descTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalName(template.name);
    setLocalDesc(template.description ?? '');
  }, [template.name, template.description]);

  function handleNameChange(v: string) {
    setLocalName(v);
    clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => updateTemplate(template.id, { name: v }), 500);
  }
  function handleDescChange(v: string) {
    setLocalDesc(v);
    clearTimeout(descTimer.current);
    descTimer.current = setTimeout(
      () => updateTemplate(template.id, { description: v || undefined }),
      500
    );
  }

  return (
    <div
      className={`group border rounded-2xl bg-card transition-all duration-300 relative overflow-hidden ${
        expanded
          ? ''
          : 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-muted-foreground/20'
      }`}
      onClick={() => !expanded && onToggle()}
      onKeyDown={(e) => e.key === 'Enter' && !expanded && onToggle()}
      role='button'
      tabIndex={0}
    >
      {/* Left accent border — collapsed only */}
      {!expanded && (
        <div className='absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-2xl' />
      )}
      {/* Actions — always visible */}
      {!expanded && (
        <div
          className='absolute top-4 right-4 flex gap-1 z-10'
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          role='button'
          tabIndex={0}
        >
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors'
            onClick={onEdit}
            title='编辑'
          >
            <Icons.edit className='h-3.5 w-3.5' />
          </button>
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer'
            onClick={onDuplicate}
            title='复制'
          >
            <Icons.post className='h-3.5 w-3.5' />
          </button>
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors cursor-pointer'
            onClick={onDeleteRequest}
            title='删除'
          >
            <Icons.trash className='h-3.5 w-3.5' />
          </button>
        </div>
      )}

      {/* Expanded header */}
      {expanded && (
        <div className='flex items-center gap-3 px-5 py-2.5 border-b bg-secondary/20'>
          <button onClick={onToggle} className='p-1 rounded hover:bg-secondary'>
            <Icons.chevronUp className='h-4 w-4' />
          </button>
          <span className='font-semibold text-sm'>编辑中</span>
          <div className='flex-1' />
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors cursor-pointer'
            onClick={onEdit}
          >
            <Icons.edit className='h-3.5 w-3.5' />
          </button>
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors cursor-pointer'
            onClick={onDuplicate}
          >
            <Icons.post className='h-3.5 w-3.5' />
          </button>
          <button
            className='w-8 h-8 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors cursor-pointer'
            onClick={onDeleteRequest}
          >
            <Icons.trash className='h-3.5 w-3.5' />
          </button>
        </div>
      )}

      <div className='p-5'>
        {/* Name / Description — always use local state (synced with detail) */}
        {expanded ? (
          <>
            <Input
              className='text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-0 mb-1'
              value={localName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            <Input
              className='text-sm text-muted-foreground border-none shadow-none focus-visible:ring-0 px-0 h-auto py-0 mb-4'
              value={localDesc}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder='添加描述...'
            />
          </>
        ) : (
          <>
            <h3 className='text-lg font-bold tracking-tight mb-1'>{localName}</h3>
            <p className='text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2'>
              {localDesc || '暂无描述'}
            </p>
          </>
        )}

        {/* Flow viz — collapsed only */}
        {!expanded && stages.length > 0 && (
          <div className='flex items-center gap-0 py-1 overflow-x-auto'>
            {stages.map((s, i) => (
              <div key={s.id} className='flex items-center flex-shrink-0'>
                <div className='flex flex-col items-center'>
                  <div className='w-2.5 h-2.5 rounded-full border-2 border-primary bg-primary/10' />
                  <span className='text-[10px] text-muted-foreground mt-1 text-center truncate w-14'>
                    {s.name}
                  </span>
                </div>
                {i < stages.length - 1 && <div className='w-6 h-0.5 bg-primary/30 mb-4' />}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className='flex gap-2.5 mt-3 flex-wrap'>
          <Badge variant='secondary' className='text-xs font-medium gap-1'>
            <Icons.forms className='h-3 w-3' />
            {stageCount} 个阶段
          </Badge>
          <Badge variant='secondary' className='text-xs font-medium gap-1 text-blue-600 bg-blue-50'>
            <Icons.checks className='h-3 w-3' />
            {taskCount} 个子任务
          </Badge>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && detail && (
        <div className='border-t px-5 pb-5'>
          <ExpandedEditor template={detail} onRefresh={refetch} onDeleteStage={onDeleteStage} />
        </div>
      )}
    </div>
  );
}

function ExpandedEditor({
  template,
  onRefresh,
  onDeleteStage
}: {
  template: ProcessTemplate;
  onRefresh: () => void;
  onDeleteStage: (sid: string) => void;
}) {
  const stages = template.stages ?? [];
  const [activeId, setActiveId] = useState(stages[0]?.id ?? null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const updS = useMutationToast({ ...updateStageMutation, successMsg: '已更新' });
  const current = stages.find((s) => s.id === activeId);
  const addT = useMutationToast({ ...addTaskMutation, successMsg: '任务已添加' });
  const [newTitle, setNewTitle] = useState('');

  return (
    <div className='flex gap-6 pt-4 min-h-[300px]'>
      {/* Left panel: Stages */}
      <div className='w-64 flex-shrink-0 space-y-2'>
        <span className='text-sm font-semibold text-muted-foreground mb-2 block'>阶段流程</span>
        {stages.length === 0 ? (
          <p className='text-sm text-muted-foreground py-3'>暂无阶段</p>
        ) : (
          <div className='relative'>
            {/* Vertical line — behind the circles, not through them */}
            <div className='absolute left-[13px] top-[22px] bottom-[22px] w-0.5 bg-border' />
            {stages.map((s, i) => (
              <div
                key={s.id}
                className={`relative pl-9 py-1.5 cursor-pointer`}
                onClick={() => setActiveId(s.id)}
                onKeyDown={(e) => e.key === 'Enter' && setActiveId(s.id)}
                role='button'
                tabIndex={0}
              >
                {/* Numbered circle — sits ON TOP of the line */}
                <div
                  className={`absolute left-0 top-1.5 w-[26px] h-[26px] rounded-full flex items-center justify-center border-2 z-10 transition-all font-bold text-xs bg-card ${
                    activeId === s.id
                      ? 'border-primary text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]'
                      : 'border-muted-foreground/25 text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                {/* Stage row */}
                <div
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-lg border transition-all ${
                    activeId === s.id
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:bg-secondary/50'
                  }`}
                >
                  {editingStageId === s.id ? (
                    <Input
                      className='h-6 text-sm font-semibold flex-1'
                      value={s.name}
                      onChange={(e) =>
                        updS.mutate({ stageId: s.id, data: { name: e.target.value } })
                      }
                      onBlur={() => setEditingStageId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingStageId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`text-sm font-semibold flex-1 ${activeId === s.id ? 'text-primary' : ''}`}
                    >
                      {s.name}
                    </span>
                  )}
                  <Badge variant='secondary' className='text-[10px]'>
                    {s.tasks?.length ?? 0}
                  </Badge>
                  <button
                    className='w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors'
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStageId(s.id);
                    }}
                  >
                    <Icons.edit className='h-2.5 w-2.5' />
                  </button>
                  <button
                    className='w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStage(s.id);
                    }}
                  >
                    <Icons.trash className='h-2.5 w-2.5' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <AddStageInline templateId={template.id} onAdded={onRefresh} />
      </div>

      {/* Right panel: Tasks */}
      <div className='flex-1 min-w-0 border-l pl-6'>
        {current && (
          <div className='space-y-3'>
            <span className='text-sm font-semibold text-muted-foreground mb-2 block'>
              {current.name} · 子任务
            </span>
            {(current.tasks ?? []).length === 0 && (
              <p className='text-sm text-muted-foreground text-center py-6'>此阶段暂无子任务</p>
            )}
            {(current.tasks ?? []).map((task, i) => (
              <TaskRow key={task.id} task={task} index={i + 1} onRefresh={onRefresh} />
            ))}
            <div className='flex items-center gap-2'>
              <Input
                placeholder='输入任务名称...'
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  newTitle.trim() &&
                  addT.mutate(
                    { stageId: current.id, data: { title: newTitle.trim() } },
                    {
                      onSuccess: () => {
                        setNewTitle('');
                        onRefresh();
                      }
                    }
                  )
                }
                className='h-8 text-sm flex-1'
              />
              <Button
                size='sm'
                className='h-8 text-xs'
                onClick={() =>
                  newTitle.trim() &&
                  addT.mutate(
                    { stageId: current.id, data: { title: newTitle.trim() } },
                    {
                      onSuccess: () => {
                        setNewTitle('');
                        onRefresh();
                      }
                    }
                  )
                }
                disabled={!newTitle.trim()}
              >
                <Icons.add className='h-3.5 w-3.5 mr-1' />
                添加
              </Button>
            </div>
          </div>
        )}

        {!current && stages.length > 0 && (
          <p className='text-sm text-muted-foreground text-center py-16'>
            ← 点击左侧阶段查看和编辑其子任务
          </p>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, index, onRefresh }: { task: TemplateTask; index: number; onRefresh: () => void }) {
  const upd = useMutationToast({ ...updateTaskMutation, successMsg: '已更新' });
  const del = useMutationToast({ ...deleteTaskMutation, successMsg: '已删除' });
  const prio = String(task.priority || 3);
  const assignees = task.assignees ?? [];

  return (
    <div className='flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors text-sm'>
      <span className='font-mono text-xs text-muted-foreground w-5 text-center flex-shrink-0'>
        {index}
      </span>
      <input
        className='flex-1 min-w-[100px] text-sm font-medium border border-transparent bg-transparent hover:border-border focus:border-primary rounded-md px-2 py-1 outline-none transition-colors'
        value={task.title}
        onChange={(e) => upd.mutate({ taskId: task.id, data: { title: e.target.value } })}
        aria-label='任务标题'
      />
      <select
        className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 outline-none cursor-pointer flex-shrink-0 ${PRIO[prio] ?? PRIO['3']}`}
        value={prio}
        onChange={(e) => upd.mutate({ taskId: task.id, data: { priority: +e.target.value } })}
      >
        {Object.entries(P_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <TemplateMemberSelect taskId={task.id} assignees={assignees} onRefresh={onRefresh} />
      <div className='flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground'>
        <span>项目开始后</span>
        <input
          type='number'
          className='w-10 text-center font-mono text-xs border rounded-md py-0.5 px-1 bg-card outline-none focus:border-primary transition-colors'
          value={task.offsetDays}
          onChange={(e) =>
            upd.mutate({ taskId: task.id, data: { offsetDays: +e.target.value || 0 } })
          }
          aria-label='偏移天数'
        />
        <span>天</span>
      </div>
      <button
        className='w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0'
        onClick={() => del.mutate(task.id, { onSuccess: onRefresh })}
      >
        <Icons.trash className='h-3 w-3' />
      </button>
    </div>
  );
}

function TemplateMemberSelect({
  taskId,
  assignees,
  onRefresh
}: {
  taskId: string;
  assignees: TemplateTask['assignees'];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: members } = useQuery({
    queryKey: ['template-tenant-members'],
    queryFn: () => apiClient<{ id: string; displayName: string }[]>('/tenant-members'),
    staleTime: 2 * 60 * 1000
  });
  const assigneeIds = new Set((assignees ?? []).map((a) => a.memberId));

  async function toggle(memberId: string) {
    if (assigneeIds.has(memberId)) {
      const a = (assignees ?? []).find((x) => x.memberId === memberId);
      if (a) await apiClient(`/templates/task-assignees/${a.id}`, { method: 'DELETE' });
    } else {
      await apiClient(`/templates/tasks/${taskId}/assignees`, {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
    }
    onRefresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-7 text-[11px] gap-1 px-2 font-normal'>
          <Icons.user className='h-3 w-3' />
          {(assignees ?? []).length > 0 ? (
            <span>{(assignees ?? []).length}人</span>
          ) : (
            <span className='text-muted-foreground'>指派</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-48 p-0' align='start'>
        <div className='max-h-48 overflow-y-auto p-1'>
          {(members ?? []).map((m) => (
            <div
              key={m.id}
              className='flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs'
              onClick={() => toggle(m.id)}
              onKeyDown={(e) => e.key === 'Enter' && toggle(m.id)}
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

function CreateDialog({
  open,
  onOpenChange,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (d: { name: string; description?: string; category?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建模板</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>分类</Label>
            <Input
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              placeholder='中式/户外/通用'
            />
          </div>
          <div className='space-y-2'>
            <Label>描述</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() =>
              onSave({
                name: name.trim(),
                description: desc || undefined,
                category: cat || undefined
              })
            }
            disabled={!name.trim()}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  open,
  onOpenChange,
  tpl
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tpl: ProcessTemplate;
}) {
  const [name, setName] = useState(tpl.name);
  const [desc, setDesc] = useState(tpl.description ?? '');
  const [cat, setCat] = useState(tpl.category ?? '');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑模板</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>分类</Label>
            <Input value={cat} onChange={(e) => setCat(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>描述</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() =>
              updateTemplate(tpl.id, {
                name: name.trim(),
                description: desc || undefined,
                category: cat || undefined
              }).then(() => onOpenChange(false))
            }
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStageInline({ templateId, onAdded }: { templateId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const addS = useMutationToast({ ...addStageMutation, successMsg: '阶段已添加' });
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function save() {
    if (!name.trim()) return;
    addS.mutate(
      { templateId, data: { name: name.trim() } },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          onAdded();
        }
      }
    );
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/25 text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors ml-7'
      >
        <Icons.add className='h-3 w-3' />
        添加阶段
      </button>
    );
  return (
    <div className='ml-7 flex items-center gap-1.5'>
      <Input
        ref={ref}
        placeholder='阶段名称，回车创建'
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => {
          if (!name.trim()) setOpen(false);
        }}
        className='h-7 text-xs flex-1'
      />
      <Button size='sm' className='h-7 text-xs' onClick={save} disabled={!name.trim()}>
        添加
      </Button>
    </div>
  );
}
