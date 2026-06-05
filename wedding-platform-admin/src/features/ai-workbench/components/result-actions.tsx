'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { FeedbackDialog } from './feedback-dialog';
import type { AiGeneration } from '../api/types';

interface ResultActionsProps {
  generation: AiGeneration;
  onDownloadAll: (gen: AiGeneration) => void;
  onDownloadOne: (gen: AiGeneration, index: number) => void;
  onBookmark: (gen: AiGeneration) => void;
  onGenerateSeries: (gen: AiGeneration, instruction: string) => void;
}

export function ResultActions({
  generation,
  onDownloadAll,
  onDownloadOne,
  onBookmark,
  onGenerateSeries
}: ResultActionsProps) {
  const urls = generation.resultImageUrls ?? [];
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <Button
        variant='ghost'
        size='sm'
        className='text-muted-foreground hover:text-primary h-7 gap-1 px-2 text-xs'
        onClick={() => onBookmark(generation)}
      >
        <Icons.sparkles className='size-3.5' />
        {generation.isBookmarked ? '已收藏' : '收藏'}
      </Button>
      {urls.length > 0 && (
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground h-7 gap-1 px-2 text-xs'
          onClick={() => onDownloadOne(generation, 0)}
        >
          <Icons.upload className='size-3.5 rotate-180' />
          下载单张
        </Button>
      )}
      {urls.length > 1 && (
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground h-7 gap-1 px-2 text-xs'
          onClick={() => onDownloadAll(generation)}
        >
          <Icons.upload className='size-3.5 rotate-180' />
          下载全部
        </Button>
      )}
      <FeedbackDialog generationId={generation.id}>
        <Button
          variant='ghost'
          size='sm'
          className='text-muted-foreground hover:text-primary h-7 gap-1 px-2 text-xs'
        >
          <Icons.star className='size-3.5' />
          评价
        </Button>
      </FeedbackDialog>
      <button
        type='button'
        onClick={() =>
          onGenerateSeries(generation, '生成同系列桌卡，保留当前风格、花材和留白')
        }
        className='bg-card hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors'
      >
        <Icons.check className='text-primary size-3' />
        生成同系列桌卡
      </button>
    </div>
  );
}
