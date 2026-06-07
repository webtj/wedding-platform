'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { MODE_TABS, type WorkbenchMode } from '../constants';
import { Composer } from './composer';
import type { AiReferenceAsset, AiTemplate, MaterialType } from '../api/types';

interface EmptyWorkbenchProps {
  mode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isGenerating: boolean;
  activePlaceholder: string;
  materialTypes: MaterialType[];
  promptTemplates?: AiTemplate[];
  selectedTypeId: string | null;
  size: { width: number; height: number };
  style: string;
  count: number;
  onSelectType: (material: MaterialType) => void;
  onChangeSize: (size: { width: number; height: number }) => void;
  onChangeStyle: (style: string) => void;
  onChangeCount: (count: number) => void;
  onReferenceUploaded?: (asset: AiReferenceAsset) => void;
  referenceAssets?: AiReferenceAsset[];
  onRemoveReference?: (id: string) => void;
}

export function EmptyWorkbench({
  mode,
  onModeChange,
  input,
  onInputChange,
  onSend,
  onCancel,
  isGenerating,
  activePlaceholder,
  materialTypes,
  promptTemplates,
  selectedTypeId,
  size,
  style,
  count,
  onSelectType,
  onChangeSize,
  onChangeStyle,
  onChangeCount,
  onReferenceUploaded,
  referenceAssets,
  onRemoveReference
}: EmptyWorkbenchProps) {
  return (
    <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-hidden px-6 py-10'>
      <div className='text-center'>
        <h1 className='mb-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
          我已准备好，你随时问我
        </h1>
        <p className='text-muted-foreground text-sm'>
          输入画面、物料和风格，我会给你多张婚礼视觉候选图
        </p>
      </div>

      <div className='flex flex-wrap justify-center gap-1.5'>
        {MODE_TABS.map((item) => {
          const Icon = Icons[item.icon];
          return (
            <button
              key={item.mode}
              type='button'
              onClick={() => onModeChange(item.mode)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors',
                item.mode === mode
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className='size-3.5' />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className='w-full max-w-2xl'>
        <Composer
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          onCancel={onCancel}
          isGenerating={isGenerating}
          disabled={isGenerating}
          placeholder={activePlaceholder}
          materialTypes={materialTypes}
          promptTemplates={promptTemplates}
          selectedTypeId={selectedTypeId}
          size={size}
          style={style}
          count={count}
          onSelectType={onSelectType}
          onChangeSize={onChangeSize}
          onChangeStyle={onChangeStyle}
          onChangeCount={onChangeCount}
          onReferenceUploaded={onReferenceUploaded}
          referenceAssets={referenceAssets}
          onRemoveReference={onRemoveReference}
        />
      </div>
    </div>
  );
}
