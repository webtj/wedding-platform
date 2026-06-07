'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toDateInput } from '@/lib/date-format';
import { toast } from 'sonner';
import { leadKeys } from '../api/queries';
import type { Lead } from '../api/types';

export function CreateContractDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const randomPart = Array.from(
    { length: 8 },
    () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [contractNo, setContractNo] = useState(`HT-${randomPart}-${datePart}`);
  const [title, setTitle] = useState(`${lead.name} 婚礼合同`);
  const [brideName, setBrideName] = useState(lead.name ?? '');
  const [groomName, setGroomName] = useState('');
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [_weddingDate, _setWeddingDate] = useState(toDateInput(lead.weddingDate));
  const [venue, setVenue] = useState('');
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [serviceContent, setServiceContent] = useState('');
  const [companyName, setCompanyName] = useState(organization?.name ?? '');
  const [companyAddress, setCompanyAddress] = useState(
    (organization as unknown as Record<string, string>)?.address ?? ''
  );

  async function handleSave() {
    if (!contractNo.trim() || !title.trim() || !amount) return;
    const { createContractFromLead } = await import('@/features/contracts/api/service');
    try {
      await createContractFromLead(lead.id, {
        contractNo: contractNo.trim(),
        title: title.trim(),
        brideName: brideName || undefined,
        groomName: groomName || undefined,
        phone: phone || undefined,
        weddingDate: _weddingDate || undefined,
        venue: venue || undefined,
        amountCents: Math.round(Number(amount) * 100),
        depositCents: deposit ? Math.round(Number(deposit) * 100) : undefined,
        serviceContent: serviceContent || undefined,
        companyName: companyName || undefined,
        companyAddress: companyAddress || undefined
      });
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      toast.success('合同创建成功');
      onOpenChange(false);
    } catch (error) {
      toast.error('创建合同失败，请重试');
      console.error('Contract creation failed:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>新建合同 — {lead.name}</DialogTitle>
          <DialogDescription>从意向单创建合同，客户信息自动带入</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>合同编号</Label>
              <Input value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>合同名称</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>新娘</Label>
              <Input value={brideName} onChange={(e) => setBrideName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>新郎</Label>
              <Input value={groomName} onChange={(e) => setGroomName(e.target.value)} />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>电话</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>婚期</Label>
              <Input
                type='date'
                value={_weddingDate}
                onChange={(e) => _setWeddingDate(e.target.value)}
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>合同总额（元）</Label>
              <Input type='number' value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>定金（元）</Label>
              <Input type='number' value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>场地</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>服务内容</Label>
            <textarea
              value={serviceContent}
              onChange={(e) => setServiceContent(e.target.value)}
              rows={4}
              className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
              placeholder='填写服务内容和条款...'
              aria-label='服务内容'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>公司名称</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder='婚庆公司名称'
              />
            </div>
            <div className='space-y-2'>
              <Label>公司地址</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!contractNo.trim() || !title.trim() || !amount}>
            创建合同
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
