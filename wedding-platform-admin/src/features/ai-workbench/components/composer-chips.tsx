'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { STYLES, COUNT_OPTIONS, STYLE_PREVIEWS, QUICK_PROMPTS } from '../constants';
import type { AiTemplate, MaterialType } from '../api/types';

interface ComposerChipsProps {
  materialTypes: MaterialType[];
  promptTemplates?: AiTemplate[];
  selectedTypeId: string | null;
  size: { width: number; height: number };
  style: string;
  count: number;
  onSelectType: (m: MaterialType) => void;
  onUsePromptTemplate?: (prompt: string) => void;
  onChangeSize: (size: { width: number; height: number }) => void;
  onChangeStyle: (style: string) => void;
  onChangeCount: (count: number) => void;
  compact?: boolean;
}

function Chip({
  label,
  value,
  active,
  children
}: {
  label: string;
  value: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
            active
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary'
          )}
        >
          <span className='font-medium'>{label}</span>
          <span className={cn('font-medium', active ? 'text-primary' : 'text-foreground')}>
            {value}
          </span>
          <Icons.chevronDown className='size-3' />
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' side='top' className='w-96 p-3'>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// Common preset sizes (mm) for material design
const PRESET_SIZES = [
  { label: '迎宾牌', w: 600, h: 900 },
  { label: '誓言卡', w: 120, h: 170 },
  { label: '餐卡 / 桌卡', w: 100, h: 150 },
  { label: '手卡', w: 90, h: 140 },
  { label: '指示牌', w: 200, h: 300 },
  { label: '照片墙', w: 800, h: 1200 },
  { label: '社媒方图', w: 1024, h: 1024 },
  { label: '竖版海报', w: 1080, h: 1920 }
];

export function ComposerChips({
  materialTypes,
  promptTemplates,
  selectedTypeId,
  size,
  style,
  count,
  onSelectType,
  onUsePromptTemplate,
  onChangeSize,
  onChangeStyle,
  onChangeCount
}: ComposerChipsProps) {
  const selectedType = materialTypes.find((m) => m.id === selectedTypeId);
  const styleOpt = STYLES.find((s) => s.id === style);
  const prompts =
    promptTemplates && promptTemplates.length > 0
      ? promptTemplates.map((template) => ({
          key: template.id,
          label: template.name,
          prompt: template.prompt
        }))
      : QUICK_PROMPTS.map((prompt) => ({ key: prompt, label: prompt, prompt }));

  return (
    <div className='flex flex-wrap gap-1.5'>
      <Chip label='物料' value={selectedType?.name ?? '选择'} active={!!selectedType}>
        <p className='text-muted-foreground mb-2 text-xs'>选择物料类型</p>
        <ScrollArea className='max-h-56'>
          <div className='grid grid-cols-3 gap-1.5'>
            {materialTypes.map((m) => (
              <button
                key={m.id}
                type='button'
                onClick={() => onSelectType(m)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition-colors',
                  m.id === selectedTypeId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <span className='text-lg leading-none'>{m.icon ?? '📄'}</span>
                <span className='text-xs font-medium'>{m.name}</span>
                {m.defaultSize && (
                  <span className='text-muted-foreground font-mono text-[10px]'>
                    {m.defaultSize.width}×{m.defaultSize.height}
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </Chip>

      <Chip label='比例' value={`${size.width}×${size.height}`} active>
        <p className='text-muted-foreground mb-2 text-xs'>常用婚礼物料尺寸</p>
        <div className='grid grid-cols-2 gap-1.5'>
          {PRESET_SIZES.map((s) => {
            const isActive = s.w === size.width && s.h === size.height;
            return (
              <button
                key={s.label}
                type='button'
                onClick={() => onChangeSize({ width: s.w, height: s.h })}
                className={cn(
                  'flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                )}
              >
                <span>{s.label}</span>
                <span className='text-muted-foreground font-mono text-[10px]'>
                  {s.w}×{s.h}
                </span>
              </button>
            );
          })}
        </div>
      </Chip>

      <Chip label='风格' value={styleOpt?.label ?? style} active>
        <p className='text-muted-foreground mb-2 text-xs'>选择视觉风格</p>
        <div className='grid grid-cols-4 gap-2'>
          {STYLES.map((s) => {
            const preview = STYLE_PREVIEWS[s.id];
            return (
              <button
                key={s.id}
                type='button'
                onClick={() => onChangeStyle(s.id)}
                className={cn(
                  'rounded-lg border p-1.5 text-left transition-colors',
                  s.id === style
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <span
                  className='mb-1 block aspect-square rounded-md'
                  style={{ background: preview?.preview }}
                />
                <span className='block truncate text-[11px] font-medium'>{s.label}</span>
                <span className='text-muted-foreground block truncate text-[10px]'>
                  {preview?.hint}
                </span>
              </button>
            );
          })}
        </div>
      </Chip>

      <Chip label='数量' value={String(count)} active>
        <p className='text-muted-foreground mb-2 text-xs'>生成数量</p>
        <div className='grid grid-cols-4 gap-1.5'>
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type='button'
              onClick={() => onChangeCount(n)}
              className={cn(
                'rounded-lg border py-2 text-center text-xs font-medium transition-colors',
                n === count
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              {n}张
            </button>
          ))}
        </div>
      </Chip>

      <Chip label='推荐词' value='灵感' active={false}>
        <p className='text-muted-foreground mb-2 text-xs'>选择后会填入输入框，可继续补充细节</p>
        <div className='grid gap-1.5'>
          {prompts.map((item) => (
            <button
              key={item.key}
              type='button'
              onClick={() => onUsePromptTemplate?.(item.prompt)}
              className='hover:bg-accent rounded-md px-2.5 py-2 text-left transition-colors'
            >
              <span className='block text-xs font-medium'>{item.label}</span>
              <span className='text-muted-foreground line-clamp-2 text-[11px]'>{item.prompt}</span>
            </button>
          ))}
        </div>
      </Chip>
    </div>
  );
}
