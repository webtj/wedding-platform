'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { applyTemplate, getTemplates } from '@/features/templates/api/service';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { KanbanColumn } from './KanbanColumn';

const kanbanKeys = { byProject: (pid: string) => ['kanban', pid] as const };

const kanbanQ = (pid: string) =>
  queryOptions({
    queryKey: kanbanKeys.byProject(pid),
    queryFn: () => apiClient<{ stages: any[] }>(`/projects/${pid}/kanban`)
  });

const S_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-300',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  done: 'bg-blue-100 text-blue-700 border-blue-300',
  skipped: 'bg-gray-100 text-gray-500'
};
const S_LABEL: Record<string, string> = {
  pending: '未开始',
  active: '进行中',
  done: '已完成',
  skipped: '已跳过'
};

export function KanbanBoard({ projectId }: { projectId: string }) {
  const { data, isLoading, refetch } = useQuery(kanbanQ(projectId));
  const [applyOpen, setApplyOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);

  if (isLoading || !data)
    return <div className='py-20 text-center text-sm text-muted-foreground'>加载中...</div>;

  const stages = data.stages ?? [];
  const allTasks = stages.flatMap((s: any) => s.tasks ?? []);
  const total = allTasks.length;
  const done = allTasks.filter((t: any) => t.status === 'done').length;
  const inProgress = allTasks.filter((t: any) => t.status === 'in_progress').length;
  const blocked = allTasks.filter((t: any) => t.isBlocked).length;
  const overdue = allTasks.filter(
    (t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className='space-y-8'>
      {/* Flow Track */}
      {stages.length > 0 && (
        <Card>
          <CardContent className='py-5'>
            <div className='flex items-start gap-0 overflow-x-auto'>
              {stages.map((s: any, i: number) => {
                const pct = s.taskCount > 0 ? Math.round((s.doneCount / s.taskCount) * 100) : 0;
                const isDone = pct === 100 && s.taskCount > 0;
                const isActive =
                  s.status === 'active' ||
                  (s.tasks ?? []).some((t: any) => t.status === 'in_progress');
                const isCurrent = isActive && !isDone;
                const color = isDone ? 'done' : isCurrent ? 'active' : 'pending';
                return (
                  <div key={s.id} className='flex items-start flex-1 min-w-[80px]'>
                    <div className='flex flex-col items-center gap-1.5 flex-1'>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isDone
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : isCurrent
                              ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.1)]'
                              : 'border-muted-foreground/25 bg-card text-muted-foreground'
                        }`}
                      >
                        {isDone ? (
                          <Icons.check className='h-4 w-4' />
                        ) : (
                          <span className='text-sm font-bold'>{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium text-center leading-tight max-w-[80px] ${
                          isCurrent
                            ? 'text-primary'
                            : isDone
                              ? 'text-emerald-700'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {s.name}
                      </span>
                      <Badge variant='outline' className={`text-xs ${S_BADGE[color] ?? ''}`}>
                        {pct}%
                      </Badge>
                    </div>
                    {i < stages.length - 1 && (
                      <div className='flex-1 h-0.5 mt-5 mx-0.5 min-w-[12px] bg-border rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-emerald-500 rounded-full transition-all duration-500'
                          style={{ width: `${isDone ? 100 : isCurrent ? Math.max(pct, 15) : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className='grid grid-cols-5 gap-4'>
        <StatCard label='总任务' value={total} />
        <StatCard label='已完成' value={done} color='emerald' />
        <StatCard label='进行中' value={inProgress} color='blue' />
        <StatCard label='已阻塞' value={blocked} color='red' highlight={blocked > 0} />
        <StatCard label='已逾期' value={overdue} color='amber' highlight={overdue > 0} />
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className='flex items-center gap-4'>
          <span className='text-sm font-medium whitespace-nowrap'>总进度</span>
          <div className='flex-1 h-2.5 bg-secondary rounded-full overflow-hidden'>
            <div
              className='h-full bg-primary rounded-full transition-all duration-700 ease-out'
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className='text-sm font-mono font-bold tabular-nums'>{progress}%</span>
        </div>
      )}

      {/* Action bar */}
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={() => setApplyOpen(true)}>
          应用模板
        </Button>
        <Button variant='outline' size='sm' onClick={() => setAddStageOpen(true)}>
          添加阶段
        </Button>
      </div>

      {/* Kanban Columns */}
      {stages.length > 0 ? (
        <div className='flex gap-4 overflow-x-auto pb-4'>
          {stages.map((stage: any) => (
            <KanbanColumn key={stage.id} stage={stage} projectId={projectId} onRefresh={refetch} />
          ))}
        </div>
      ) : (
        <div className='py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl'>
          <p className='text-sm mb-2'>暂无阶段和任务</p>
          <p className='text-xs text-muted-foreground mb-4'>
            点击"应用模板"从流程模板快速创建，或点击"添加阶段"手动创建
          </p>
          <div className='flex items-center justify-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => setApplyOpen(true)}>
              应用模板
            </Button>
            <Button variant='outline' size='sm' onClick={() => setAddStageOpen(true)}>
              添加阶段
            </Button>
          </div>
        </div>
      )}

      <ApplyTemplateDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        projectId={projectId}
        onApplied={refetch}
      />
      <AddStageDialog
        open={addStageOpen}
        onOpenChange={setAddStageOpen}
        projectId={projectId}
        onAdded={refetch}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  highlight
}: {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}) {
  const border = {
    emerald: 'border-l-emerald-500',
    blue: 'border-l-blue-500',
    red: 'border-l-red-500',
    amber: 'border-l-amber-500',
    slate: 'border-l-slate-400'
  };
  return (
    <Card
      className={`border-l-4 ${border[color as keyof typeof border] ?? border.slate} ${highlight ? 'bg-red-50/40' : ''}`}
    >
      <CardContent className='py-3 px-4'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='text-2xl font-bold font-mono tabular-nums mt-0.5'>{value}</p>
      </CardContent>
    </Card>
  );
}

function ApplyTemplateDialog({
  open,
  onOpenChange,
  projectId,
  onApplied
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onApplied: () => void;
}) {
  const [tid, setTid] = useState('');
  const { data } = useQuery(
    queryOptions({ queryKey: ['templates', 'select'], queryFn: () => getTemplates({ limit: 100 }) })
  );
  const apply = useMutationToast({
    ...mutationOptions({
      mutationFn: (id: string) => applyTemplate(projectId, id),
      onSuccess: () =>
        getQueryClient().invalidateQueries({ queryKey: kanbanKeys.byProject(projectId) })
    }),
    successMsg: '模板已应用',
    errorMsg: '应用失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>应用模板</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label>选择模板</Label>
          <Select value={tid} onValueChange={setTid}>
            <SelectTrigger>
              <SelectValue placeholder='选择流程模板...' />
            </SelectTrigger>
            <SelectContent>
              {(data?.items ?? []).map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.category ? ` (${t.category})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() =>
              apply.mutate(tid, {
                onSuccess: () => {
                  onOpenChange(false);
                  onApplied();
                }
              })
            }
            disabled={!tid}
          >
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStageDialog({
  open,
  onOpenChange,
  projectId,
  onAdded
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const add = useMutationToast({
    ...mutationOptions({
      mutationFn: (d: { name: string }) =>
        apiClient(`/projects/${projectId}/stages`, { method: 'POST', body: JSON.stringify(d) }),
      onSuccess: () =>
        getQueryClient().invalidateQueries({ queryKey: kanbanKeys.byProject(projectId) })
    }),
    successMsg: '阶段已添加',
    errorMsg: '添加失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加阶段</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label>名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() =>
              add.mutate(
                { name: name.trim() },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setName('');
                    onAdded();
                  }
                }
              )
            }
            disabled={!name.trim()}
          >
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
