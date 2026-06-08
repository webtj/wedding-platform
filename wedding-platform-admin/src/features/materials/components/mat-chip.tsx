'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { toggleMaterialStatusMutation, deleteMaterialMutation } from '../api/queries';
import { STATUS_LABEL } from '../constants';
import type { Material } from '../api/types';
import { isBuiltIn } from '../api/types';

export function MatChip({
  material,
  categoryId,
  isPlatformAdmin,
  onEdit
}: {
  material: Material;
  categoryId: string;
  isPlatformAdmin: boolean;
  onEdit: () => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toggle = useMutationToast({ ...toggleMaterialStatusMutation, successMsg: '状态已更新' });
  const del = useMutationToast({ ...deleteMaterialMutation, successMsg: '物料已删除' });
  const builtIn = isBuiltIn(material);
  const isAvail = material.status === 'available';
  const isOutOfStock = material.quantity === 0;
  const isPending = toggle.isPending || del.isPending;
  const nextStatus = isAvail ? 'missing' : 'available';

  function handleToggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if (isPending || (builtIn && !isPlatformAdmin)) return;
    toggle.mutate({ id: material.id, categoryId, nextStatus });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(e);
    }
  }

  function handleDelete() {
    setPopoverOpen(false);
    del.mutate(material.id);
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <div
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm ${
          isAvail
            ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
            : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
        } ${isPending ? 'opacity-60' : ''}`}
        aria-busy={isPending}
      >
        <button
          type='button'
          onClick={handleToggle}
          onKeyDown={handleKey}
          className='flex items-center gap-2 flex-1 min-w-0 cursor-pointer outline-none'
          aria-label={`切换状态为 ${STATUS_LABEL[nextStatus]}`}
          aria-pressed={isAvail}
          disabled={isPending}
        >
          {isAvail ? (
            <Icons.circleCheck className='h-4 w-4 text-emerald-500 flex-shrink-0' />
          ) : (
            <Icons.circleX className='h-4 w-4 text-amber-500 flex-shrink-0' />
          )}
          <PopoverTrigger asChild>
            <span
              role='button'
              tabIndex={0}
              className='flex-1 truncate text-xs text-left hover:underline cursor-help outline-none'
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
              }}
            >
              {material.name}
              {builtIn && (
                <Badge variant='secondary' className='ml-1 text-[9px] px-1 py-0'>
                  内置
                </Badge>
              )}
            </span>
          </PopoverTrigger>
        </button>
        {material.quantity != null && (
          <Badge
            variant={isOutOfStock ? 'destructive' : 'secondary'}
            className={`text-xs px-1.5 py-0 h-5 font-mono flex-shrink-0 ${
              isOutOfStock ? 'animate-pulse' : ''
            }`}
            title={isOutOfStock ? '库存为 0' : `数量: ${material.quantity}`}
          >
            {material.quantity}
          </Badge>
        )}
        {(!builtIn || isPlatformAdmin) && (
          <div className='hidden group-hover:flex items-center gap-0.5 flex-shrink-0'>
            <Button
              variant='ghost'
              size='icon'
              className='size-6'
              title='编辑'
              onClick={(e) => {
                e.stopPropagation();
                setPopoverOpen(false);
                onEdit();
              }}
            >
              <Icons.edit className='size-3' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-6 text-destructive'
              title='删除'
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Icons.trash className='size-3' />
            </Button>
          </div>
        )}
      </div>
      <PopoverContent
        side='top'
        align='center'
        className='w-64 p-3 space-y-2'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            {isAvail ? (
              <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
            ) : (
              <Icons.circleX className='h-4 w-4 text-amber-500' />
            )}
            <span className='font-semibold text-sm truncate'>{material.name}</span>
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span>状态：{STATUS_LABEL[material.status]}</span>
            {material.quantity != null && (
              <>
                <span>·</span>
                <span className={isOutOfStock ? 'text-destructive font-medium' : ''}>
                  数量 {material.quantity}
                </span>
              </>
            )}
          </div>
          {material.note && (
            <p className='text-xs text-muted-foreground pt-1 border-t'>{material.note}</p>
          )}
        </div>
        {(!builtIn || isPlatformAdmin) && (
          <div className='flex gap-1 pt-1 border-t'>
            <Button
              variant='outline'
              size='sm'
              className='flex-1 h-7 text-xs'
              onClick={handleToggle}
              disabled={isPending}
            >
              切换为 {STATUS_LABEL[nextStatus]}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              onClick={() => {
                setPopoverOpen(false);
                onEdit();
              }}
            >
              编辑
            </Button>
          </div>
        )}
        {builtIn && !isPlatformAdmin && (
          <p className='text-xs text-muted-foreground pt-1 border-t'>
            内置物料，不可编辑
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
