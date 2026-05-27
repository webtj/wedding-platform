'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  getTaskMaterials,
  removeTaskMaterial,
  confirmTaskMaterial
} from '@/features/materials/api/service';
import { MaterialPickerDialog } from '@/components/materials/MaterialPickerDialog';
import type { TaskMaterial } from '@/features/materials/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';
import { TASK_STATUS_ICON, TASK_STATUS_LABEL } from '@/lib/task-constants';

type Props = {
  task: any;
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRefresh: () => void;
};

export function TaskDetailSheet({ task, projectId, open, onOpenChange, onRefresh }: Props) {
  const { data: taskMats, refetch: refetchMats } = useQuery(
    queryOptions({
      queryKey: ['task-materials', task.id],
      queryFn: () => getTaskMaterials(task.id),
      enabled: open
    })
  );

  const [linkOpen, setLinkOpen] = useState(false);

  const updateTask = useMutationToast({
    ...mutationOptions({
      mutationFn: (data: any) =>
        apiClient(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] });
        onRefresh();
      }
    })
  });

  const completeTask = useMutationToast({
    ...mutationOptions({
      mutationFn: () => apiClient(`/tasks/${task.id}/complete`, { method: 'POST' }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] });
        onRefresh();
      }
    }),
    successMsg: '任务已完成',
    errorMsg: '操作失败'
  });

  const unlinkMat = useMutationToast({
    ...mutationOptions({
      mutationFn: (id: string) => removeTaskMaterial(id),
      onSuccess: () => refetchMats()
    }),
    successMsg: '已解除关联'
  });

  const confirmMat = useMutationToast({
    ...mutationOptions({
      mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
        confirmTaskMaterial(id, confirmed),
      onSuccess: () => refetchMats()
    }),
    successMsg: '已确认'
  });

  const materials = taskMats ?? [];
  const allConfirmed = materials.every((tm: TaskMaterial) => tm.confirmed);
  const allAvailable = materials.every((tm: TaskMaterial) => tm.material?.status === 'available');
  const canComplete = materials.length === 0 || (allConfirmed && allAvailable);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base'>
              {TASK_STATUS_ICON[task.status]} {task.title}
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-5'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge variant='outline'>{TASK_STATUS_LABEL[task.status] ?? task.status}</Badge>
              {task.dueDate && (
                <span className='text-xs text-muted-foreground'>
                  截止 {toDateDisplay(task.dueDate)}
                </span>
              )}
              {task.isBlocked && (
                <Badge variant='outline' className='bg-red-100 text-red-700 border-red-300'>
                  阻塞
                </Badge>
              )}
            </div>

            <div className='flex items-center gap-2'>
              {task.status === 'todo' && (
                <Button
                  size='sm'
                  onClick={() =>
                    updateTask.mutate(
                      { status: 'in_progress' },
                      { onSuccess: () => onOpenChange(false) }
                    )
                  }
                >
                  开始
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  size='sm'
                  onClick={() =>
                    completeTask.mutate(undefined as any, { onSuccess: () => onOpenChange(false) })
                  }
                  disabled={!canComplete}
                >
                  完成
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                onClick={() => updateTask.mutate({ isBlocked: !task.isBlocked })}
              >
                {task.isBlocked ? '取消阻塞' : '阻塞'}
              </Button>
            </div>
            {!canComplete && task.status === 'in_progress' && (
              <p className='text-xs text-red-600'>物料未全部确认或存在缺失，无法完成此任务</p>
            )}

            <AssigneesSection taskId={task.id} />

            <div className='border-t pt-4'>
              <div className='flex items-center justify-between mb-3'>
                <h4 className='font-semibold text-sm'>关联物料 ({materials.length})</h4>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => setLinkOpen(true)}
                >
                  + 关联物料
                </Button>
              </div>

              {materials.length === 0 ? (
                <p className='text-sm text-muted-foreground py-4 text-center'>暂未关联物料</p>
              ) : (
                <div className='space-y-2'>
                  {materials.map((tm: TaskMaterial) => (
                    <div
                      key={tm.id}
                      className='flex items-center justify-between py-2 px-3 rounded-lg border text-sm'
                    >
                      <div className='flex items-center gap-2 flex-1 min-w-0'>
                        <span>{tm.material?.status === 'available' ? '✅' : '❌'}</span>
                        <span className='truncate'>{tm.material?.name ?? '(已删除)'}</span>
                        {tm.material?.quantity != null && (
                          <span className='text-xs text-muted-foreground'>
                            x{tm.material.quantity}
                          </span>
                        )}
                      </div>
                      <div className='flex items-center gap-1 flex-shrink-0'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className={`h-6 text-xs ${tm.confirmed ? 'text-emerald-600' : 'text-muted-foreground'}`}
                          onClick={() => confirmMat.mutate({ id: tm.id, confirmed: !tm.confirmed })}
                        >
                          {tm.confirmed ? '已确认' : '确认'}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 text-xs text-destructive'
                          onClick={() => unlinkMat.mutate(tm.id)}
                        >
                          移除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MaterialPickerDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        taskId={task.id}
        linkedIds={new Set(materials.map((tm: TaskMaterial) => tm.materialId))}
        onLinked={() => refetchMats()}
      />
    </>
  );
}

function AssigneesSection({ taskId }: { taskId: string }) {
  const { data: assignees, refetch } = useQuery(
    queryOptions({
      queryKey: ['task-assignees', taskId],
      queryFn: () => apiClient<any[]>(`/tasks/${taskId}/assignees`)
    })
  );
  const { data: members } = useQuery(
    queryOptions({
      queryKey: ['tenant-members'],
      queryFn: () => apiClient<any[]>('/tenant-members')
    })
  );
  const [adding, setAdding] = useState(false);

  const addAssignee = useMutationToast({
    ...mutationOptions({
      mutationFn: (memberId: string) =>
        apiClient(`/tasks/${taskId}/assignees`, {
          method: 'POST',
          body: JSON.stringify({ memberId })
        }),
      onSuccess: () => refetch()
    }),
    successMsg: '已添加'
  });

  const removeAssignee = useMutationToast({
    ...mutationOptions({
      mutationFn: (id: string) => apiClient(`/task-assignees/${id}`, { method: 'DELETE' }),
      onSuccess: () => refetch()
    })
  });

  const assignedIds = new Set((assignees ?? []).map((a: any) => a.memberId));
  const availableMembers = (members ?? []).filter((m: any) => !assignedIds.has(m.id));

  return (
    <div className='border-t pt-4'>
      <div className='flex items-center justify-between mb-3'>
        <h4 className='font-semibold text-sm'>指派成员 ({(assignees ?? []).length})</h4>
        <Button
          variant='outline'
          size='sm'
          className='h-7 text-xs'
          onClick={() => setAdding(!adding)}
        >
          {adding ? '取消' : '+ 添加'}
        </Button>
      </div>
      {adding && (
        <div className='flex flex-wrap gap-1.5 mb-3'>
          {availableMembers.length === 0 ? (
            <p className='text-xs text-muted-foreground py-2'>所有成员已指派</p>
          ) : (
            availableMembers.map((m: any) => (
              <button
                key={m.id}
                onClick={() => addAssignee.mutate(m.id)}
                className='px-2.5 py-1 rounded-full border text-xs hover:border-primary hover:text-primary transition-colors'
              >
                {m.displayName}
              </button>
            ))
          )}
        </div>
      )}
      <div className='flex flex-wrap gap-1.5'>
        {(assignees ?? []).map((a: any) => (
          <Badge key={a.id} variant='secondary' className='text-xs gap-1 pr-1'>
            {a.member?.displayName ?? '成员'}
            <button onClick={() => removeAssignee.mutate(a.id)} className='hover:text-destructive'>
              <Icons.close className='h-3 w-3' />
            </button>
          </Badge>
        ))}
        {(assignees ?? []).length === 0 && (
          <p className='text-xs text-muted-foreground'>未指派成员</p>
        )}
      </div>
    </div>
  );
}
