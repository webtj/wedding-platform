'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { deleteLeadMutation } from '../api/queries';
import type { Lead } from '../api/types';

export function DeleteLeadDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const del = useMutationToast({
    ...deleteLeadMutation,
    successMsg: '已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>确定要删除意向单吗？此操作不可撤销。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={del.isPending}
            onClick={() => del.mutate(lead.id, { onSuccess: () => onOpenChange(false) })}
          >
            {del.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
