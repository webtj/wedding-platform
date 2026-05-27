'use client';

import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { mutationToast } from '@/lib/toast';
import type { MutationOptions } from '@tanstack/react-query';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  mutation: MutationOptions<unknown, Error, unknown>;
  id: string;
  label?: string;
};

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  mutation,
  id,
  label
}: Props) {
  const del = useMutation({
    ...mutation,
    ...mutationToast({ success: label ? `已删除 ${label}` : '删除成功', error: '删除失败' })
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={del.isPending}
            onClick={() => del.mutate(id, { onSuccess: () => onOpenChange(false) })}
          >
            {del.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
