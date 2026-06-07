'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toDateDisplay } from '@/lib/date-format';
import { S_COLOR, S_LABEL, fmtAmount } from '../constants';
import type { Contract } from '../api/types';

export function PreviewContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const hasSignatureImage =
    contract.signatureData?.startsWith('data:image/png') ||
    contract.signatureData?.startsWith('data:image/jpeg');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>合同预览</DialogTitle>
          <DialogDescription>{contract.contractNo}</DialogDescription>
        </DialogHeader>
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-muted-foreground'>合同编号：</span>
              {contract.contractNo}
            </div>
            <div>
              <span className='text-muted-foreground'>合同名称：</span>
              {contract.title}
            </div>
            <div>
              <span className='text-muted-foreground'>状态：</span>
              <Badge variant='outline' className={S_COLOR[contract.status] ?? ''}>
                {S_LABEL[contract.status] ?? contract.status}
              </Badge>
            </div>
            <div>
              <span className='text-muted-foreground'>签署时间：</span>
              {contract.signedAt ? toDateDisplay(contract.signedAt) : '-'}
            </div>
          </div>

          <div className='border-t pt-4'>
            <h4 className='font-semibold mb-2'>客户信息</h4>
            <div className='grid grid-cols-2 gap-2 text-sm'>
              <div>
                <span className='text-muted-foreground'>新娘：</span>
                {contract.brideName || '-'}
              </div>
              <div>
                <span className='text-muted-foreground'>新郎：</span>
                {contract.groomName || '-'}
              </div>
              <div>
                <span className='text-muted-foreground'>电话：</span>
                {contract.phone || '-'}
              </div>
              <div>
                <span className='text-muted-foreground'>婚期：</span>
                {contract.weddingDate ? toDateDisplay(contract.weddingDate) : '-'}
              </div>
              <div>
                <span className='text-muted-foreground'>场地：</span>
                {contract.venue || '-'}
              </div>
            </div>
          </div>

          <div className='border-t pt-4'>
            <h4 className='font-semibold mb-2'>费用</h4>
            <div className='grid grid-cols-2 gap-2 text-sm'>
              <div>
                <span className='text-muted-foreground'>合同总额：</span>
                {fmtAmount(contract.amountCents)}
              </div>
              <div>
                <span className='text-muted-foreground'>定金：</span>
                {fmtAmount(contract.depositCents)}
              </div>
            </div>
          </div>

          {contract.serviceContent && (
            <div className='border-t pt-4'>
              <h4 className='font-semibold mb-2'>服务内容</h4>
              <div className='text-sm whitespace-pre-wrap text-muted-foreground'>
                {contract.serviceContent}
              </div>
            </div>
          )}

          {(contract.companyName || contract.companyAddress) && (
            <div className='border-t pt-4'>
              <h4 className='font-semibold mb-2'>公司信息</h4>
              <div className='text-sm text-muted-foreground'>
                {contract.companyName && <p>{contract.companyName}</p>}
                {contract.companyAddress && <p>{contract.companyAddress}</p>}
              </div>
            </div>
          )}

          {hasSignatureImage && contract.signatureData && (
            <div className='border-t pt-4'>
              <h4 className='font-semibold mb-2'>客户签名</h4>
              <Image
                src={contract.signatureData}
                alt='客户签名'
                className='max-w-[300px] border-b border-gray-400 pb-2'
                width={300}
                height={100}
                unoptimized
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
