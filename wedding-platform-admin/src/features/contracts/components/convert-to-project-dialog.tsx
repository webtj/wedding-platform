'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createProjectFromContractMutation } from '@/features/projects/api/queries';
import { toDateInput } from '@/lib/date-format';
import type { Contract } from '../api/types';

export function ConvertToProjectDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const router = useRouter();
  const [brideName, setBrideName] = useState(contract.brideName ?? contract.lead?.name ?? '');
  const [groomName, setGroomName] = useState(contract.groomName ?? '');
  const [weddingDate, setWeddingDate] = useState(toDateInput(contract.weddingDate));
  const [ceremonyType, setCeremonyType] = useState('');
  const [venue, setVenue] = useState(contract.venue ?? '');
  const [guestCount, setGuestCount] = useState('');
  const [colorTheme, setColorTheme] = useState('');
  const [style, setStyle] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  const create = useMutationToast({
    ...createProjectFromContractMutation,
    successMsg: '已转为项目',
    errorMsg: '转换失败'
  });

  function handleSave() {
    if (!brideName.trim() || !groomName.trim() || !weddingDate) return;
    create.mutate(
      {
        contractId: contract.id,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        weddingDate,
        ceremonyType: ceremonyType || undefined,
        venue: venue || undefined,
        guestCount: guestCount ? Number(guestCount) : undefined,
        colorTheme: colorTheme || undefined,
        style: style || undefined,
        specialRequirements: specialRequirements || undefined
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          router.push('/studio/projects');
        }
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>转为项目</DialogTitle>
          <DialogDescription>将已签署合同转为正式项目，信息从合同自动带入</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>新娘姓名 *</Label>
              <Input value={brideName} onChange={(e) => setBrideName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>新郎姓名 *</Label>
              <Input value={groomName} onChange={(e) => setGroomName(e.target.value)} />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>婚期 *</Label>
              <Input
                type='date'
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>场地</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>仪式类型</Label>
              <Input
                value={ceremonyType}
                onChange={(e) => setCeremonyType(e.target.value)}
                placeholder='中式/西式/户外/目的地'
              />
            </div>
            <div className='space-y-2'>
              <Label>色系</Label>
              <Input
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value)}
                placeholder='红金/粉白/蓝白'
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>风格</Label>
              <Input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder='新中式/法式浪漫/简约现代'
              />
            </div>
            <div className='space-y-2'>
              <Label>宾客数</Label>
              <Input
                type='number'
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>特殊要求</Label>
            <textarea
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              rows={2}
              className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
              placeholder='新人的特殊需求或注意事项...'
              aria-label='特殊要求'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !brideName.trim() ||
              !groomName.trim() ||
              !weddingDate ||
              create.isPending
            }
            isLoading={create.isPending}
          >
            确认转换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
