'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { contractsQueryOptions } from '../../api/queries';
import { exportContractsCsv } from '../../api/service';
import type { Contract, ContractFilters } from '../../api/types';
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
import { S_COLOR, S_LABEL, STATUS_OPTIONS, fmtAmount } from '../../constants';
import { EditContractDialog } from '../edit-contract-dialog';
import { DeleteContractDialog } from '../delete-contract-dialog';
import { VoidContractDialog } from '../void-contract-dialog';
import { PreviewContractDialog } from '../preview-contract-dialog';
import { ConvertToProjectDialog } from '../convert-to-project-dialog';

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

  const filters: ContractFilters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status })
  };
  const { data, isLoading } = useQuery(contractsQueryOptions(filters));
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await exportContractsCsv({ status: params.status, search: params.search });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracts-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const totalPages = data ? Math.ceil(data.total / params.perPage) : 0;

  return (
    <div className='space-y-4'>
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
          <Button
            variant='outline'
            size='sm'
            className='h-9'
            onClick={handleExport}
            disabled={isExporting || !data || data.items.length === 0}
            isLoading={isExporting}
          >
            <Icons.upload className='mr-1.5 h-4 w-4' />
            导出 CSV
          </Button>
        </div>
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
                  <TableHead className='py-2.5'>合同编号</TableHead>
                  <TableHead className='py-2.5'>名称</TableHead>
                  <TableHead className='py-2.5'>金额</TableHead>
                  <TableHead className='py-2.5'>婚期</TableHead>
                  <TableHead className='py-2.5'>关联意向单</TableHead>
                  <TableHead className='py-2.5'>关联项目</TableHead>
                  <TableHead className='py-2.5'>状态</TableHead>
                  <TableHead className='py-2.5'>更新时间</TableHead>
                  <TableHead className='py-2.5'>操作</TableHead>
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
                className='h-8 px-2.5'
                disabled={params.page <= 1}
                onClick={() => setParams({ page: params.page - 1 })}
              >
                <Icons.chevronLeft className='h-4 w-4 mr-0.5' />
                上一页
              </Button>
              <span className='text-sm text-muted-foreground tabular-nums min-w-[4rem] text-center'>
                {params.page} / {totalPages || 1}
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
        </>
      )}
    </div>
  );
}

function ContractRow({ contract }: { contract: Contract }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isSigned = contract.status === 'signed';
  const upcomingWedding = isWithinDays(contract.weddingDate, 30);

  return (
    <TableRow className={upcomingWedding ? 'bg-amber-50/40 hover:bg-amber-50/60' : undefined}>
      <TableCell className='py-2'>
        <code className='text-xs font-mono text-muted-foreground'>{contract.contractNo}</code>
      </TableCell>
      <TableCell className='py-2 font-medium'>{contract.title}</TableCell>
      <TableCell className='py-2 text-sm font-mono'>{fmtAmount(contract.amountCents)}</TableCell>
      <TableCell className='py-2 text-sm'>
        <div className='flex items-center gap-1.5'>
          <span className={upcomingWedding ? 'font-medium text-amber-700' : undefined}>
            {toDateDisplay(contract.weddingDate)}
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
        {contract.lead ? (
          <a
            href={`/studio/leads?search=${contract.lead.leadNo}`}
            className='text-primary hover:underline font-mono text-xs'
          >
            {contract.lead.leadNo}
          </a>
        ) : (
          <span className='text-muted-foreground/40'>-</span>
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
          <span className='text-muted-foreground/40'>-</span>
        )}
      </TableCell>
      <TableCell className='py-2'>
        <Badge variant='outline' className={`text-xs ${S_COLOR[contract.status] ?? ''}`}>
          {S_LABEL[contract.status] ?? contract.status}
        </Badge>
      </TableCell>
      <TableCell className='py-2 text-sm text-muted-foreground'>
        {toDateDisplay(contract.updatedAt)}
      </TableCell>
      <TableCell className='py-2'>
        <div className='flex items-center gap-1'>
          {!isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-muted-foreground hover:text-foreground'
              onClick={() => setEditOpen(true)}
            >
              编辑
            </Button>
          )}
          {contract.status === 'pending_sign' && contract.signToken && (
            <Button
              variant='default'
              size='sm'
              className='h-7 text-xs px-2'
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
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={() => setVoidOpen(true)}
            >
              撤销
            </Button>
          )}
          {isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2 text-muted-foreground hover:text-foreground'
              onClick={() => setPreviewOpen(true)}
            >
              预览
            </Button>
          )}
          {isSigned && !contract.project && contract.lead && (
            <Button
              variant='default'
              size='sm'
              className='h-7 text-xs px-2.5'
              onClick={() => setProjectOpen(true)}
            >
              建项目
            </Button>
          )}
          {!isSigned && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-1.5 text-muted-foreground hover:text-destructive'
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
