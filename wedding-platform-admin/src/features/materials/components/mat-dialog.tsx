'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { STATUS_LABEL, STATUS_OPTIONS, type MaterialStatus } from '../constants';
import type { Material } from '../api/types';

export type MatDialogSavePayload =
  | { mode: 'single'; data: { name: string; status: MaterialStatus; quantity?: number; note?: string } }
  | { mode: 'bulk'; items: { name: string }[] };

export function MatDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Material;
  onSave: (payload: MatDialogSavePayload) => void;
}) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState<MaterialStatus>(initial?.status ?? 'missing');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [bulkText, setBulkText] = useState('');

  function reset() {
    setMode('single');
    setName(initial?.name ?? '');
    setStatus(initial?.status ?? 'missing');
    setQuantity(initial?.quantity?.toString() ?? '');
    setNote(initial?.note ?? '');
    setBulkText('');
  }

  function handleSave() {
    if (initial) {
      onSave({
        mode: 'single',
        data: {
          name: name.trim(),
          status,
          quantity: quantity ? Math.max(0, +quantity) : undefined,
          note: note || undefined
        }
      });
      return;
    }
    if (mode === 'bulk') {
      const items = bulkText
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => ({ name: n }));
      onSave({ mode: 'bulk', items });
    } else {
      onSave({
        mode: 'single',
        data: {
          name: name.trim(),
          status,
          quantity: quantity ? Math.max(0, +quantity) : undefined,
          note: note || undefined
        }
      });
    }
  }

  const bulkCount = bulkText.split(/[\n,]/g).filter((s) => s.trim()).length;
  const canSave = initial
    ? !!name.trim()
    : mode === 'bulk'
      ? bulkCount > 0
      : !!name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑物料' : '添加物料'}</DialogTitle>
        </DialogHeader>
        {!initial && (
          <div className='flex gap-1 p-1 bg-muted rounded-md w-fit'>
            <button
              type='button'
              className={`px-3 py-1 text-xs rounded ${
                mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => setMode('single')}
            >
              单个
            </button>
            <button
              type='button'
              className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                mode === 'bulk' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => setMode('bulk')}
            >
              <Icons.forms className='h-3 w-3' />
              批量添加
            </button>
          </div>
        )}
        {mode === 'single' || initial ? (
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <Label>名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='如：新娘手捧'
                aria-label='物料名称'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>状态</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MaterialStatus)}
                  className='border-input bg-card text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm'
                  aria-label='物料状态'
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label>数量</Label>
                <Input
                  type='number'
                  min='0'
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  aria-label='物料数量'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label>备注</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} aria-label='物料备注' />
            </div>
          </div>
        ) : (
          <div className='space-y-2'>
            <Label>每行一个物料（支持中英文逗号分隔）</Label>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'主桌花\n客桌花\n新娘手捧\n胸花, 腕花, 车头花'}
              rows={8}
              className='font-mono text-sm'
              aria-label='批量物料名称'
            />
            {bulkCount > 0 && (
              <p className='text-xs text-muted-foreground'>将创建 {bulkCount} 件物料（全部标记为"缺失"）</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {mode === 'bulk' && !initial ? `添加 ${bulkCount} 件` : '保存'}
          </Button>
        </DialogFooter>
        <span className='sr-only'>{STATUS_LABEL[status]}</span>
      </DialogContent>
    </Dialog>
  );
}
