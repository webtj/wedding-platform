'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { QuickPrompt, QuickPromptCategory } from '../api/types';

interface QuickPromptsProps {
  categories?: QuickPromptCategory[];
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ categories, onSelect }: QuickPromptsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        prompts: cat.prompts.filter(
          (p) => p.name.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.prompts.length > 0);
  }, [categories, search]);

  const totalPrompts = useMemo(
    () => categories?.reduce((s, c) => s + c.prompts.length, 0) ?? 0,
    [categories],
  );

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-primary'
        >
          <Icons.sparkles className='size-3.5' />
          <span>灵感</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        side='top'
        className='w-80 p-0'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {totalPrompts === 0 ? (
          <p className='px-3 py-8 text-center text-xs text-muted-foreground'>暂无灵感词</p>
        ) : (
          <>
            <div className='border-b p-2'>
              <Input
                placeholder='搜索推荐词...'
                className='h-7 text-xs'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label='搜索推荐词'
              />
            </div>
            <div className='max-h-[340px] overflow-y-auto p-1.5 space-y-1'>
              {filtered.length === 0 ? (
                <p className='px-2 py-8 text-center text-xs text-muted-foreground'>
                  未找到匹配的推荐词
                </p>
              ) : (
                filtered.map((cat) => (
                  <div key={cat.id}>
                    <div className='flex items-center gap-1.5 px-2 py-1.5'>
                      <Icons.tag className='size-3 text-muted-foreground' />
                      <span className='text-[11px] font-medium text-muted-foreground'>
                        {cat.name}
                      </span>
                      <span className='text-[10px] text-muted-foreground/50'>
                        {cat.prompts.length}
                      </span>
                    </div>
                    <div className='space-y-0.5'>
                      {cat.prompts.map((p) => (
                        <button
                          key={p.id}
                          type='button'
                          onClick={() => {
                            onSelect(p.prompt);
                            setOpen(false);
                          }}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left transition-colors',
                            'hover:bg-accent'
                          )}
                        >
                          <span className='block text-xs font-medium'>{p.name}</span>
                          <span className='text-muted-foreground line-clamp-2 text-[11px] leading-relaxed'>
                            {p.prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
