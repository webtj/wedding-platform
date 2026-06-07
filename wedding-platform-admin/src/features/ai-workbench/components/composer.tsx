'use client';

import { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SummaryChips } from './summary-chips';
import { QuickPrompts } from './quick-prompts';
import { uploadReferenceAsset } from '../api/queries';
import type { AiTemplate, MaterialType, AiReferenceAsset } from '../api/types';

type ReferenceMode = 'style' | 'subject' | 'pet';

const REFERENCE_MODE_OPTIONS: Array<{ value: ReferenceMode; label: string }> = [
  { value: 'style', label: '风格参考' },
  { value: 'subject', label: '主体参考' },
  { value: 'pet', label: '宠物图' }
];

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder: string;
  showChips?: boolean;
  materialTypes: MaterialType[];
  promptTemplates?: AiTemplate[];
  selectedTypeId: string | null;
  size: { width: number; height: number };
  style: string;
  count: number;
  onSelectType: (m: MaterialType) => void;
  onChangeSize: (size: { width: number; height: number }) => void;
  onChangeStyle: (style: string) => void;
  onChangeCount: (count: number) => void;
  onReferenceUploaded?: (asset: AiReferenceAsset) => void;
  referenceAssets?: AiReferenceAsset[];
  onRemoveReference?: (id: string) => void;
  projectId?: string;
  conversationId?: string;
}

export function Composer({
  value,
  onChange,
  onSend,
  onCancel,
  isGenerating,
  disabled,
  placeholder,
  showChips = true,
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
  referenceAssets = [],
  onRemoveReference,
  projectId,
  conversationId
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedType = materialTypes.find((m) => m.id === selectedTypeId);
  const [isUploading, setIsUploading] = useState(false);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('style');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) {
        onCancel();
      } else if (!disabled) {
        onSend();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', referenceMode);
      if (projectId) formData.append('projectId', projectId);
      if (conversationId) formData.append('conversationId', conversationId);

      const asset = await uploadReferenceAsset(formData);
      onReferenceUploaded?.(asset);
      toast.success('参考图上传成功');
    } catch {
      toast.error('上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      className={cn(
        'bg-card focus-within:border-primary focus-within:ring-primary/15 rounded-2xl border border-primary/50 shadow-sm shadow-primary/10 transition-all focus-within:ring-4'
      )}
    >
      {/* ── Summary chips (selected config) ── */}
      {showChips && (
        <div className='border-b border-border/50 px-3 pt-2.5 pb-2'>
          <SummaryChips
            materialTypes={materialTypes}
            selectedTypeId={selectedTypeId}
            size={size}
            style={style}
            count={count}
            onSelectType={onSelectType}
            onChangeSize={onChangeSize}
            onChangeStyle={onChangeStyle}
            onChangeCount={onChangeCount}
          />
        </div>
      )}

      {/* ── Reference assets display ── */}
      {referenceAssets.length > 0 && (
        <div className='flex flex-wrap items-center gap-1.5 px-3 pt-2'>
          {referenceAssets.map((asset) => {
            const modeLabel =
              REFERENCE_MODE_OPTIONS.find((o) => o.value === asset.role)?.label ?? '参考图';
            return (
              <span
                key={asset.id}
                className='inline-flex h-6 items-center gap-1 rounded-md bg-blue-100 px-2 text-xs font-medium text-blue-700'
              >
                <Icons.paperclip className='size-3' />
                {modeLabel}
                <button
                  type='button'
                  onClick={() => onRemoveReference?.(asset.id)}
                  className='ml-1 hover:text-blue-900'
                >
                  <Icons.close className='size-3' />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Text input ── */}
      <div className='px-3 pt-2 pb-1'>
        <Textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className='max-h-40 min-h-10 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0'
        />
      </div>

      {/* ── Bottom toolbar ── */}
      <div className='flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2'>
        <div className='flex items-center gap-1'>
          {/* Reference upload */}
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleFileUpload}
            aria-label='上传参考图'
          />
          <div className='flex items-center gap-1'>
            <select
              value={referenceMode}
              onChange={(e) => setReferenceMode(e.target.value as ReferenceMode)}
              className='h-7 rounded-md border border-input bg-transparent px-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
              title='参考图模式'
            >
              {REFERENCE_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='text-muted-foreground hover:text-primary size-7'
              title='上传参考图'
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Icons.spinner className='size-3.5 animate-spin' />
              ) : (
                <Icons.paperclip className='size-3.5' />
              )}
            </Button>
          </div>

          {/* Quick prompts */}
          <QuickPrompts
            promptTemplates={promptTemplates}
            onSelect={onChange}
          />
        </div>

        {/* Send / Stop */}
        <div className='flex shrink-0 items-center gap-1'>
          {isGenerating ? (
            <Button
              type='button'
              size='icon'
              variant='destructive'
              className='size-8 rounded-full'
              onClick={onCancel}
              title='停止生成'
            >
              <Icons.stop className='size-4' />
            </Button>
          ) : (
            <Button
              type='button'
              size='icon'
              className='size-8 rounded-full'
              disabled={disabled || !value.trim()}
              onClick={onSend}
              title='生成'
            >
              <Icons.arrowRight className='size-4 -rotate-90' />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
