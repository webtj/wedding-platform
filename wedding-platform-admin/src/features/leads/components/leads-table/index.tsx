'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { useOrganization } from '@clerk/nextjs';
import {
  leadsQueryOptions,
  createLeadMutation,
  updateLeadMutation,
  deleteLeadMutation,
  convertLeadMutation
} from '../../api/queries';
import type { Lead, LeadFilters } from '../../api/types';
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
import { toDateDisplay, toDateInput } from '@/lib/date-format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: '未沟通', value: 'new' },
  { label: '已联系', value: 'contacted' },
  { label: '已报价', value: 'quoted' },
  { label: '洽谈中', value: 'negotiating' },
  { label: '洽谈成功', value: 'won' },
  { label: '已流失', value: 'lost' }
];

const S_COLOR: Record<string, string> = {
  new: 'bg-slate-50 text-slate-500 border-slate-200',
  contacted: 'bg-sky-50 text-sky-600 border-sky-200',
  quoted: 'bg-amber-50 text-amber-600 border-amber-200',
  negotiating: 'bg-violet-50 text-violet-600 border-violet-200',
  won: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  lost: 'bg-rose-50 text-rose-500 border-rose-200'
};

const S_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

const SOURCE_LABEL: Record<string, string> = {
  wechat: '微信',
  xiaohongshu: '小红书',
  douyin: '抖音',
  referral: '转介绍',
  other: '其他'
};

// ── Main Table ─────────────────────────────────────────────────────────────

