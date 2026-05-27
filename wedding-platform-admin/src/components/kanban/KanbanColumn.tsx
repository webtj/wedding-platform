'use client';

import { useState } from 'react';
import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
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
import { Icons } from '@/components/icons';
import { TaskCard } from './TaskCard';

const S_COLOR: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  done: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-500'
};
const S_LABEL: Record<string, string> = {
  pending: '未开始',
  active: '进行中',
  done: '已完成',
  skipped: '已跳过'
};

type Props = { stage: any; projectId: string; onRefresh: () => void };

export function KanbanColumn({ stage, projectId, onRefresh }: Props) {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const pct = stage.taskCount > 0 ? Math.round((stage.doneCount / stage.taskCount) * 100) : 0;

  return (
    <div className='flex-shrink-0 w-72 bg-secondary/30 rounded-xl p-3 flex flex-col'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='font-semibold text-sm'>{stage.name}</h3>
        <Badge variant='outline' className={`text-xs ${S_COLOR[stage.status] ?? ''}`}>
          {S_LABEL[stage.status] ?? stage.status}
        </Badge>
      </div>
      <div className='h-1 bg-border rounded-full mb-1'>
        <div
          className='h-full bg-primary rounded-full transition-all'
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='text-xs text-muted-foreground mb-3'>
        {stage.doneCount}/{stage.taskCount}
      </span>

      <div className='flex flex-col gap-2 flex-1'>
        {stage.tasks?.map((task: any) => (
          <TaskCard key={task.id} task={task} projectId={projectId} onRefresh={onRefresh} />
        ))}
      </div>

      <Button
        variant='ghost'
        size='sm'
        className='mt-2 text-xs'
        onClick={() => setAddTaskOpen(true)}
      >
        + 添加任务
      </Button>
      <CreateTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        projectId={projectId}
        stageId={stage.id}
        onCreated={onRefresh}
      />
    </div>
  );
}

function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  stageId,
  onCreated
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  stageId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [assigneeType, setAssigneeType] = useState('planner');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('3');

  const createTask = useMutationToast({
    ...mutationOptions({
      mutationFn: (data: any) =>
        apiClient(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] })
    }),
    successMsg: '任务已创建',
    errorMsg: '创建失败'
  });

  function save() {
    createTask.mutate(
      {
        title: title.trim(),
        stageId,
        assigneeType,
        dueDate: dueDate || undefined,
        priority: +priority
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle('');
          onCreated();
        }
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加任务</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>负责人</Label>
              <Select value={assigneeType} onValueChange={setAssigneeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='planner'>策划师</SelectItem>
                  <SelectItem value='couple'>新人</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>优先级</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>次要</SelectItem>
                  <SelectItem value='2'>一般</SelectItem>
                  <SelectItem value='3'>重要</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>截止日期</Label>
            <Input type='date' value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
