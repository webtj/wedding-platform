'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { createMaterialMutation } from '../api/queries';

export function QuickAddMat({ catId }: { catId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const add = useMutationToast({ ...createMaterialMutation, successMsg: '已添加' });
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function save() {
    if (!title.trim()) return;
    add.mutate(
      { categoryId: catId, name: title.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle('');
        }
      }
    );
  }

  if (!open)
    return (
      <Button
        variant='ghost'
        size='sm'
        className='text-xs text-muted-foreground hover:text-foreground gap-1 h-7'
        onClick={() => setOpen(true)}
      >
        <Icons.add className='h-3 w-3' />
        快速添加
      </Button>
    );

  return (
    <div className='flex items-center gap-2'>
      <Input
        ref={ref}
        placeholder='物料名称，回车创建'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
        className='h-7 text-xs flex-1'
      />
      <Button size='sm' className='h-7 text-xs' onClick={save} disabled={!title.trim()}>
        添加
      </Button>
    </div>
  );
}
