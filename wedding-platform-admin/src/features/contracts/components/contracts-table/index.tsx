'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  contractsQueryOptions,
  updateContractMutation,
  deleteContractMutation,
  voidContractMutation
} from '../../api/queries';
import type { Contract } from '../../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { toDateDisplay, toDateInput } from '@/lib/date-format';

const STATUS_OPTIONS = [
  { label: '待签署', value: 'pending_sign' },
  { label: '已签署', value: 'signed' },
  { label: '撤销合同', value: 'voided' }
];

const S_COLOR: Record<string, string> = {
  pending_sign: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  voided: 'bg-red-50 text-red-700 border-red-200'
};

const S_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

const fmt = (c: number) => `¥${(c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

export function ContractsTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('')
  });
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebouncedCallback(
    (v: string) => setParams({ search: v, page: 1 }),
    400
  );

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status })
  };
  const { data, isLoading } = useQuery(contractsQueryOptions(filters));

  const totalPages = data ? Math.ceil(data.total / params.perPage) : 0;

  return (
    <div className='space-y-4'>
      {/* ── Header bar: search + filter ── */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='搜索合同编号或名称...'
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className='pl-9'
          />
        </div>
        <Select
          value={params.status || '__all__'}
          onValueChange={(v) => setParams({ status: v === '__all__' ? '' : v, page: 1 })}
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='全部状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>全部状态</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading || !data ? (
        <div className='flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground'>
          <Icons.spinner className='h-6 w-6 animate-spin' />
          <span className='text-sm'>加载中...</span>
        </div>
      ) : data.items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground border rounded-lg'>
          <Icons.page className='h-12 w-12 stroke-1' />
          <p className='text-sm font-medium'>暂无合同</p>
          <p className='text-xs'>当前筛选条件下没有找到合同记录</p>
        </div>
      ) : (
        <>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同编号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>关联意向单</TableHead>
                  <TableHead>关联项目</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <ContractRow key={c.id} contract={c} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between pt-4 mt-4 border-t'>
            <span className='text-sm text-muted-foreground'>共 {data.total} 条</span>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={params.page <= 1}
                onClick={() => setParams({ page: params.page - 1 })}
              >
                上一页
              </Button>
              <span className='text-sm tabular-nums'>
                {params.page} / {totalPages || 1}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={params.page >= totalPages}
                onClick={() => setParams({ page: params.page + 1 })}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ContractRow({ contract }: { contract: Contract }) {
  const voidCt = useMutationToast({
    ...voidContractMutation,
    successMsg: '合同已撤销',
    errorMsg: '撤销失败'
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isSigned = contract.status === 'signed';

  return (
    <TableRow className='hover:bg-secondary/30'>
      <TableCell className='py-2'>
        <code className='text-xs font-mono'>{contract.contractNo}</code>
      </TableCell>
      <TableCell className='py-2 font-medium'>{contract.title}</TableCell>
      <TableCell className='py-2 text-sm font-mono'>{fmt(contract.amountCents)}</TableCell>
      <TableCell className='py-2 text-sm'>
        {contract.lead ? (
          <a
            href={`/studio/leads?search=${contract.lead.leadNo}`}
            className='text-primary hover:underline font-mono text-xs'
          >
            {contract.lead.leadNo}
          </a>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell className='py-2 text-sm'>
        {contract.project ? (
          <a
            href={`/studio/projects?search=${contract.project.projectNo}`}
            className='text-primary hover:underline font-mono text-xs'
          >
            {contract.project.projectNo}
          </a>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {toDateDisplay(contract.updatedAt)}
      </TableCell>
      <TableCell className='py-2'>
        <Badge variant='outline' className={`text-xs ${S_COLOR[contract.status] ?? ''}`}>
          {S_LABEL[contract.status] ?? contract.status}
        </Badge>
      </TableCell>
      <TableCell className='py-2'>
        <div className='flex items-center gap-1'>
          {!isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setEditOpen(true)}
            >
              编辑
            </Button>
          )}
          {contract.status === 'pending_sign' && contract.signToken && (
            <Button
              variant='default'
              size='sm'
              className='h-8 text-xs'
              onClick={() => {
                const url = `${window.location.origin}/contract/${contract.signToken}/sign`;
                navigator.clipboard.writeText(url);
                window.open(url, '_blank');
              }}
            >
              签署
            </Button>
          )}
          {contract.status === 'pending_sign' && (
            <Button
              variant='destructive'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setVoidOpen(true)}
            >
              撤销
            </Button>
          )}
          {isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setPreviewOpen(true)}
            >
              预览
            </Button>
          )}
          {isSigned && !contract.project && contract.lead && (
            <Button
              variant='default'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setProjectOpen(true)}
            >
              建项目
            </Button>
          )}
          {!isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 text-xs text-muted-foreground hover:text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Icons.trash className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
        <EditContractDialog open={editOpen} onOpenChange={setEditOpen} contract={contract} />
        <DeleteContractDialog open={deleteOpen} onOpenChange={setDeleteOpen} contract={contract} />
        <VoidContractDialog open={voidOpen} onOpenChange={setVoidOpen} contract={contract} />
        <PreviewContractDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          contract={contract}
        />
        {contract.status === 'signed' && !contract.project && contract.lead && (
          <ConvertToProjectDialog
            open={projectOpen}
            onOpenChange={setProjectOpen}
            contract={contract}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

function EditContractDialog({
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

function DeleteContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const del = useMutationToast({
    ...deleteContractMutation,
    successMsg: '已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>确定要删除合同 {contract.contractNo} 吗？</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={del.isPending}
            onClick={() => del.mutate(contract.id, { onSuccess: () => onOpenChange(false) })}
          >
            {del.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const voidCt = useMutationToast({
    ...voidContractMutation,
    successMsg: '合同已撤销',
    errorMsg: '撤销失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认撤销</DialogTitle>
          <DialogDescription>
            撤销合同 {contract.contractNo}{' '}
            将删除此合同数据，并解除与意向单的关联（意向单状态变为"已流失"）。此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={voidCt.isPending}
            onClick={() => voidCt.mutate(contract.id, { onSuccess: () => onOpenChange(false) })}
          >
            {voidCt.isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewContractDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
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
                {fmt(contract.amountCents)}
              </div>
              <div>
                <span className='text-muted-foreground'>定金：</span>
                {contract.depositCents ? fmt(contract.depositCents) : '-'}
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

          {contract.signatureData && (
            <div className='border-t pt-4'>
              <h4 className='font-semibold mb-2'>客户签名</h4>
              <img
                src={contract.signatureData}
                alt='客户签名'
                className='max-w-[300px] border-b border-gray-400 pb-2'
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

function ConvertToProjectDialog({
  open,
  onOpenChange,
  contract
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: Contract;
}) {
  const [brideName, setBrideName] = useState(contract.brideName ?? contract.lead?.name ?? '');
  const [groomName, setGroomName] = useState(contract.groomName ?? '');
  const [weddingDate, setWeddingDate] = useState(toDateInput(contract.weddingDate));
  const [ceremonyType, setCeremonyType] = useState('');
  const [venue, setVenue] = useState(contract.venue ?? '');
  const [guestCount, setGuestCount] = useState('');
  const [colorTheme, setColorTheme] = useState('');
  const [style, setStyle] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  async function handleSave() {
    if (!brideName.trim() || !groomName.trim() || !weddingDate) return;
    const { createProjectFromContract } = await import('@/features/projects/api/service');
    try {
      await createProjectFromContract({
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
      });
      window.location.reload();
    } catch (e) {
      /* toast handled */
    }
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!brideName.trim() || !groomName.trim() || !weddingDate}
          >
            确认转换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
