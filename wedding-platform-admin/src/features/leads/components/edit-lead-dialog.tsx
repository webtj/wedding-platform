'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { leadByIdOptions, updateLeadMutation } from '../api/queries';
import { SOURCE_OPTIONS, STATUS_OPTIONS } from '../constants';
import type { LeadMutationPayload } from '../api/types';

export function EditLeadDialog({
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

  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '已保存',
    errorMsg: '保存失败'
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sourceChannel, setSourceChannel] = useState('other');
  const [status, setStatus] = useState('new');
  const [weddingDate, setWeddingDate] = useState('');
  const [budgetYuan, setBudgetYuan] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && lead) {
      setName(lead.name ?? '');
      setPhone(lead.phone ?? '');
      setEmail(lead.email ?? '');
      setSourceChannel(lead.sourceChannel ?? 'other');
      setStatus(lead.status ?? 'new');
      setWeddingDate(lead.weddingDate ? lead.weddingDate.slice(0, 10) : '');
      setBudgetYuan(lead.budgetCents ? lead.budgetCents / 100 : 0);
      setNote(lead.note ?? '');
    }
  }, [lead?.id, open]);

  function handleSave() {
    if (!lead || !name.trim()) return;
    const payload: LeadMutationPayload = {
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      sourceChannel,
      status,
      weddingDate: weddingDate || undefined,
      budgetCents: budgetYuan ? Math.round(budgetYuan * 100) : undefined,
      note: note || undefined
    };
    update.mutate(
      { id: lead.id, data: payload },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>编辑意向单</DialogTitle>
          <DialogDescription>{lead?.leadNo ?? ''}</DialogDescription>
        </DialogHeader>
        {isLoading || !lead ? (
          <div className='flex items-center justify-center py-12 text-muted-foreground'>
            <Icons.spinner className='h-5 w-5 animate-spin' />
          </div>
        ) : (
          <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto'>
            <div className='space-y-1.5'>
              <Label>客户名称 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>电话</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label>邮箱</Label>
                <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>来源</Label>
                <Select value={sourceChannel} onValueChange={setSourceChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>状态</Label>
                <Select value={status} onValueChange={setStatus}>
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
                <Label>婚期</Label>
                <Input
                  type='date'
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label>预算（元）</Label>
                <Input
                  type='number'
                  value={budgetYuan || ''}
                  onChange={(e) => setBudgetYuan(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label>备注</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
                placeholder='客户需求备注...'
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!lead || !name.trim() || update.isPending}
            isLoading={update.isPending}
          >
            保存修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
