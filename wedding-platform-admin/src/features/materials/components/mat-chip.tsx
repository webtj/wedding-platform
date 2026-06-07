'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { updateMaterialMutation, deleteMaterialMutation } from '../api/queries';
import type { Material } from '../api/types';

export function MatChip({
  material,
  onEdit
}: {
  material: Material;
  onEdit: () => void;
}) {
  const update = useMutationToast({ ...updateMaterialMutation, successMsg: '状态已更新' });
  const del = useMutationToast({ ...deleteMaterialMutation, successMsg: '物料已删除' });
  const isAvail = material.status === 'available';
  const isPending = update.isPending || del.isPending;

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isPending) {
        update.mutate({
          id: material.id,
          data: { status: isAvail ? 'missing' : 'available' }
        });
      }
    }
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm ${
        isAvail
          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
          : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
      } ${isPending ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={() => {
        if (isPending) return;
        update.mutate({
          id: material.id,
          data: { status: isAvail ? 'missing' : 'available' }
        });
      }}
      onKeyDown={handleKey}
      role='button'
      tabIndex={0}
      aria-pressed={isAvail}
    >
      {isAvail ? (
        <Icons.circleCheck className='h-4 w-4 text-emerald-500 flex-shrink-0' />
      ) : (
        <Icons.circleX className='h-4 w-4 text-amber-500 flex-shrink-0' />
      )}
      <span className='flex-1 truncate text-xs'>{material.name}</span>
      {material.quantity != null && (
        <Badge variant='secondary' className='text-xs px-1.5 py-0 h-5 font-mono flex-shrink-0'>
          {material.quantity}
        </Badge>
      )}
      <div className='hidden group-hover:flex items-center gap-0.5 flex-shrink-0'>
        <Button
          variant='ghost'
          size='sm'
          className='h-5 text-xs px-1'
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          编辑
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-5 text-xs px-1 text-destructive'
          onClick={(e) => {
            e.stopPropagation();
            del.mutate(material.id);
          }}
        >
          删除
        </Button>
      </div>
    </div>
  );
}
