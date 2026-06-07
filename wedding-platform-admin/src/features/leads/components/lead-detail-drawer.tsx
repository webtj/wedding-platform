'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { addFollowupMutation, leadByIdOptions, updateLeadMutation } from '../api/queries';
import { STATUS_OPTIONS, S_COLOR } from '../constants';
import { toDateDisplay } from '@/lib/date-format';
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

function toFormState(lead: Lead | null | undefined): FormState {
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
  leadId,
  open,
  onOpenChange
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: lead, isLoading } = useQuery({
    ...leadByIdOptions(leadId ?? ''),
    enabled: !!leadId && open
  });

  const [form, setForm] = useState<FormState>(() => toFormState(lead));
  const [followupContent, setFollowupContent] = useState('');

  useEffect(() => {
    if (open) {
      setForm(toFormState(lead));
      setFollowupContent('');
    }
  }, [lead?.id, open]);

  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '已保存',
    errorMsg: '保存失败'
  });

  const addFollowup = useMutationToast({
    ...addFollowupMutation,
    successMsg: '跟进记录已添加',
    errorMsg: '添加失败'
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
    update.mutate({ id: lead.id, data: payload });
  }

  function handleAddFollowup() {
    if (!lead || !followupContent.trim()) return;
    addFollowup.mutate(
      { leadId: lead.id, content: followupContent.trim() },
      {
        onSuccess: () => setFollowupContent('')
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle className='flex items-center gap-2'>
            {isLoading ? '加载中...' : (lead?.name ?? '意向单')}
            {lead && (
              <Badge
                variant='outline'
                className={`${S_COLOR[lead.status] ?? 'border-slate-200 text-slate-500'} text-[11px] px-1.5 py-0`}
              >
                {STATUS_OPTIONS.find((s) => s.value === lead.status)?.label ?? lead.status}
              </Badge>
            )}
          </SheetTitle>
          {lead && (
            <SheetDescription>
              {lead.leadNo} · 创建于 {toDateDisplay(lead.createdAt)}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          {isLoading || !lead ? (
            <div className='flex items-center justify-center py-12 text-muted-foreground'>
              <Icons.spinner className='h-5 w-5 animate-spin' />
            </div>
          ) : (
            <>
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
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
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

              {/* ── Add followup ── */}
              <section className='space-y-2 border-t pt-4'>
                <h3 className='text-sm font-semibold text-muted-foreground'>添加跟进</h3>
                <textarea
                  aria-label='跟进内容'
                  value={followupContent}
                  onChange={(e) => setFollowupContent(e.target.value)}
                  rows={2}
                  className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
                  placeholder='记录这次沟通内容、约定、注意事项...'
                />
                <div className='flex justify-end'>
                  <Button
                    size='sm'
                    onClick={handleAddFollowup}
                    disabled={!followupContent.trim() || addFollowup.isPending}
                    isLoading={addFollowup.isPending}
                  >
                    <Icons.add className='mr-1 h-3.5 w-3.5' />
                    添加跟进记录
                  </Button>
                </div>
              </section>

              {/* ── Timeline ── */}
              <section className='space-y-3 border-t pt-4'>
                <h3 className='text-sm font-semibold text-muted-foreground'>
                  时间轴（{lead.followups?.length ?? 0} 条跟进）
                </h3>
                <ul className='space-y-3 text-sm'>
                  {lead.followups?.map((f) => (
                    <TimelineItem
                      key={f.id}
                      icon='chat'
                      title={f.content}
                      meta={`${f.createdBy?.displayName ?? '未知'} · ${toDateDisplay(f.createdAt)}`}
                    />
                  ))}
                  {lead.contract && (
                    <TimelineItem
                      icon='check'
                      title={`已建合同 ${lead.contract.contractNo}`}
                      meta={toDateDisplay(lead.updatedAt)}
                    />
                  )}
                  {lead.convertedProject && (
                    <TimelineItem
                      icon='check'
                      title='已转项目'
                      meta={toDateDisplay(lead.updatedAt)}
                    />
                  )}
                  <TimelineItem
                    icon='add'
                    title='创建意向单'
                    meta={`${lead.createdBy?.displayName ?? '未知'} · ${toDateDisplay(lead.createdAt)}`}
                  />
                </ul>
              </section>
            </>
          )}
        </div>

        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!lead || update.isPending}
            isLoading={update.isPending}
          >
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
  icon: 'add' | 'edit' | 'check' | 'chat';
  title: string;
  meta: string;
}) {
  const Icon =
    icon === 'add'
      ? Icons.add
      : icon === 'edit'
        ? Icons.edit
        : icon === 'check'
          ? Icons.check
          : Icons.chat;
  return (
    <li className='flex items-start gap-2.5'>
      <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
        <Icon className='h-3 w-3 text-muted-foreground' />
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-foreground whitespace-pre-wrap break-words'>{title}</p>
        <p className='text-xs text-muted-foreground'>{meta}</p>
      </div>
    </li>
  );
}
