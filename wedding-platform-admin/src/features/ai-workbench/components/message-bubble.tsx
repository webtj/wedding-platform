'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { REFINE_SUGGESTIONS } from '../constants';
import { ResultActions } from './result-actions';
import type { AiGeneration } from '../api/types';

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
  materialName: string;
  size: { width: number; height: number } | null;
  style: string | null;
}

export interface AiMessage {
  id: string;
  role: 'ai';
  status: 'thinking' | 'done';
  text?: string;
  generation?: AiGeneration;
  count: number | null;
}

export type ChatMessage = UserMessage | AiMessage;

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className='flex justify-end'>
      <div className='max-w-[70%]'>
        <div className='bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed'>
          {message.text}
        </div>
        <div className='mt-1.5 flex flex-wrap justify-end gap-1'>
          <Badge variant='secondary' className='h-4 px-1.5 text-[10px]'>
            {message.materialName}
          </Badge>
          <Badge variant='secondary' className='h-4 px-1.5 text-[10px]'>
            {message.size ? `${message.size.width}×${message.size.height}` : '默认尺寸'}
          </Badge>
          <Badge variant='secondary' className='h-4 px-1.5 text-[10px]'>
            {message.style ?? '默认风格'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <span className='text-muted-foreground inline-flex items-center gap-1.5 text-sm'>
      <span className='flex gap-1'>
        <span className='bg-primary size-1.5 animate-bounce rounded-full [animation-delay:0ms]' />
        <span className='bg-primary size-1.5 animate-bounce rounded-full [animation-delay:150ms]' />
        <span className='bg-primary size-1.5 animate-bounce rounded-full [animation-delay:300ms]' />
      </span>
      正在为你生成，预计需要十几秒...
    </span>
  );
}

function gridCols(count: number) {
  if (count <= 1) return 'grid-cols-1 max-w-xs';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2 sm:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3';
}

interface AiBubbleProps {
  message: AiMessage;
  onPreview: (url: string) => void;
  onRefine: (feedback: string) => void;
  onRegenerate: () => void;
  onDownloadAll: (gen: AiGeneration) => void;
  onDownloadOne: (gen: AiGeneration, index: number) => void;
  onBookmark: (gen: AiGeneration) => void;
  onGenerateSeries: (gen: AiGeneration, instruction: string) => void;
  onImageSelect?: (generationId: string, imageId: string) => void;
  onImageBookmark?: (generationId: string, imageId: string, isBookmarked: boolean) => void;
}

