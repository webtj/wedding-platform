'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  size: { width: number; height: number } | null;
  style: string | null;
  count: number | null;
  onSelectType: (m: MaterialType | null) => void;
  onChangeSize: (size: { width: number; height: number } | null) => void;
  onChangeStyle: (style: string | null) => void;
  onChangeCount: (count: number | null) => void;
}

// ── Default values ──────────────────────────────────────────────────────────

const FALLBACK_SIZES: { width: number; height: number }[] = [
  { width: 1024, height: 1024 },
  { width: 1080, height: 1920 },
  { width: 800, height: 1200 },
  { width: 148, height: 210 },
  { width: 210, height: 297 }
];

const DEFAULT_SIZE: { width: number; height: number } = { width: 600, height: 900 };
const DEFAULT_STYLE = STYLES[0]?.id ?? 'realistic';
const DEFAULT_COUNT = 1;

// ── Summary Chip ────────────────────────────────────────────────────────────

function SummaryChip({
  label,
  value,
  isEmpty,
  isRequired = false,
  onClear,
  children
}: {
  label: string;
  value: string;
  isEmpty: boolean;
  isRequired?: boolean;
  onClear?: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'inline-flex h-7 items-center overflow-hidden rounded-full border text-xs transition-colors',
          isEmpty
            ? isRequired
              ? 'border-destructive/60 bg-destructive/5 text-destructive hover:border-destructive'
              : 'border-dashed border-muted-foreground/40 bg-muted/20 text-muted-foreground hover:border-muted-foreground/70 hover:text-foreground'
            : 'border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary'
        )}
      >
        <PopoverTrigger asChild>
          <button
            type='button'
            className='inline-flex h-full items-center gap-1.5 pl-2.5 pr-1.5'
          >
            <span className='font-medium text-muted-foreground/70'>{label}</span>
            <span
              className={cn(
                'font-medium',
                isEmpty ? 'text-muted-foreground/80 italic' : 'text-foreground'
              )}
            >
              {value}
            </span>
            <Icons.chevronDown className='text-muted-foreground/50 size-3' />
          </button>
        </PopoverTrigger>
        {!isEmpty && onClear && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label={`清除 ${label}`}
            className='hover:text-destructive text-muted-foreground/60 hover:bg-destructive/10 flex h-full w-6 items-center justify-center border-l border-border/60 transition-colors'
          >
            <Icons.close className='size-3' />
          </button>
        )}
      </div>
      <PopoverContent align='start' side='top' className='w-80 p-3'>
        {children(close)}
      </PopoverContent>
    </Popover>
  );
}

// ── Picker Header (title + inline clear/reset) ──────────────────────────────

function PickerHeader({
  title,
  isEmpty,
  showReset,
  onClear,
  onReset
}: {
  title: string;
  isEmpty: boolean;
  showReset?: boolean;
  onClear?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className='mb-2 flex items-center justify-between gap-2'>
      <p className='text-muted-foreground text-xs'>{title}</p>
      <div className='flex items-center gap-2'>
        {!isEmpty && onClear && (
          <button
            type='button'
            onClick={onClear}
            className='text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 text-xs transition-colors'
            title='清除选择'
          >
            <Icons.close className='size-3' />
            清除
          </button>
        )}
        {showReset && onReset && (
          <button
            type='button'
            onClick={onReset}
            className='text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 text-xs transition-colors'
            title='重置为默认'
          >
            <Icons.refresh className='size-3' />
            重置默认
          </button>
        )}
      </div>
    </div>
  );
}

// ── Material Picker Content ─────────────────────────────────────────────────

