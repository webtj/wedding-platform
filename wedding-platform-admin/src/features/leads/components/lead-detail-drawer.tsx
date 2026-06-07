'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { updateLeadMutation, leadKeys } from '../api/queries';
import { STATUS_OPTIONS, S_COLOR } from '../constants';
import { toDateDisplay } from '@/lib/date-format';
import { getQueryClient } from '@/lib/query-client';
import type { Lead, LeadMutationPayload } from '../api/types';

type FormState = {
  name: string;
  phone: string;
  email: string;
  sourceChannel: string;
  status: string;
  weddingDate: string;
  budgetYuan: number;
  note: string;
};

function toFormState(lead: Lead | null): FormState {
  if (!lead)
    return {
      name: '',
      phone: '',
      email: '',
      sourceChannel: 'other',
      status: 'new',
      weddingDate: '',
      budgetYuan: 0,
      note: ''
    };
  return {
    name: lead.name ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    sourceChannel: lead.sourceChannel ?? 'other',
    status: lead.status ?? 'new',
    weddingDate: lead.weddingDate ? lead.weddingDate.slice(0, 10) : '',
    budgetYuan: lead.budgetCents ? lead.budgetCents / 100 : 0,
    note: lead.note ?? ''
  };
}

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(lead));

  useEffect(() => {
    if (open) setForm(toFormState(lead));
  }, [lead?.id, open]);

  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '已保存',
    errorMsg: '保存失败'
  });

  function handleSave() {
    if (!lead) return;
    const payload: LeadMutationPayload = {
      name: form.name || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      sourceChannel: form.sourceChannel,
      status: form.status,
      weddingDate: form.weddingDate || undefined,
      budgetCents: form.budgetYuan ? Math.round(form.budgetYuan * 100) : undefined,
      note: form.note || undefined
    };
    update.mutate(
      { id: lead.id, data: payload },
      {
        onSuccess: () => {
          getQueryClient().invalidateQueries({ queryKey: leadKeys.detail(lead.id) });
          onOpenChange(false);
        }
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle className='flex items-center gap-2'>
            {lead?.name ?? '意向单'}
            {lead && (
              <Badge
                variant='outline'
                className={`${S_COLOR[lead.status] ?? 'border-slate-200 text-slate-500'} text-[11px] px-1.5 py-0`}
              >
                {STATUS_OPTIONS.find((s) => s.value === lead.status)?.label ?? lead.status}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {lead?.leadNo} · 创建于 {toDateDisplay(lead?.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          {/* ── Basic info ── */}
          <section className='space-y-3'>
            <h3 className='text-sm font-semibold text-muted-foreground'>基本信息</h3>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='d-name'>客户名称</Label>
                <Input
                  id='d-name'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='d-phone'>电话</Label>
                <Input
                  id='d-phone'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='d-email'>邮箱</Label>
              <Input
                id='d-email'
                type='email'
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>来源</Label>
                <Select
                  value={form.sourceChannel}
                  onValueChange={(v) => setForm({ ...form, sourceChannel: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='wechat'>微信</SelectItem>
                    <SelectItem value='xiaohongshu'>小红书</SelectItem>
                    <SelectItem value='douyin'>抖音</SelectItem>
                    <SelectItem value='referral'>转介绍</SelectItem>
                    <SelectItem value='other'>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>状态</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='d-date'>婚期</Label>
                <Input
                  id='d-date'
                  type='date'
                  value={form.weddingDate}
                  onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='d-budget'>预算（元）</Label>
                <Input
                  id='d-budget'
                  type='number'
                  value={form.budgetYuan || ''}
                  onChange={(e) =>
                    setForm({ ...form, budgetYuan: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='d-note'>备注</Label>
              <textarea
                id='d-note'
                aria-label='备注'
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
                placeholder='客户需求备注...'
              />
            </div>
          </section>

          {/* ── Timeline ── */}
          <section className='space-y-3'>
            <h3 className='text-sm font-semibold text-muted-foreground'>时间轴</h3>
            <ul className='space-y-3 text-sm'>
              <TimelineItem
                icon='add'
                title='创建意向单'
                meta={`${lead?.createdBy?.displayName ?? '未知'} · ${toDateDisplay(lead?.createdAt)}`}
              />
              {lead?.updatedAt && lead.updatedAt !== lead.createdAt && (
                <TimelineItem
                  icon='edit'
                  title='最近更新'
                  meta={toDateDisplay(lead.updatedAt)}
                />
              )}
              {lead?.contract && (
                <TimelineItem
                  icon='check'
                  title={`已建合同 ${lead.contract.contractNo}`}
                  meta={toDateDisplay(lead.updatedAt)}
                />
              )}
              {lead?.convertedProject && (
                <TimelineItem
                  icon='check'
                  title='已转项目'
                  meta={toDateDisplay(lead.updatedAt)}
                />
              )}
            </ul>
            <p className='text-xs text-muted-foreground/70 italic'>
              跟进记录时间轴将在下个版本上线
            </p>
          </section>
        </div>

        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!lead || update.isPending} isLoading={update.isPending}>
            保存修改
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TimelineItem({
  icon,
  title,
  meta
}: {
  icon: 'add' | 'edit' | 'check';
  title: string;
  meta: string;
}) {
  const Icon =
    icon === 'add' ? Icons.add : icon === 'edit' ? Icons.edit : Icons.check;
  return (
    <li className='flex items-start gap-2.5'>
      <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
        <Icon className='h-3 w-3 text-muted-foreground' />
      </span>
      <div className='flex-1'>
        <p className='text-foreground'>{title}</p>
        <p className='text-xs text-muted-foreground'>{meta}</p>
      </div>
    </li>
  );
}
