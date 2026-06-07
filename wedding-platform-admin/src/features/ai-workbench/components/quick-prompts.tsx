'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { QUICK_PROMPTS } from '../constants';
import type { AiTemplate } from '../api/types';

interface QuickPromptsProps {
  promptTemplates?: AiTemplate[];
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ promptTemplates, onSelect }: QuickPromptsProps) {
  const prompts =
    promptTemplates && promptTemplates.length > 0
      ? promptTemplates.map((t) => ({ key: t.id, label: t.name, prompt: t.prompt }))
      : QUICK_PROMPTS.map((p) => ({ key: p, label: p, prompt: p }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-primary'
        >
          <Icons.sparkles className='size-3.5' />
          <span>灵感</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' side='top' className='w-72 p-2'>
        <p className='text-muted-foreground mb-1.5 px-1 text-xs'>选择后填入输入框，可继续补充</p>
        <div className='max-h-48 overflow-y-auto'>
          {prompts.map((item) => (
            <button
              key={item.key}
              type='button'
              onClick={() => onSelect(item.prompt)}
              className='hover:bg-accent w-full rounded-md px-2.5 py-2 text-left transition-colors'
            >
              <span className='block text-xs font-medium'>{item.label}</span>
              <span className='text-muted-foreground line-clamp-2 text-[11px]'>{item.prompt}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
