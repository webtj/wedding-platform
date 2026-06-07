'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { updateContractMutation } from '../api/queries';
import { toDateInput } from '@/lib/date-format';
import type { Contract } from '../api/types';

export function EditContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const update = useMutationToast({
    ...updateContractMutation,
    successMsg: '已更新',
    errorMsg: '更新失败'
  });
  const [title, setTitle] = useState(contract.title);
  const [brideName, setBrideName] = useState(contract.brideName ?? '');
  const [groomName, setGroomName] = useState(contract.groomName ?? '');
  const [phone, setPhone] = useState(contract.phone ?? '');
  const [weddingDate, setWeddingDate] = useState(toDateInput(contract.weddingDate));
  const [venue, setVenue] = useState(contract.venue ?? '');
  const [amount, setAmount] = useState(String((contract.amountCents ?? 0) / 100));
  const [deposit, setDeposit] = useState(
    contract.depositCents ? String(contract.depositCents / 100) : ''
  );
  const [serviceContent, setServiceContent] = useState(contract.serviceContent ?? '');
  const [companyName, setCompanyName] = useState(contract.companyName ?? '');
  const [companyAddress, setCompanyAddress] = useState(contract.companyAddress ?? '');
  const [note, setNote] = useState(contract.note ?? '');

  function handleSave() {
    update.mutate(
      {
        id: contract.id,
        data: {
          title: title.trim(),
          amountCents: Math.round(Number(amount) * 100),
          brideName: brideName || undefined,
          groomName: groomName || undefined,
          phone: phone || undefined,
          venue: venue || undefined,
          serviceContent: serviceContent || undefined,
          companyName: companyName || undefined,
          companyAddress: companyAddress || undefined,
          note: note || undefined
        }
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>编辑合同</DialogTitle>
          <DialogDescription>修改合同全部字段</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>合同编号</Label>
              <div className='h-9 px-3 py-2 text-sm border rounded-md bg-muted/50 font-mono'>
                {contract.contractNo}
              </div>
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
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
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
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>公司地址</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>备注</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !title.trim()}>
            {update.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
