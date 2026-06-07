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
import { voidContractMutation } from '../api/queries';
import type { Contract } from '../api/types';

export function VoidContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const voidCt = useMutationToast({
    ...voidContractMutation,
    successMsg: '合同已撤销',
    errorMsg: '撤销失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认撤销</DialogTitle>
          <DialogDescription>
            撤销合同 {contract.contractNo}{' '}
            将删除此合同数据，并解除与意向单的关联（意向单状态变为"已流失"）。此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={voidCt.isPending}
            onClick={() => voidCt.mutate(contract.id, { onSuccess: () => onOpenChange(false) })}
          >
            {voidCt.isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
