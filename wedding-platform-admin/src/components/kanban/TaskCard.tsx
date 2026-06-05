'use client';

import { useState } from 'react';
import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toDateDisplay } from '@/lib/date-format';
import { TASK_STATUS_ICON } from '@/lib/task-constants';
import { TaskDetailSheet } from './TaskDetailSheet';
import type { KanbanTask, KanbanAssignee } from './types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

type Props = {
  task: KanbanTask;
  projectId: string;
  onRefresh: () => void;
  isDragOverlay?: boolean;
};

export function TaskCard({ task, projectId, onRefresh, isDragOverlay }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const isBlocked = task.isBlocked;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateTask = useMutationToast({
    ...mutationOptions({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        apiClient(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] })
    }),
    successMsg: '已更新',
    errorMsg: '更新失败'
  });

  const completeTask = useMutationToast({
    ...mutationOptions({
      mutationFn: (id: string) => apiClient(`/tasks/${id}/complete`, { method: 'POST' }),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: ['kanban', projectId] })
    }),
    successMsg: '任务已完成',
    errorMsg: '操作失败'
  });

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'bg-card rounded-lg border p-3 text-sm group',
          isBlocked ? 'border-l-2 border-l-red-500' : '',
          isDragging && 'opacity-40 shadow-lg',
          !isDragOverlay && 'cursor-pointer hover:shadow-md transition-shadow'
        )}
        onClick={() => {
          if (!isDragOverlay) setDetailOpen(true);
        }}
        onKeyDown={(e) => e.key === 'Enter' && setDetailOpen(true)}
        role='button'
        tabIndex={0}
        data-dragging={isDragging ? '' : undefined}
      >
        <div className='flex items-start gap-1'>
          {/* Drag Handle */}
          <button
            className='flex-shrink-0 mt-0.5 p-0.5 rounded cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors opacity-0 group-hover:opacity-100 data-dragging:opacity-100'
            data-dragging={isDragging ? '' : undefined}
            {...attributes}
            {...listeners}
            tabIndex={-1}
            aria-label='拖拽排序'
          >
            <Icons.gripVertical className='h-4 w-4' />
          </button>

          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-2'>
              <span className='font-medium truncate'>
                {TASK_STATUS_ICON[task.status] ?? '⬜'} {task.title}
              </span>
              <span className='text-xs text-muted-foreground flex-shrink-0'>
                {'●'.repeat(task.priority || 2)}
                {'○'.repeat(Math.max(0, 5 - (task.priority || 2)))}
              </span>
            </div>
            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              {task.assignees && task.assignees.length > 0 ? (
                task.assignees.map((a: KanbanAssignee) => (
                  <Badge key={a.id} variant='outline' className='text-xs bg-accent/10 text-accent'>
                    {a.member?.displayName ?? '成员'}
                  </Badge>
                ))
              ) : (
                <Badge variant='outline' className='text-xs text-muted-foreground'>
                  未指派
                </Badge>
              )}
              {task.dueDate && (
                <span
                  className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}
                >
                  {toDateDisplay(task.dueDate)}
                </span>
              )}
              {isBlocked && (
                <Badge variant='outline' className='text-xs bg-red-100 text-red-700 border-red-300'>
                  阻塞
                </Badge>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className='text-xs text-muted-foreground'>
                  {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length}
                </span>
              )}
            </div>
            <div className='flex gap-1 mt-2 pt-2 border-t'>
              {task.status === 'todo' && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 text-xs'
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask.mutate(
                      { id: task.id, data: { status: 'in_progress' } },
                      { onSuccess: onRefresh }
                    );
                  }}
                >
                  开始
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 text-xs'
                  onClick={(e) => {
                    e.stopPropagation();
                    completeTask.mutate(task.id, { onSuccess: onRefresh });
                  }}
                >
                  完成
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='h-6 text-xs'
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask.mutate(
                    { id: task.id, data: { isBlocked: !task.isBlocked } },
                    { onSuccess: onRefresh }
                  );
                }}
              >
                {task.isBlocked ? '解阻' : '阻塞'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isDragOverlay && (
        <TaskDetailSheet
          task={task}
          projectId={projectId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
