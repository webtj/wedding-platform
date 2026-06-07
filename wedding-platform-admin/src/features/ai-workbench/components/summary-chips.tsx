'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getMaterialTypeIcon } from '@/features/material-types/lib/icon-map';
import { STYLES, COUNT_OPTIONS, STYLE_PREVIEWS } from '../constants';
import type { MaterialType } from '../api/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface SummaryChipsProps {
  materialTypes: MaterialType[];
  selectedTypeId: string | null;
  size: { width: number; height: number };
  style: string;
  count: number;
  onSelectType: (m: MaterialType) => void;
  onChangeSize: (size: { width: number; height: number }) => void;
  onChangeStyle: (style: string) => void;
  onChangeCount: (count: number) => void;
}

// ── Default values ──────────────────────────────────────────────────────────

const FALLBACK_SIZES: { width: number; height: number }[] = [
  { width: 1024, height: 1024 },
  { width: 1080, height: 1920 },
  { width: 800, height: 1200 },
  { width: 148, height: 210 },
  { width: 210, height: 297 }
];

// ── Summary Chip ────────────────────────────────────────────────────────────

function SummaryChip({
  label,
  value,
  showReset,
  onReset,
  children
}: {
  label: string;
  value: string;
  showReset?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className='group inline-flex items-center'>
        <PopoverTrigger asChild>
          <button
            type='button'
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
              'border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary'
            )}
          >
            <span className='font-medium text-muted-foreground/70'>{label}</span>
            <span className='font-medium text-foreground'>{value}</span>
            <Icons.chevronDown className='size-3 text-muted-foreground/50' />
          </button>
        </PopoverTrigger>
        {showReset && onReset && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className='ml-0.5 flex size-5 items-center justify-center rounded-full text-muted-foreground/0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:text-muted-foreground/50'
            title='重置'
          >
            <Icons.close className='size-3' />
          </button>
        )}
      </div>
      <PopoverContent align='start' side='top' className='w-80 p-3'>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// ── Material Picker Content ─────────────────────────────────────────────────

function MaterialPicker({
  materialTypes,
  selectedTypeId,
  onSelect
}: {
  materialTypes: MaterialType[];
  selectedTypeId: string | null;
  onSelect: (m: MaterialType) => void;
}) {
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs'>选择素材类型</p>
      <div className='max-h-56 overflow-y-auto'>
        <div className='grid grid-cols-4 gap-1.5'>
          {materialTypes.map((m) => {
            const IconComp = getMaterialTypeIcon(m.icon);
            return (
              <button
                key={m.id}
                type='button'
                onClick={() => onSelect(m)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition-colors',
                  m.id === selectedTypeId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <IconComp className='size-5 shrink-0' />
                <span className='line-clamp-1 w-full text-xs font-medium'>{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Size Picker Content ─────────────────────────────────────────────────────

function SizePicker({
  size,
  selectedType,
  onChange
}: {
  size: { width: number; height: number };
  selectedType?: MaterialType | null;
  onChange: (size: { width: number; height: number }) => void;
}) {
  const presetSizes =
    selectedType?.sizes && selectedType.sizes.length > 0
      ? selectedType.sizes
      : selectedType?.defaultSize
        ? [selectedType.defaultSize]
        : FALLBACK_SIZES;

  const presetLabel =
    selectedType?.sizes && selectedType.sizes.length > 0
      ? `${selectedType.name} 预设尺寸`
      : selectedType?.defaultSize
        ? `${selectedType.name} 默认尺寸`
        : '通用尺寸';

  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs'>{presetLabel}</p>
      <div className='grid grid-cols-3 gap-1.5'>
        {presetSizes.map((s, i) => {
          const isActive = s.width === size.width && s.height === size.height;
          return (
            <button
              key={`${s.width}x${s.height}-${i}`}
              type='button'
              onClick={() => onChange({ width: s.width, height: s.height })}
              className={cn(
                'flex items-center justify-center rounded-md border px-2.5 py-2 text-xs transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent'
              )}
            >
              <span className='font-mono'>{s.width}×{s.height}</span>
            </button>
          );
        })}
      </div>
      <div className='mt-2 border-t pt-2'>
        <p className='text-muted-foreground mb-1.5 text-xs'>自定义尺寸 (mm)</p>
        <CustomSizeInput width={size.width} height={size.height} onApply={onChange} />
      </div>
    </div>
  );
}

// ── Style Picker Content ────────────────────────────────────────────────────

function StylePicker({
  currentStyle,
  onChange
}: {
  currentStyle: string;
  onChange: (style: string) => void;
}) {
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs'>选择视觉风格</p>
      <div className='grid grid-cols-4 gap-2'>
        {STYLES.map((s) => {
          const preview = STYLE_PREVIEWS[s.id];
          return (
            <button
              key={s.id}
              type='button'
              onClick={() => onChange(s.id)}
              className={cn(
                'rounded-lg border p-1.5 text-left transition-colors',
                s.id === currentStyle
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
    </div>
  );
}

// ── Count Picker Content ────────────────────────────────────────────────────

function CountPicker({
  currentCount,
  onChange
}: {
  currentCount: number;
  onChange: (count: number) => void;
}) {
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs'>生成数量</p>
      <div className='grid grid-cols-4 gap-1.5'>
        {COUNT_OPTIONS.map((n) => (
          <button
            key={n}
            type='button'
            onClick={() => onChange(n)}
            className={cn(
              'rounded-lg border py-2 text-center text-xs font-medium transition-colors',
              n === currentCount
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            )}
          >
            {n}张
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Custom Size Input ───────────────────────────────────────────────────────

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

// ── Main Component ──────────────────────────────────────────────────────────

export function SummaryChips({
  materialTypes,
  selectedTypeId,
  size,
  style,
  count,
  onSelectType,
  onChangeSize,
  onChangeStyle,
  onChangeCount
}: SummaryChipsProps) {
  const selectedType = materialTypes.find((m) => m.id === selectedTypeId);
  const styleOpt = STYLES.find((s) => s.id === style);

  const defaultType = materialTypes[0] ?? null;
  const defaultSize = selectedType?.defaultSize ?? { width: 600, height: 900 };
  const defaultStyle = STYLES[0]?.id ?? 'realistic';

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <SummaryChip
        label='素材'
        value={selectedType?.name ?? '未选择'}
        showReset={!!selectedType && selectedType.id !== defaultType?.id}
        onReset={() => defaultType && onSelectType(defaultType)}
      >
        <MaterialPicker
          materialTypes={materialTypes}
          selectedTypeId={selectedTypeId}
          onSelect={onSelectType}
        />
      </SummaryChip>

      <SummaryChip
        label='尺寸'
        value={`${size.width}×${size.height}`}
        showReset={size.width !== defaultSize.width || size.height !== defaultSize.height}
        onReset={() => onChangeSize(defaultSize)}
      >
        <SizePicker size={size} selectedType={selectedType} onChange={onChangeSize} />
      </SummaryChip>

      <SummaryChip
        label='风格'
        value={styleOpt?.label ?? style}
        showReset={style !== defaultStyle}
        onReset={() => onChangeStyle(defaultStyle)}
      >
        <StylePicker currentStyle={style} onChange={onChangeStyle} />
      </SummaryChip>

      <SummaryChip
        label='数量'
        value={`${count} 张`}
      >
        <CountPicker currentCount={count} onChange={onChangeCount} />
      </SummaryChip>
    </div>
  );
}