export function LeadsTable() {
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

  const filters: LeadFilters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status })
  };
  const { data, isLoading } = useQuery(leadsQueryOptions(filters));

  if (isLoading || !data)
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground'>
        <Icons.spinner className='h-6 w-6 animate-spin' />
        <p className='text-sm'>加载中...</p>
      </div>
    );

  const totalPages = Math.ceil(data.total / params.perPage) || 1;

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='搜索编码/姓名/电话...'
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className='pl-9 h-9'
          />
        </div>
        <Select
          value={params.status || '__all__'}
          onValueChange={(v) => setParams({ status: v === '__all__' ? '' : v, page: 1 })}
        >
          <SelectTrigger className='w-[140px] h-9'>
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
        <div className='ml-auto'>
          <AddLeadDialog />
        </div>
      </div>

      {/* Table */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='py-2.5'>意向单编号</TableHead>
              <TableHead className='py-2.5'>客户</TableHead>
              <TableHead className='py-2.5'>电话</TableHead>
              <TableHead className='py-2.5'>来源</TableHead>
              <TableHead className='py-2.5'>婚期</TableHead>
              <TableHead className='py-2.5'>合同</TableHead>
              <TableHead className='py-2.5'>状态</TableHead>
              <TableHead className='py-2.5'>跟进人</TableHead>
              <TableHead className='py-2.5'>更新时间</TableHead>
              <TableHead className='py-2.5'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className='h-48 text-center'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div className='flex items-center justify-center w-16 h-16 rounded-full bg-muted/50'>
                      <Icons.forms className='h-8 w-8 text-muted-foreground/40' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>暂无意向单</p>
                      <p className='text-xs text-muted-foreground/60 mt-0.5'>
                        点击右上角"新增意向单"开始记录客户咨询
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((lead) => <LeadRow key={lead.id} lead={lead} />)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between pt-4 mt-4 border-t'>
        <span className='text-sm text-muted-foreground'>共 {data.total} 条</span>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 px-2.5'
            disabled={params.page <= 1}
            onClick={() => setParams({ page: params.page - 1 })}
          >
            <Icons.chevronLeft className='h-4 w-4 mr-0.5' />
            上一页
          </Button>
          <span className='text-sm text-muted-foreground tabular-nums min-w-[4rem] text-center'>
            {params.page} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='h-8 px-2.5'
            disabled={params.page >= totalPages}
            onClick={() => setParams({ page: params.page + 1 })}
          >
            下一页
            <Icons.chevronRight className='h-4 w-4 ml-0.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

function LeadRow({ lead }: { lead: Lead }) {
  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '状态已更新',
    errorMsg: '更新失败'
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const statusLocked = lead.status === 'won';

  return (
    <TableRow>
      <TableCell className='py-2'>
        <code className='text-xs font-mono text-muted-foreground'>{lead.leadNo}</code>
      </TableCell>
      <TableCell className='py-2'>
        <span className='font-medium text-sm'>{lead.name || lead.phone || '未知'}</span>
      </TableCell>
      <TableCell className='py-2 text-sm font-mono text-muted-foreground'>
        {lead.phone || '-'}
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {SOURCE_LABEL[lead.sourceChannel] ?? lead.sourceChannel}
      </TableCell>
      <TableCell className='py-2 text-sm'>{toDateDisplay(lead.weddingDate)}</TableCell>
      <TableCell className='py-2 text-sm'>
        {lead.contract ? (
          <a
            href={`/studio/contracts?search=${lead.contract.contractNo}`}
            className='text-primary hover:underline text-xs font-mono'
          >
            {lead.contract.contractNo}
          </a>
        ) : (
          <span className='text-muted-foreground/40'>-</span>
        )}
      </TableCell>
      <TableCell className='py-2'>
        <div className='flex items-center gap-1.5'>
          <Badge
            variant='outline'
            className={`${S_COLOR[lead.status] ?? 'border-slate-200 text-slate-500'} text-[11px] px-1.5 py-0`}
          >
            {S_LABEL[lead.status] ?? lead.status}
          </Badge>
          {lead.convertedProject && (
            <Badge
              variant='outline'
              className='text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-600 bg-emerald-50'
            >
              已转项目
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {lead.createdBy?.displayName ?? '-'}
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {toDateDisplay(lead.updatedAt)}
      </TableCell>
      <TableCell className='py-2'>
        <div className='flex items-center gap-0.5'>
          {!statusLocked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs px-2 text-muted-foreground hover:text-foreground'
                >
                  {S_LABEL[lead.status]} <Icons.chevronsDown className='ml-0.5 h-3 w-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-32'>
                {STATUS_OPTIONS.filter((s) => s.value !== lead.status).map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => update.mutate({ id: lead.id, data: { status: s.value } })}
                    className='text-xs'
                  >
                    <Badge
                      variant='outline'
                      className={`${S_COLOR[s.value] ?? ''} mr-2 text-[11px] px-1.5 py-0`}
                    >
                      {s.label}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!statusLocked && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-muted-foreground hover:text-foreground'
              onClick={() => setEditOpen(true)}
            >
              <Icons.edit className='h-3.5 w-3.5 mr-1' />
              编辑
            </Button>
          )}
          {lead.status === 'won' && !lead.contract && (
            <Button
              variant='default'
              size='sm'
              className='h-7 text-xs px-2'
              onClick={() => setContractOpen(true)}
            >
              建合同
            </Button>
          )}
          {!statusLocked && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={() => setDeleteOpen(true)}
            >
              <Icons.trash className='h-3.5 w-3.5 mr-1' />
              删除
            </Button>
          )}
        </div>
        <EditLeadDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} />
        <DeleteLeadDialog open={deleteOpen} onOpenChange={setDeleteOpen} lead={lead} />
        {lead.status === 'won' && !lead.contract && (
          <CreateContractDialog open={contractOpen} onOpenChange={setContractOpen} lead={lead} />
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Add Dialog ─────────────────────────────────────────────────────────────

function AddLeadDialog() {
  const [open, setOpen] = useState(false);
  const create = useMutationToast({
    ...createLeadMutation,
    successMsg: '意向单已创建',
    errorMsg: '创建失败'
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sourceChannel, setSourceChannel] = useState('other');
  const [weddingDate, setWeddingDate] = useState('');
  const [note, setNote] = useState('');
  const [emailError, setEmailError] = useState('');

  function handleSave() {
    if (!name.trim()) return;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('邮箱格式不正确');
      return;
    }
    setEmailError('');
    create.mutate(
      {
        name: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        sourceChannel,
        weddingDate: weddingDate || undefined,
        note: note || undefined
      } as any,
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setPhone('');
          setEmail('');
          setNote('');
          setWeddingDate('');
        }
      }
    );
  }

  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <Icons.add className='mr-1.5 h-3.5 w-3.5' />
        新增意向单
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>新增意向单</DialogTitle>
            <DialogDescription>记录新的客户咨询意向</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto'>
            <div className='space-y-2'>
              <Label>客户名称 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='客户姓名或称呼'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>电话</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='手机号'
                />
              </div>
              <div className='space-y-2'>
                <Label>邮箱</Label>
                <Input
                  type='email'
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  placeholder='email@example.com'
                />
              </div>
            </div>
            {emailError && <p className='text-sm text-destructive'>{emailError}</p>}
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>来源</Label>
                <Select value={sourceChannel} onValueChange={setSourceChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className='space-y-2'>
              <Label>备注</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder='客户需求备注'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={create.isPending || !name.trim()}>
              {create.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

function EditLeadDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '已更新',
    errorMsg: '更新失败'
  });
  const [name, setName] = useState(lead.name ?? '');
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [email, setEmail] = useState(lead.email ?? '');
  const [sourceChannel, setSourceChannel] = useState(lead.sourceChannel ?? 'other');
  const [status, setStatus] = useState(lead.status ?? 'new');
  const [weddingDate, setWeddingDate] = useState(toDateInput(lead.weddingDate));
  const [note, setNote] = useState(lead.note ?? '');

  function handleSave() {
    update.mutate(
      {
        id: lead.id,
        data: {
          name: name || undefined,
          phone: phone || undefined,
          email: email || undefined,
          sourceChannel,
          status,
          weddingDate: weddingDate || undefined,
          note: note || undefined
        } as any
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>编辑意向单</DialogTitle>
          <DialogDescription>修改客户信息和跟进状态</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>客户名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>电话</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>邮箱</Label>
              <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>来源</Label>
              <Select value={sourceChannel} onValueChange={setSourceChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
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
            <div className='space-y-2'>
              <Label>婚期</Label>
              <Input
                type='date'
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
              />
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
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Dialog ──────────────────────────────────────────────────────────

function DeleteLeadDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const del = useMutationToast({
    ...deleteLeadMutation,
    successMsg: '已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>确定要删除意向单吗？此操作不可撤销。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            disabled={del.isPending}
            onClick={() => del.mutate(lead.id, { onSuccess: () => onOpenChange(false) })}
          >
            {del.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Contract Dialog ─────────────────────────────────────────────────

function CreateContractDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const { organization } = useOrganization();

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
  const [companyAddress, setCompanyAddress] = useState((organization as any)?.address ?? '');

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
      window.location.reload();
    } catch (e) {}
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

// ── Convert Dialog (保留用于合同管理中的转项目) ────────────────────────────

function ConvertDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const convert = useMutationToast({
    ...convertLeadMutation,
    successMsg: '已转为项目',
    errorMsg: '转换失败'
  });
  const [brideName, setBrideName] = useState(lead.name ?? '');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState(toDateInput(lead.weddingDate));
  const [ceremonyType, setCeremonyType] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [colorTheme, setColorTheme] = useState('');

  function handleSave() {
    if (!brideName.trim() || !groomName.trim() || !weddingDate) return;
    convert.mutate(
      {
        id: lead.id,
        data: {
          brideName: brideName.trim(),
          groomName: groomName.trim(),
          weddingDate,
          ceremonyType: ceremonyType || undefined,
          venue: venue || undefined,
          guestCount: guestCount ? Number(guestCount) : undefined,
          colorTheme: colorTheme || undefined
        }
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>转为项目</DialogTitle>
          <DialogDescription>确认客户信息，创建正式项目</DialogDescription>
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
              <Label>宾客数</Label>
              <Input
                type='number'
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={convert.isPending || !brideName.trim() || !groomName.trim() || !weddingDate}
          >
            {convert.isPending ? '转换中...' : '确认转换'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
