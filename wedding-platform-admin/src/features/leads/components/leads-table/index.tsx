'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { leadsQueryOptions, updateLeadMutation } from '../../api/queries';
import type { Lead, LeadFilters } from '../../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { isWithinDays, toDateDisplay } from '@/lib/date-format';
import { STATUS_OPTIONS, S_COLOR, S_LABEL, SOURCE_LABEL } from '../../constants';
import { AddLeadDialog } from '../add-lead-dialog';
import { DeleteLeadDialog } from '../delete-lead-dialog';
import { CreateContractDialog } from '../create-contract-dialog';
import { EditLeadDialog } from '../edit-lead-dialog';
import { FollowupDrawer } from '../followup-drawer';
import { exportLeadsCsv } from '../../api/service';

export function LeadsTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('')
  });
  const [searchInput, setSearchInput] = useState(params.search);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [followupLeadId, setFollowupLeadId] = useState<string | null>(null);
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
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await exportLeadsCsv({ status: params.status, search: params.search });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  }

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
        <div className='ml-auto flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-9'
            onClick={handleExport}
            disabled={isExporting || data.items.length === 0}
            isLoading={isExporting}
          >
            <Icons.upload className='mr-1.5 h-4 w-4' />
            导出 CSV
          </Button>
          <AddLeadDialog />
        </div>
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='py-2.5'>客户</TableHead>
              <TableHead className='py-2.5'>电话</TableHead>
              <TableHead className='py-2.5'>来源</TableHead>
              <TableHead className='py-2.5'>婚期</TableHead>
              <TableHead className='py-2.5'>合同</TableHead>
              <TableHead className='py-2.5'>状态</TableHead>
              <TableHead className='py-2.5'>更新时间</TableHead>
              <TableHead className='py-2.5'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-48 text-center'>
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
              data.items.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onEdit={setEditLeadId}
                  onFollowup={setFollowupLeadId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditLeadDialog
        leadId={editLeadId}
        open={!!editLeadId}
        onOpenChange={(o) => !o && setEditLeadId(null)}
      />
      <FollowupDrawer
        leadId={followupLeadId}
        open={!!followupLeadId}
        onOpenChange={(o) => !o && setFollowupLeadId(null)}
      />

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

function LeadRow({
  lead,
  onEdit,
  onFollowup
}: {
  lead: Lead;
  onEdit: (id: string) => void;
  onFollowup: (id: string) => void;
}) {
  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '状态已更新',
    errorMsg: '更新失败'
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const statusLocked = lead.status === 'won';

  const upcomingWedding = isWithinDays(lead.weddingDate, 30);

  return (
    <TableRow className={upcomingWedding ? 'bg-amber-50/40 hover:bg-amber-50/60' : undefined}>
      <TableCell className='py-2'>
        <span className='font-medium text-sm'>
          {lead.name || lead.phone || '未知'}
        </span>
      </TableCell>
      <TableCell className='py-2 text-sm font-mono text-muted-foreground'>
        {lead.phone || '-'}
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {SOURCE_LABEL[lead.sourceChannel] ?? lead.sourceChannel}
      </TableCell>
      <TableCell className='py-2 text-sm'>
        <div className='flex items-center gap-1.5'>
          <span className={upcomingWedding ? 'font-medium text-amber-700' : undefined}>
            {toDateDisplay(lead.weddingDate)}
          </span>
          {upcomingWedding && (
            <Badge
              variant='outline'
              className='text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50'
            >
              30天内
            </Badge>
          )}
        </div>
      </TableCell>
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
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs px-2'
            onClick={() => onFollowup(lead.id)}
          >
            跟进
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs px-2'
            onClick={() => onEdit(lead.id)}
          >
            编辑
          </Button>
          {!statusLocked && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={() => setDeleteOpen(true)}
            >
              删除
            </Button>
          )}
        </div>
        <DeleteLeadDialog open={deleteOpen} onOpenChange={setDeleteOpen} lead={lead} />
        {lead.status === 'won' && !lead.contract && (
          <CreateContractDialog open={contractOpen} onOpenChange={setContractOpen} lead={lead} />
        )}
      </TableCell>
    </TableRow>
  );
}
