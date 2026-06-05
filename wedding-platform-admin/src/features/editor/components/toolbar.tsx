'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useSceneStore } from '../store/scene-store';
import { useCanvasStore } from '../store/canvas-store';

interface EditorToolbarProps {
  saving?: boolean;
  onSave: () => void;
  onExport: () => void;
  onBack: () => void;
  showAiPanel?: boolean;
  onToggleAiPanel?: () => void;
  className?: string;
}

export function EditorToolbar({
  saving,
  onSave,
  onExport,
  onBack,
  showAiPanel,
  onToggleAiPanel,
  className,
}: EditorToolbarProps) {
  const undo = useSceneStore((s) => s.undo);
  const redo = useSceneStore((s) => s.redo);
  const undoStack = useSceneStore((s) => s.undoStack);
  const redoStack = useSceneStore((s) => s.redoStack);
  const dirty = useSceneStore((s) => s.dirty);

  const showGrid = useCanvasStore((s) => s.showGrid);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const toggleSnap = useCanvasStore((s) => s.toggleSnap);

  return (
    <div className={cn('flex items-center gap-1 border-b bg-background px-3 py-1.5', className)}>
      <Button variant='ghost' size='sm' className='h-7 gap-1 text-xs' onClick={onBack}>
        <Icons.chevronLeft className='size-3' />
        返回
      </Button>

      <Separator orientation='vertical' className='mx-1 h-5' />

      <Button
        variant='ghost'
        size='icon'
        className='size-7'
        onClick={undo}
        disabled={undoStack.length === 0}
        title='撤销 (Ctrl+Z)'
      >
        <Icons.undo className='size-3.5' />
      </Button>

      <Button
        variant='ghost'
        size='icon'
        className='size-7'
        onClick={redo}
        disabled={redoStack.length === 0}
        title='重做 (Ctrl+Shift+Z)'
      >
        <Icons.redo className='size-3.5' />
      </Button>

      <Separator orientation='vertical' className='mx-1 h-5' />

      <Button
        variant={showGrid ? 'secondary' : 'ghost'}
        size='icon'
        className='size-7'
        onClick={toggleGrid}
        title='网格'
      >
        <Icons.grid className='size-3.5' />
      </Button>

      <Button
        variant={snapToGrid ? 'secondary' : 'ghost'}
        size='icon'
        className='size-7'
        onClick={toggleSnap}
        title='吸附'
      >
        <Icons.magnet className='size-3.5' />
      </Button>

      <Separator orientation='vertical' className='mx-1 h-5' />

      <Button
        variant={showAiPanel ? 'secondary' : 'ghost'}
        size='sm'
        className='h-7 gap-1 text-xs'
        onClick={onToggleAiPanel}
        title='AI 助手'
      >
        <Icons.sparkles className='size-3.5' />
        AI
      </Button>

      <div className='flex-1' />

      {dirty && (
        <span className='text-muted-foreground text-[10px]'>未保存</span>
      )}

      <Button
        variant='outline'
        size='sm'
        className='h-7 gap-1 text-xs'
        onClick={onSave}
        disabled={saving || !dirty}
      >
        {saving ? <Icons.spinner className='size-3 animate-spin' /> : <Icons.check className='size-3' />}
        保存
      </Button>

      <Button variant='ghost' size='sm' className='h-7 gap-1 text-xs' onClick={onExport}>
        <Icons.upload className='size-3 rotate-180' />
        导出
      </Button>
    </div>
  );
}