export function AiBubble({
  message,
  onPreview,
  onRefine,
  onRegenerate,
  onDownloadAll,
  onDownloadOne,
  onBookmark,
  onGenerateSeries,
  onImageSelect,
  onImageBookmark
}: AiBubbleProps) {
  const gen = message.generation;
  const urls = gen?.resultImageUrls ?? (gen?.resultImageUrl ? [gen.resultImageUrl] : []);
  const images = gen?.images ?? [];
  const isDone = message.status === 'done';
  const failed = isDone && (!gen || gen.status === 'failed' || urls.length === 0);
  const [selectingImageId, setSelectingImageId] = useState<string | null>(null);
  const [bookmarkingImageId, setBookmarkingImageId] = useState<string | null>(null);

  return (
    <div className='flex items-start gap-3'>
      <div className='from-primary flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br to-rose-400 text-sm text-white'>
        <Icons.sparkles className='size-4' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-muted-foreground mb-2 text-xs'>婚礼美学 AI</p>

        {message.status === 'thinking' && <Thinking />}

        {isDone && failed && (
          <>
            <p className='text-destructive bg-destructive/5 mb-3 rounded-lg border border-destructive/20 px-3 py-2 text-sm leading-relaxed'>
              {message.text ?? '抱歉，本次生成失败了。请确认超管已在「通用设置」配置图像模型与 API Key，或调整描述后重试。'}
            </p>
            <Button variant='outline' size='sm' className='h-7 gap-1 text-xs' onClick={onRegenerate}>
              <Icons.spinner className='size-3.5' />
              重新生成
            </Button>
          </>
        )}

        {isDone && !failed && gen && (
          <>
            <p className='text-foreground mb-3 text-sm leading-relaxed'>
              已为你生成 {urls.length} 张效果图，可以下载或继续微调：
            </p>

            <div className={cn('mb-3 grid gap-2.5', gridCols(urls.length))}>
              {urls.map((url, idx) => {
                const image = images[idx];
                const isSelected = image?.isSelected ?? false;
                const isBookmarked = image?.isBookmarked ?? false;
                const imageId = image?.id;
                const isSelecting = imageId ? selectingImageId === imageId : false;
                const isBookmarking = imageId ? bookmarkingImageId === imageId : false;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'group bg-muted relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all',
                      isSelected ? 'border-primary ring-primary/20 ring-2' : 'border-transparent'
                    )}
                  >
                    <button type='button' onClick={() => onPreview(url)} className='block size-full'>
                      <Image
                        src={url}
                        alt={`生成结果 ${idx + 1}`}
                        fill
                        unoptimized
                        className='object-cover transition-transform group-hover:scale-105'
                      />
                    </button>

                    {/* Image number badge */}
                    <span className='absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white'>
                      v{idx + 1}
                    </span>

                    {/* Selected indicator */}
                    {isSelected && (
                      <span className='bg-primary absolute top-2 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-md'>
                        <Icons.check className='size-3' />
                      </span>
                    )}

                    {/* Bookmark indicator */}
                    {isBookmarked && (
                      <span className='absolute bottom-2 left-2 flex size-5 items-center justify-center rounded-full bg-yellow-500/90 text-white shadow-sm'>
                        <Icons.heart className='size-3' />
                      </span>
                    )}

                    {/* Action buttons - visible on hover */}
                    <div className='absolute right-2 bottom-2 left-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100'>
                      <div className='flex gap-1'>
                        {/* Select button */}
                        {imageId && onImageSelect && (
                          <button
                            type='button'
                            disabled={isSelecting || isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectingImageId(imageId);
                              onImageSelect(gen.id, imageId);
                              setTimeout(() => setSelectingImageId(null), 1000);
                            }}
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full text-white shadow backdrop-blur-sm transition-colors',
                              isSelected
                                ? 'bg-primary cursor-default'
                                : 'bg-black/50 hover:bg-primary/80'
                            )}
                            title={isSelected ? '当前选中' : '选为当前图片'}
                          >
                            {isSelecting ? (
                              <Icons.spinner className='size-3.5 animate-spin' />
                            ) : (
                              <Icons.circleDot className='size-3.5' />
                            )}
                          </button>
                        )}

                        {/* Bookmark button */}
                        {imageId && onImageBookmark && (
                          <button
                            type='button'
                            disabled={isBookmarking}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookmarkingImageId(imageId);
                              onImageBookmark(gen.id, imageId, !isBookmarked);
                              setTimeout(() => setBookmarkingImageId(null), 1000);
                            }}
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full text-white shadow backdrop-blur-sm transition-colors',
                              isBookmarked
                                ? 'bg-yellow-500/90'
                                : 'bg-black/50 hover:bg-yellow-500/80'
                            )}
                            title={isBookmarked ? '取消收藏' : '收藏这张'}
                          >
                            {isBookmarking ? (
                              <Icons.spinner className='size-3.5 animate-spin' />
                            ) : (
                              <Icons.heart className={cn('size-3.5', isBookmarked && 'fill-current')} />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Download button */}
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadOne(gen, idx);
                        }}
                        className='bg-black/50 hover:bg-primary/80 flex size-7 items-center justify-center rounded-full text-white shadow backdrop-blur-sm transition-colors'
                        title='下载这张'
                      >
                        <Icons.download className='size-3.5' />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <ResultActions
              generation={gen}
              onDownloadAll={onDownloadAll}
              onDownloadOne={onDownloadOne}
              onBookmark={onBookmark}
              onGenerateSeries={onGenerateSeries}
            />

            <div className='mt-3 flex flex-wrap gap-1.5'>
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground hover:text-primary h-7 gap-1 px-2 text-xs'
                onClick={onRegenerate}
              >
                <Icons.spinner className='size-3.5' />
                重新生成
              </Button>
              {REFINE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type='button'
                  onClick={() => onRefine(s)}
                  className='bg-card hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors'
                >
                  <Icons.check className='text-primary size-3' />
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
