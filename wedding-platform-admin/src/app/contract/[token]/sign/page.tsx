'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SignaturePad } from '@/components/signature-pad';
import { Badge } from '@/components/ui/badge';
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
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';

type ContractData = {
  id: string;
  contractNo: string;
  title: string;
  brideName?: string | null;
  groomName?: string | null;
  phone?: string | null;
  weddingDate?: string | null;
  venue?: string | null;
  amountCents: number;
  depositCents?: number | null;
  serviceContent?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  status: string;
  signatureData?: string | null;
  signedAt?: string | null;
};

const fmt = (c: number) => `¥${(c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

export default function SignContractPage() {
  const params = useParams();
  const token = params.token as string;
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/contracts/sign/${token}`);
        if (!res.ok) throw new Error('合同不存在或已失效');
        setContract(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSign() {
    if (!signature) return;
    const res = await fetch(`/api/contracts/sign/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ signatureData: signature })
    });
    if (res.ok) {
      setContract((await res.json()) as ContractData);
    }
  }

  async function handleReject() {
    const res = await fetch(`/api/contracts/sign/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rejectReason })
    });
    if (res.ok) {
      setContract((await res.json()) as ContractData);
      setRejectOpen(false);
    }
  }

  if (loading)
    return (
      <div className='flex min-h-dvh items-center justify-center text-muted-foreground'>
        加载中...
      </div>
    );
  if (error)
    return (
      <div className='flex min-h-dvh items-center justify-center text-destructive'>{error}</div>
    );
  if (!contract) return null;

  const isSigned = contract.status === 'signed';
  const isRejected = contract.status === 'voided';

  return (
    <main className='min-h-dvh bg-background py-8'>
      <div className='mx-auto max-w-2xl px-4 space-y-6'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold font-serif'>
            {contract.companyName ?? '婚礼策划公司'}
          </h1>
          <p className='text-muted-foreground mt-1'>婚礼策划服务合同</p>
          <Badge variant='outline' className='mt-2'>
            {contract.contractNo}
          </Badge>
        </div>

        {isSigned && (
          <div className='rounded-xl border bg-emerald-50 p-6 text-center'>
            <Icons.check className='mx-auto h-10 w-10 text-emerald-600' />
            <h2 className='mt-2 text-lg font-bold text-emerald-700'>合同已签署</h2>
            <p className='text-emerald-600 text-sm mt-1'>
              签署时间：{contract.signedAt ? toDateDisplay(contract.signedAt) : '-'}
            </p>
            {contract.signatureData && (
              <img
                src={contract.signatureData}
                alt='签名'
                className='mx-auto mt-3 max-w-[300px] border-b border-gray-400 pb-2'
              />
            )}
          </div>
        )}

        {isRejected && (
          <div className='rounded-xl border bg-red-50 p-6 text-center'>
            <Icons.close className='mx-auto h-10 w-10 text-red-600' />
            <h2 className='mt-2 text-lg font-bold text-red-700'>合同已拒签</h2>
          </div>
        )}

        <div className='rounded-xl border bg-card p-6 space-y-4'>
          <Section title='客户信息'>
            <KV label='新娘' value={contract.brideName} />
            <KV label='新郎' value={contract.groomName} />
            <KV label='电话' value={contract.phone} />
            <KV
              label='婚期'
              value={contract.weddingDate ? toDateDisplay(contract.weddingDate) : undefined}
            />
            <KV label='场地' value={contract.venue} />
          </Section>

          <Section title='费用'>
            <KV label='合同总额' value={fmt(contract.amountCents)} />
            <KV
              label='定金'
              value={contract.depositCents ? fmt(contract.depositCents) : undefined}
            />
          </Section>

          {contract.serviceContent && (
            <Section title='服务内容'>
              <div className='text-sm whitespace-pre-wrap text-muted-foreground'>
                {contract.serviceContent}
              </div>
            </Section>
          )}

          {contract.companyAddress && (
            <Section title='公司信息'>
              <p className='text-sm text-muted-foreground'>{contract.companyName}</p>
              <p className='text-sm text-muted-foreground'>{contract.companyAddress}</p>
            </Section>
          )}
        </div>

        {!isSigned && !isRejected && (
          <div className='rounded-xl border bg-card p-6 space-y-4'>
            <h3 className='font-bold'>客户签名</h3>
            <p className='text-sm text-muted-foreground'>请在下方签名区域签名</p>
            <SignaturePad onSave={setSignature} />
            {signature && (
              <div className='flex gap-2 pt-2'>
                <Button variant='outline' onClick={() => setRejectOpen(true)}>
                  <Icons.close className='mr-1 h-4 w-4' /> 拒绝
                </Button>
                <Button onClick={handleSign}>
                  <Icons.check className='mr-1 h-4 w-4' /> 签署合同
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝合同</DialogTitle>
            <DialogDescription>请说明拒绝原因（可选）</DialogDescription>
          </DialogHeader>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='拒绝原因...'
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setRejectOpen(false)}>
              取消
            </Button>
            <Button variant='destructive' onClick={handleReject}>
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className='text-sm font-semibold text-muted-foreground mb-2'>{title}</h4>
      <div className='space-y-1'>{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className='flex justify-between text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value}</span>
    </div>
  );
}