function MaterialPicker({
  materialTypes,
  selectedTypeId,
  onSelect,
  onClear,
  close
}: {
  materialTypes: MaterialType[];
  selectedTypeId: string | null;
  onSelect: (m: MaterialType) => void;
  onClear: () => void;
  close: () => void;
}) {
  const isEmpty = selectedTypeId === null;
  return (
    <div>
      <PickerHeader title='选择素材类型' isEmpty={isEmpty} onClear={onClear} />
      <div className='max-h-56 overflow-y-auto'>
        <div className='grid grid-cols-4 gap-1.5'>
          {materialTypes.map((m) => {
            const IconComp = getMaterialTypeIcon(m.icon);
            return (
              <button
                key={m.id}
                type='button'
                onClick={() => {
                  onSelect(m);
                  close();
                }}
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
  onChange,
  onClear,
  onReset,
  close
}: {
  size: { width: number; height: number } | null;
  selectedType?: MaterialType | null;
  onChange: (size: { width: number; height: number } | null) => void;
  onClear: () => void;
  onReset: () => void;
  close: () => void;
}) {
  const isEmpty = size === null;
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
      <PickerHeader
        title={presetLabel}
        isEmpty={isEmpty}
        onClear={onClear}
        showReset
        onReset={onReset}
      />
      <div className='grid grid-cols-3 gap-1.5'>
        {presetSizes.map((s, i) => {
          const isActive = size !== null && s.width === size.width && s.height === size.height;
          return (
            <button
              key={`${s.width}x${s.height}-${i}`}
              type='button'
              onClick={() => {
                onChange({ width: s.width, height: s.height });
                close();
              }}
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
          width={size?.width ?? DEFAULT_SIZE.width}
          height={size?.height ?? DEFAULT_SIZE.height}
          onApply={(newSize) => {
            onChange(newSize);
            close();
          }}
        />
      </div>
    </div>
  );
}

// ── Style Picker Content ────────────────────────────────────────────────────

function StylePicker({
  currentStyle,
  onChange,
  onClear,
  onReset,
  close
}: {
  currentStyle: string | null;
  onChange: (style: string | null) => void;
  onClear: () => void;
  onReset: () => void;
  close: () => void;
}) {
  const isEmpty = currentStyle === null;
  return (
    <div>
      <PickerHeader
        title='选择视觉风格'
        isEmpty={isEmpty}
        onClear={onClear}
        showReset
        onReset={onReset}
      />
      <div className='grid grid-cols-4 gap-2'>
        {STYLES.map((s) => {
          const preview = STYLE_PREVIEWS[s.id];
          return (
            <button
              key={s.id}
              type='button'
              onClick={() => {
                onChange(s.id);
                close();
              }}
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
  onChange,
  onClear,
  close
}: {
  currentCount: number | null;
  onChange: (count: number | null) => void;
  onClear: () => void;
  close: () => void;
}) {
  const isEmpty = currentCount === null;
  return (
    <div>
      <PickerHeader title='生成数量' isEmpty={isEmpty} onClear={onClear} />
      <div className='grid grid-cols-4 gap-1.5'>
        {COUNT_OPTIONS.map((n) => (
          <button
            key={n}
            type='button'
            onClick={() => {
              onChange(n);
              close();
            }}
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
  const selectedType = useMemo(
    () => materialTypes.find((m) => m.id === selectedTypeId),
    [materialTypes, selectedTypeId]
  );
  const styleOpt = useMemo(
    () => (style ? STYLES.find((s) => s.id === style) : undefined),
    [style]
  );

  const defaultType = materialTypes[0] ?? null;
  const defaultSize =
    selectedType?.defaultSize ?? defaultType?.defaultSize ?? DEFAULT_SIZE;
  const defaultStyle = DEFAULT_STYLE;

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <SummaryChip
        label='素材'
        value={selectedType?.name ?? '未选择'}
        isEmpty={selectedTypeId === null}
        onClear={selectedTypeId === null ? undefined : () => onSelectType(null)}
      >
        {(close) => (
          <MaterialPicker
            materialTypes={materialTypes}
            selectedTypeId={selectedTypeId}
            onSelect={onSelectType}
            onClear={() => onSelectType(null)}
            close={close}
          />
        )}
      </SummaryChip>

      <SummaryChip
        label='尺寸'
        value={size === null ? '未选择' : `${size.width}×${size.height}`}
        isEmpty={size === null}
        onClear={size === null ? undefined : () => onChangeSize(null)}
      >
        {(close) => (
          <SizePicker
            size={size}
            selectedType={selectedType}
            onChange={onChangeSize}
            onClear={() => onChangeSize(null)}
            onReset={() => onChangeSize(defaultSize)}
            close={close}
          />
        )}
      </SummaryChip>

      <SummaryChip
        label='风格'
        value={styleOpt?.label ?? (style ?? '未选择')}
        isEmpty={style === null}
        onClear={style === null ? undefined : () => onChangeStyle(null)}
      >
        {(close) => (
          <StylePicker
            currentStyle={style}
            onChange={onChangeStyle}
            onClear={() => onChangeStyle(null)}
            onReset={() => onChangeStyle(defaultStyle)}
            close={close}
          />
        )}
      </SummaryChip>

      <SummaryChip
        label='数量'
        value={count === null ? '未选择' : `${count} 张`}
        isEmpty={count === null}
        onClear={count === null ? undefined : () => onChangeCount(null)}
      >
        {(close) => (
          <CountPicker
            currentCount={count}
            onChange={onChangeCount}
            onClear={() => onChangeCount(null)}
            close={close}
          />
        )}
      </SummaryChip>
    </div>
  );
}
