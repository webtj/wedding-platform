'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { AiConversation, AiGeneration } from '../api/types';

interface GenerationHistoryPanelProps {
  items: AiGeneration[];
  loading?: boolean;
  onPreview: (url: string) => void;
  onDownload: (generation: AiGeneration, index: number) => void;
  onLoad: (generation: AiGeneration) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  conversations?: AiConversation[];
  conversationsLoading?: boolean;
  onLoadConversation?: (conversationId: string) => void;
  activeConversationId?: string | null;
}

function getUrls(generation: AiGeneration) {
  return (
    generation.resultImageUrls ?? (generation.resultImageUrl ? [generation.resultImageUrl] : [])
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function GenerationHistoryPanel({
  items,
  loading,
  onPreview,
  onDownload,
  onLoad,
  onDelete,
  onNewConversation,
  conversations = [],
  conversationsLoading,
  onLoadConversation,
  activeConversationId
}: GenerationHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'conversations' | 'generations'>('conversations');
  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id);
    },
    [onDelete]
  );

  return (
    <aside className='hidden min-h-0 w-80 shrink-0 border-l bg-background xl:flex xl:flex-col'>
      <div className='flex shrink-0 items-center justify-between border-b px-4 py-3'>
        <div>
          <h2 className='text-sm font-semibold'>AI 工作台</h2>
          <p className='text-muted-foreground text-xs'>对话与生成历史</p>
        </div>
        <div className='flex items-center gap-1.5'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            title='新建对话'
            onClick={onNewConversation}
          >
            <Icons.add className='size-3.5' />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex shrink-0 border-b'>
        <button
          type='button'
          onClick={() => setActiveTab('conversations')}
          className={cn(
            'flex-1 px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'conversations'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          对话
          {conversations.length > 0 && (
            <Badge variant='secondary' className='ml-1.5 h-4 px-1 text-[10px]'>
              {conversations.length}
            </Badge>
          )}
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('generations')}
          className={cn(
            'flex-1 px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'generations'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          生成记录
          {items.length > 0 && (
            <Badge variant='secondary' className='ml-1.5 h-4 px-1 text-[10px]'>
              {items.length}
            </Badge>
          )}
        </button>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {activeTab === 'conversations' ? (
          <div className='space-y-2 p-3'>
            {conversationsLoading && conversations.length === 0 && (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs'>
                正在加载对话...
              </div>
            )}
            {!conversationsLoading && conversations.length === 0 && (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs'>
                开始对话后会出现在这里
              </div>
            )}
            {conversations.map((convo) => {
              const isActive = convo.id === activeConversationId;
              return (
                <button
                  key={convo.id}
                  type='button'
                  onClick={() => onLoadConversation?.(convo.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                    isActive && 'border-primary bg-accent/50'
                  )}
                >
                  <div className='flex items-center gap-2'>
                    <Icons.chat className='size-3.5 shrink-0 text-muted-foreground' />
                    <p className='min-w-0 flex-1 truncate text-xs font-medium'>
                      {convo.title || '新对话'}
                    </p>
                    {isActive && (
                      <Badge variant='secondary' className='h-4 shrink-0 px-1 text-[9px]'>
                        当前
                      </Badge>
                    )}
                  </div>
                  <p className='text-muted-foreground mt-1.5 text-[11px]'>
                    {formatDate(convo.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className='space-y-3 p-3'>
            {loading && items.length === 0 && (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs'>
                正在加载历史...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs'>
                生成后的图片会出现在这里，可继续会话或下载
              </div>
            )}
            {items.map((generation) => {
              const urls = getUrls(generation);
              const cover = urls[0];
              const completed = generation.status === 'completed' && !!cover;
              return (
                <div key={generation.id} className='group relative rounded-lg border bg-card p-2'>
                  <div className='mb-2 flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <p className='truncate text-xs font-medium'>
                          {generation.materialType?.name ?? '婚礼物料'}
                        </p>
                        {generation.isBookmarked && (
                          <Badge variant='secondary' className='h-4 px-1 text-[9px]'>
                            已收藏
                          </Badge>
                        )}
                      </div>
                      <p className='text-muted-foreground text-[11px]'>
                        {formatDate(generation.createdAt)} · {generation.size.width}x
                        {generation.size.height}
                      </p>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-5 px-1.5 text-[10px]',
                          generation.status === 'failed' && 'border-destructive/40 text-destructive'
                        )}
                      >
                        {generation.status === 'completed'
                          ? '完成'
                          : generation.status === 'failed'
                            ? '失败'
                            : '生成中'}
                      </Badge>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-5'
                        title='删除'
                        onClick={() => handleDelete(generation.id)}
                      >
                        <Icons.close className='size-3 text-muted-foreground hover:text-destructive' />
                      </Button>
                    </div>
                  </div>

                  {completed ? (
                    <div className='grid grid-cols-4 gap-1.5'>
                      {urls.slice(0, 4).map((url, index) => (
                        <button
                          key={`${generation.id}-${url}`}
                          type='button'
                          onClick={() => onPreview(url)}
                          className='group/img relative aspect-square overflow-hidden rounded-md border bg-muted'
                          title='预览'
                        >
                          <Image
                            src={url}
                            alt={`历史图 ${index + 1}`}
                            fill
                            unoptimized
                            className='object-cover'
                          />
                          <span className='absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/img:opacity-100'>
                            v{index + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='text-muted-foreground rounded-md bg-muted/60 px-3 py-4 text-center text-xs'>
                      {generation.errorMessage ?? '暂无可预览图片'}
                    </div>
                  )}

                  <p className='text-muted-foreground mt-2 line-clamp-2 text-[11px] leading-relaxed'>
                    {generation.prompt}
                  </p>
                  <div className='mt-2 flex gap-1.5'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='h-7 flex-1 gap-1 px-2 text-[11px]'
                      onClick={() => onLoad(generation)}
                    >
                      <Icons.chat className='size-3' />
                      继续会话
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='h-7 flex-1 gap-1 px-2 text-[11px]'
                      disabled={!completed}
                      onClick={() => onDownload(generation, 0)}
                    >
                      <Icons.upload className='size-3 rotate-180' />
                      下载
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
