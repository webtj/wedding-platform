'use client';

import { useEffect, useState } from 'react';
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
import type { MaterialCategory } from '../api/types';

export function CategoryDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MaterialCategory;
  onSave: (d: { name: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  useEffect(() => {
    if (open) setName(initial?.name ?? '');
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑分类' : '添加分类'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label>名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSave({ name: name.trim() })} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
