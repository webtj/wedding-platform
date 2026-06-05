'use client';

import { useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '../store/canvas-store';
import { useSceneStore } from '../store/scene-store';

interface PropertyPanelProps {
  className?: string;
}

export function PropertyPanel({ className }: PropertyPanelProps) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const objects = useSceneStore((s) => s.objects);
  const updateObject = useSceneStore((s) => s.updateObject);
  const removeObject = useSceneStore((s) => s.removeObject);
  const pushHistory = useSceneStore((s) => s.pushHistory);

  const selectedObjects = useMemo(
    () => objects.filter((o) => selectedIds.has(o.id)),
    [objects, selectedIds]
  );

  const single = selectedObjects.length === 1 ? selectedObjects[0] : null;

  const handleChange = useCallback(
    (field: string, value: string | number) => {
      if (!single) return;
      pushHistory();
      if (field === 'name') {
        updateObject(single.id, { name: value as string });
      } else if (field === 'x' || field === 'y') {
        updateObject(single.id, {
          position: { ...single.position, [field]: Number(value) }
        });
      } else if (field === 'width' || field === 'depth') {
        updateObject(single.id, {
          size: { ...single.size, [field]: Number(value) }
        });
      } else if (field === 'rotation') {
        updateObject(single.id, { rotation: Number(value) });
      }
    },
    [single, updateObject, pushHistory]
  );

  const handleDelete = useCallback(() => {
    for (const obj of selectedObjects) {
      removeObject(obj.id);
    }
    useCanvasStore.getState().clearSelection();
  }, [selectedObjects, removeObject]);

  const handleBatchDelete = useCallback(() => {
    for (const obj of selectedObjects) {
      removeObject(obj.id);
    }
    useCanvasStore.getState().clearSelection();
  }, [selectedObjects, removeObject]);

  const handleBatchRotate = useCallback(
    (angle: number) => {
      pushHistory();
      for (const obj of selectedObjects) {
        updateObject(obj.id, { rotation: (obj.rotation + angle) % 360 });
      }
    },
    [selectedObjects, updateObject, pushHistory]
  );

  const handleBatchMove = useCallback(
    (dx: number, dy: number) => {
      pushHistory();
      for (const obj of selectedObjects) {
        updateObject(obj.id, {
          position: {
            x: Math.max(0, obj.position.x + dx),
            y: Math.max(0, obj.position.y + dy)
          }
        });
      }
    },
    [selectedObjects, updateObject, pushHistory]
  );

  if (selectedObjects.length === 0) {
    return (
      <div className={cn('flex flex-col border-l bg-background', className)}>
        <div className='shrink-0 border-b px-3 py-2'>
          <h3 className='text-xs font-semibold'>属性</h3>
        </div>
        <div className='flex flex-1 items-center justify-center p-4'>
          <p className='text-muted-foreground text-center text-xs'>
            选中物料后<br />在此编辑属性
          </p>
        </div>
      </div>
    );
  }

  if (!single) {
    // Multiple selection - show batch operations
    return (
      <div className={cn('flex flex-col border-l bg-background', className)}>
        <div className='shrink-0 border-b px-3 py-2'>
          <h3 className='text-xs font-semibold'>批量操作</h3>
        </div>
        <ScrollArea className='flex-1'>
          <div className='space-y-4 p-3'>
            <p className='text-muted-foreground text-xs'>
              已选中 {selectedObjects.length} 个物料
            </p>

            <Separator />

            <div className='space-y-2'>
              <Label className='text-[11px]'>旋转</Label>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 flex-1 text-xs'
                  onClick={() => handleBatchRotate(90)}
                >
                  旋转 90°
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 flex-1 text-xs'
                  onClick={() => handleBatchRotate(-90)}
                >
                  旋转 -90°
                </Button>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-[11px]'>移动 (m)</Label>
              <div className='grid grid-cols-3 gap-1'>
                <div />
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => handleBatchMove(0, -1)}
                >
                  ↑
                </Button>
                <div />
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => handleBatchMove(-1, 0)}
                >
                  ←
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => handleBatchMove(0, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => handleBatchMove(1, 0)}
                >
                  →
                </Button>
              </div>
            </div>

            <Separator />

            <Button
              variant='destructive'
              size='sm'
              className='h-7 w-full text-xs'
              onClick={handleBatchDelete}
            >
              <Icons.trash className='mr-2 size-3' />
              删除选中
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col border-l bg-background', className)}>
      <div className='flex shrink-0 items-center justify-between border-b px-3 py-2'>
        <h3 className='text-xs font-semibold'>属性</h3>
        <Button
          variant='ghost'
          size='icon'
          className='size-6 text-destructive'
          onClick={handleDelete}
          title='删除'
        >
          <Icons.trash className='size-3' />
        </Button>
      </div>

      <ScrollArea className='flex-1'>
        <div className='space-y-4 p-3'>
          <div className='space-y-2'>
            <Label className='text-[11px]'>名称</Label>
            <Input
              value={single.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className='h-7 text-xs'
            />
          </div>

          <Separator />

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-[11px]'>X (m)</Label>
              <Input
                type='number'
                step='0.1'
                value={single.position.x.toFixed(1)}
                onChange={(e) => handleChange('x', e.target.value)}
                className='h-7 text-xs'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[11px]'>Y (m)</Label>
              <Input
                type='number'
                step='0.1'
                value={single.position.y.toFixed(1)}
                onChange={(e) => handleChange('y', e.target.value)}
                className='h-7 text-xs'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-[11px]'>宽 (m)</Label>
              <Input
                type='number'
                step='0.1'
                value={single.size.width}
                onChange={(e) => handleChange('width', e.target.value)}
                className='h-7 text-xs'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-[11px]'>深 (m)</Label>
              <Input
                type='number'
                step='0.1'
                value={single.size.depth}
                onChange={(e) => handleChange('depth', e.target.value)}
                className='h-7 text-xs'
              />
            </div>
          </div>

          <div className='space-y-1'>
            <Label className='text-[11px]'>旋转 (°)</Label>
            <Input
              type='number'
              step='1'
              value={single.rotation}
              onChange={(e) => handleChange('rotation', e.target.value)}
              className='h-7 text-xs'
            />
          </div>

          <Separator />

          <div className='text-muted-foreground space-y-1 text-[10px]'>
            <p>类型: {single.type}</p>
            <p>分类: {single.category}</p>
            <p>图层: {single.layerId}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
