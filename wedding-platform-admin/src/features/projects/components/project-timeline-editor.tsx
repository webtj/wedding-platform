'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface TimelineItem {
  id: string;
  tenantId: string;
  projectId: string;
  startTime: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  location?: string | null;
  status: string;
  sortOrder: number;
  visibleToCouple: boolean;
  reminderMinutesBefore?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TimelineItemPayload {
  startTime: string;
  title: string;
  description?: string;
  owner?: string;
  location?: string;
  status: string;
  visibleToCouple: boolean;
  sortOrder: number;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待定', color: 'bg-slate-100 text-slate-600' },
  { value: 'ready', label: '就绪', color: 'bg-blue-50 text-blue-600' },
  { value: 'in_progress', label: '进行中', color: 'bg-amber-50 text-amber-600' },
  { value: 'done', label: '已完成', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'canceled', label: '已取消', color: 'bg-red-50 text-red-500' }
] as const;

function getStatusOption(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
}

const timelineQ = (projectId: string) =>
  queryOptions({
    queryKey: ['timeline', projectId],
    queryFn: () => apiClient<TimelineItem[]>(`/projects/${projectId}/timeline-items`)
  });

interface ProjectTimelineEditorProps {
  projectId: string;
}

export function ProjectTimelineEditor({ projectId }: ProjectTimelineEditorProps) {
  const { data: items, isLoading } = useQuery(timelineQ(projectId));
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleEdit(item: TimelineItem) {
    setEditingItem(item);
    setEditOpen(true);
  }

  function handleAdd() {
    setEditingItem(null);
    setEditOpen(true);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const sorted = items ?? [];
    const oldI = sorted.findIndex((t) => t.id === a.id);
    const newI = sorted.findIndex((t) => t.id === over.id);
    if (oldI === -1 || newI === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(oldI, 1);
    reordered.splice(newI, 0, moved);
    const payload = reordered.map((t, i) => ({ id: t.id, sortOrder: i }));
    apiClient(`/projects/${projectId}/timeline-items/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ items: payload })
    }).then(() => {
      getQueryClient().invalidateQueries({ queryKey: ['timeline', projectId] });
    });
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <Icons.spinner className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const sorted = items ?? [];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold'>婚礼时间线 ({sorted.length})</h3>
        <Button variant='outline' size='sm' className='h-7 text-xs' onClick={handleAdd}>
          <Icons.add className='h-3 w-3 mr-1' />
          添加节点
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className='py-12 text-center text-muted-foreground text-sm border rounded-lg border-dashed'>
          暂无时间线节点，点击上方按钮添加
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={sorted.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='flex flex-col gap-2'>
              {sorted.map((item, i) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  index={i}
                  projectId={projectId}
                  onEdit={() => handleEdit(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TimelineItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        item={editingItem}
      />
    </div>
  );
}

function TimelineRow({
  item,
  index,
  projectId,
  onEdit
}: {
  item: TimelineItem;
  index: number;
  projectId: string;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [delOpen, setDelOpen] = useState(false);
  const statusOpt = getStatusOption(item.status);

  const del = useMutationToast({
    ...mutationOptions({
      mutationFn: () => apiClient(`/timeline-items/${item.id}`, { method: 'DELETE' }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['timeline', projectId] });
      }
    }),
    successMsg: '已删除'
  });

  const startDate = new Date(item.startTime);
  const dateStr = `${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()}`;
  const timeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 px-4 py-3 bg-card border rounded-lg hover:shadow-sm hover:border-primary transition-all text-sm ${
          isDragging ? 'opacity-50 shadow-lg z-10' : ''
        }`}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0'
        >
          <Icons.gripVertical className='h-4 w-4' />
        </div>

        {/* Index */}
        <span className='text-[10px] font-mono font-bold text-muted-foreground w-5 text-center flex-shrink-0'>
          {index + 1}
        </span>

        {/* Time */}
        <div className='flex flex-col items-start flex-shrink-0 w-20'>
          <span className='text-xs font-medium'>{dateStr}</span>
          <span className='text-[11px] text-muted-foreground font-mono'>{timeStr}</span>
        </div>

        {/* Title + details */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='font-medium truncate'>{item.title}</span>
            <Badge variant='outline' className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${statusOpt.color}`}>
              {statusOpt.label}
            </Badge>
          </div>
          <div className='flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground'>
            {item.owner && (
              <span className='flex items-center gap-1'>
                <Icons.user className='h-3 w-3' />
                {item.owner}
              </span>
            )}
            {item.location && (
              <span className='flex items-center gap-1'>
                <Icons.location className='h-3 w-3' />
                {item.location}
              </span>
            )}
            {item.visibleToCouple && (
              <span className='flex items-center gap-1 text-primary/60'>
                <Icons.eye className='h-3 w-3' />
                客户可见
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1 flex-shrink-0'>
          <button
            onClick={onEdit}
            className='p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground'
          >
            <Icons.edit className='h-3.5 w-3.5' />
          </button>
          <button
            onClick={() => setDelOpen(true)}
            className='p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
          >
            <Icons.trash className='h-3.5 w-3.5' />
          </button>
        </div>
      </div>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除时间线节点</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            确定要删除 <strong>{item.title}</strong> 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDelOpen(false)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                del.mutate(undefined);
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

function TimelineItemDialog({
  open,
  onOpenChange,
  projectId,
  item
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  item: TimelineItem | null;
}) {
  const isEdit = !!item;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('pending');
  const [visibleToCouple, setVisibleToCouple] = useState(true);

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (!open) return;
    if (item) {
      const d = new Date(item.startTime);
      setTitle(item.title);
      setDate(d.toISOString().slice(0, 10));
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setDescription(item.description ?? '');
      setOwner(item.owner ?? '');
      setLocation(item.location ?? '');
      setStatus(item.status);
      setVisibleToCouple(item.visibleToCouple);
    } else {
      setTitle('');
      setDate(new Date().toISOString().slice(0, 10));
      setTime('09:00');
      setDescription('');
      setOwner('');
      setLocation('');
      setStatus('pending');
      setVisibleToCouple(true);
    }
  }, [open, item]);

  const createMut = useMutationToast({
    ...mutationOptions({
      mutationFn: (data: TimelineItemPayload) =>
        apiClient(`/projects/${projectId}/timeline-items`, {
          method: 'POST',
          body: JSON.stringify(data)
        }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['timeline', projectId] });
        onOpenChange(false);
      }
    }),
    successMsg: '已创建'
  });

  const updateMut = useMutationToast({
    ...mutationOptions({
      mutationFn: (data: TimelineItemPayload) =>
        apiClient(`/timeline-items/${item?.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        }),
      onSuccess: () => {
        getQueryClient().invalidateQueries({ queryKey: ['timeline', projectId] });
        onOpenChange(false);
      }
    }),
    successMsg: '已更新'
  });

  function handleSubmit() {
    if (!title.trim() || !date) return;
    const startTime = `${date}T${time || '09:00'}:00.000Z`;
    const payload = {
      startTime,
      title: title.trim(),
      description: description.trim() || undefined,
      owner: owner.trim() || undefined,
      location: location.trim() || undefined,
      status,
      visibleToCouple,
      sortOrder: item?.sortOrder ?? 0
    };
    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑时间线节点' : '添加时间线节点'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label className='text-xs'>标题 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='例如：迎亲、仪式、晚宴...'
              className='h-8 text-sm'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs'>日期 *</Label>
              <Input
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>时间</Label>
              <Input
                type='time'
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className='h-8 text-sm'
              />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs'>描述</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='可选的详细描述...'
              className='h-8 text-sm'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs'>负责人</Label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder='负责人姓名'
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>地点</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder='地点'
                className='h-8 text-sm'
              />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs'>状态</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className='h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className='flex items-center gap-2 cursor-pointer' htmlFor='visible-to-couple'>
            <Checkbox
              id='visible-to-couple'
              checked={visibleToCouple}
              onCheckedChange={(v) => setVisibleToCouple(!!v)}
            />
            <span className='text-xs'>对客户可见</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !date}>
            {saving && <Icons.spinner className='h-3 w-3 mr-1 animate-spin' />}
            {isEdit ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
