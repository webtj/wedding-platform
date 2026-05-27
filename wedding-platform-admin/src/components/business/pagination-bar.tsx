'use client';

import { Button } from '@/components/ui/button';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({ page, totalPages, total, onPageChange }: Props) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm text-muted-foreground'>共 {total} 条</span>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </Button>
        <span className='text-sm'>
          {page} / {totalPages || 1}
        </span>
        <Button
          variant='outline'
          size='sm'
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
