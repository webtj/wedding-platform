'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { STATUS_LABEL, STATUS_OPTIONS, type MaterialStatus } from '../constants';
import type { Material } from '../api/types';

export function MatDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Material;
  onSave: (d: {
    name: string;
    status: MaterialStatus;
    quantity?: number;
    note?: string;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState<MaterialStatus>(initial?.status ?? 'missing');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  function handleSave() {
    onSave({
      name: name.trim(),
      status,
      quantity: quantity ? Math.max(0, +quantity) : undefined,
      note: note || undefined
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(initial?.name ?? '');
          setStatus(initial?.status ?? 'missing');
          setQuantity(initial?.quantity?.toString() ?? '');
          setNote(initial?.note ?? '');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑物料' : '添加物料'}</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>状态</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaterialStatus)}
                className='border-input bg-card text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm'
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
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>备注</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
        <span className='sr-only'>{STATUS_LABEL[status]}</span>
      </DialogContent>
    </Dialog>
  );
}
