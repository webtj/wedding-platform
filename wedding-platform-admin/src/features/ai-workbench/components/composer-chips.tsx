'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { getMaterialTypeIcon } from '@/features/material-types/lib/icon-map';
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

// Common preset sizes (mm) used as fallback when a selected 素材 has no sizes[]
const FALLBACK_SIZES: { width: number; height: number }[] = [
  { width: 1024, height: 1024 },
  { width: 1080, height: 1920 },
  { width: 800, height: 1200 },
  { width: 148, height: 210 },
  { width: 210, height: 297 }
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

  const presetSizes =
    selectedType?.sizes && selectedType.sizes.length > 0
      ? selectedType.sizes
      : selectedType?.defaultSize
        ? [selectedType.defaultSize]
        : FALLBACK_SIZES;
  const presetSourceLabel =
    selectedType?.sizes && selectedType.sizes.length > 0
      ? `${selectedType.name} 预设尺寸`
      : selectedType?.defaultSize
        ? `${selectedType.name} 默认尺寸`
        : '通用尺寸';

  return (
    <div className='flex flex-wrap gap-1.5'>
      <Chip label='素材' value={selectedType?.name ?? '选择'} active={!!selectedType}>
        <p className='text-muted-foreground mb-2 text-xs'>选择素材类型</p>
        <div className='max-h-64 overflow-y-auto'>
          <div className='grid grid-cols-4 gap-1.5'>
            {materialTypes.map((m) => {
              const IconComp = getMaterialTypeIcon(m.icon);
              return (
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
                  <IconComp className='size-5 shrink-0' />
                  <span className='line-clamp-1 w-full text-xs font-medium'>{m.name}</span>
                  {m.defaultSize && (
                    <span className='text-muted-foreground font-mono text-[10px]'>
                      {m.defaultSize.width}×{m.defaultSize.height}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Chip>

      <Chip label='尺寸' value={`${size.width}×${size.height}`} active>
        <p className='text-muted-foreground mb-2 text-xs'>{presetSourceLabel}</p>
        <div className='grid grid-cols-3 gap-1.5'>
          {presetSizes.map((s, i) => {
            const isActive = s.width === size.width && s.height === size.height;
            return (
              <button
                key={`${s.width}x${s.height}-${i}`}
                type='button'
                onClick={() => onChangeSize({ width: s.width, height: s.height })}
                className={cn(
                  'flex items-center justify-center rounded-md border px-2.5 py-2 text-xs transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <span className='font-mono'>
                  {s.width}×{s.height}
                </span>
              </button>
            );
          })}
        </div>
        <div className='mt-2 border-t pt-2'>
          <p className='text-muted-foreground mb-1.5 text-xs'>自定义尺寸 (mm)</p>
          <CustomSizeInput
            width={size.width}
            height={size.height}
            onApply={onChangeSize}
          />
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

function CustomSizeInput({
  width,
  height,
  onApply
}: {
  width: number;
  height: number;
  onApply: (size: { width: number; height: number }) => void;
}) {
  const [w, setW] = useState(String(width));
  const [h, setH] = useState(String(height));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setW(String(width));
    setH(String(height));
  }, [width, height]);

  const handleApply = () => {
    const wn = Number(w);
    const hn = Number(h);
    if (!Number.isFinite(wn) || !Number.isFinite(hn) || wn <= 0 || hn <= 0) {
      setError('请输入正数');
      return;
    }
    if (wn > 10000 || hn > 10000) {
      setError('最大 10000mm');
      return;
    }
    setError(null);
    onApply({ width: Math.round(wn), height: Math.round(hn) });
  };

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center gap-1.5'>
        <input
          type='number'
          min={1}
          max={10000}
          value={w}
          onChange={(e) => setW(e.target.value)}
          aria-label='自定义宽度 (mm)'
          className='border-input bg-background h-7 min-w-0 flex-1 rounded-md border px-2 text-xs'
        />
        <span className='text-muted-foreground shrink-0 text-xs'>×</span>
        <input
          type='number'
          min={1}
          max={10000}
          value={h}
          onChange={(e) => setH(e.target.value)}
          aria-label='自定义高度 (mm)'
          className='border-input bg-background h-7 min-w-0 flex-1 rounded-md border px-2 text-xs'
        />
        <button
          type='button'
          onClick={handleApply}
          className='bg-primary text-primary-foreground hover:bg-primary/90 h-7 shrink-0 rounded-md px-3 text-xs font-medium'
        >
          确定
        </button>
      </div>
      {error && <p className='text-destructive text-[11px]'>{error}</p>}
    </div>
  );
}
