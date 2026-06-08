'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { QuickPromptCategory } from '../api/types';

interface QuickPromptsProps {
  categories?: QuickPromptCategory[];
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ categories, onSelect }: QuickPromptsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
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

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => c.id === selectedCategoryId),
    [filteredCategories, selectedCategoryId],
  );

  const totalCount = useMemo(
    () => categories?.reduce((s, c) => s + c.prompts.length, 0) ?? 0,
    [categories],
  );

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setSearch('');
      setSelectedCategoryId(null);
    } else if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        className='w-[520px] p-0 overflow-hidden'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {totalCount === 0 ? (
          <p className='px-3 py-8 text-center text-xs text-muted-foreground'>暂无灵感词</p>
        ) : (
          <div className='flex flex-col'>
            {/* Search bar */}
            <div className='border-b p-2'>
              <Input
                placeholder='搜索推荐词...'
                className='h-7 text-xs'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label='搜索推荐词'
              />
            </div>

            {/* Two-column layout */}
            <div className='flex h-[360px] overflow-hidden'>
              {/* Left: Category list */}
              <div className='w-[180px] shrink-0 border-r bg-muted/20 overflow-y-auto p-1.5 space-y-0.5'>
                {filteredCategories.map((cat, i) => {
                  const colors = [
                    'text-sky-600',
                    'text-violet-600',
                    'text-emerald-600',
                    'text-rose-600',
                    'text-amber-600',
                    'text-cyan-600',
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <button
                      key={cat.id}
                      type='button'
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-xs transition-all',
                        cat.id === selectedCategoryId
                          ? 'bg-card font-medium text-foreground shadow-sm border border-border'
                          : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
                      )}
                    >
                      <Icons.workspace className={cn('size-3.5 shrink-0', color)} />
                      <span className='flex-1 truncate'>{cat.name}</span>
                      <span className='text-[10px] text-muted-foreground/50 tabular-nums'>
                        {cat.prompts.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right: Prompt list */}
              <div className='flex-1 overflow-y-auto p-1.5 space-y-0.5'>
                {selectedCategory ? (
                  selectedCategory.prompts.map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      onClick={() => {
                        onSelect(p.prompt);
                        setOpen(false);
                      }}
                      className='w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-all hover:border-border hover:bg-accent/30 hover:shadow-sm'
                    >
                      <span className='block text-xs font-medium text-foreground'>{p.name}</span>
                      <span className='text-muted-foreground line-clamp-2 text-[11px] leading-relaxed mt-0.5'>
                        {p.prompt}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <p className='text-xs text-muted-foreground/40'>选择一个分类</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
