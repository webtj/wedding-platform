'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { mutationToast } from '@/lib/toast';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { tenantsQueryOptions } from '../api/queries';
import { deleteTenantMutation, updateTenantMutation, createTenantMutation } from '../api/mutations';
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
import { useState } from 'react';
import type { Tenant } from '../api/types';

const S_TONE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  disabled: 'destructive'
};

export function TenantsTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('')
  });

  const [searchInput, setSearchInput] = useState(params.search);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setParams({ search: value, page: 1 });
  }, 400);

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status })
  };

  const { data, isLoading } = useQuery(tenantsQueryOptions(filters));

  if (isLoading || !data)
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3 flex-1'>
          <div className='relative flex-1 max-w-sm'>
            <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索租户名称...'
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>全部状态</SelectItem>
              <SelectItem value='active'>启用</SelectItem>
              <SelectItem value='disabled'>禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AddTenantDialog />
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>统计</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((tenant) => <TenantRow key={tenant.id} tenant={tenant} />)
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between'>
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
          <span className='text-sm'>
            {params.page} / {Math.ceil(data.total / params.perPage) || 1}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page >= Math.ceil(data.total / params.perPage)}
            onClick={() => setParams({ page: params.page + 1 })}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const del = useMutation(deleteTenantMutation);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <TableRow>
      <TableCell className='font-medium'>{tenant.name}</TableCell>
      <TableCell className='text-muted-foreground'>{tenant.description || '-'}</TableCell>
      <TableCell>
        <Badge variant={S_TONE[tenant.status] ?? 'secondary'}>
          {tenant.status === 'active' ? '启用' : '禁用'}
        </Badge>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {tenant._count ? `${tenant._count.members} 成员 / ${tenant._count.projects} 项目` : '-'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {new Date(tenant.createdAt).toLocaleDateString('zh-CN')}
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setEditOpen(true)}>
            <Icons.edit className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setDeleteOpen(true)}>
            <Icons.trash className='h-4 w-4' />
          </Button>
        </div>
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          tenantName={tenant.name}
          onConfirm={() =>
            del.mutate(tenant.id, mutationToast({ success: '租户已删除', error: '删除失败' }))
          }
        />
        <EditDialog open={editOpen} onOpenChange={setEditOpen} tenant={tenant} />
      </TableCell>
    </TableRow>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  tenantName,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除租户 <strong>{tenantName}</strong> 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  open,
  onOpenChange,
  tenant
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant: Tenant;
}) {
  const update = useMutation(updateTenantMutation);
  const [name, setName] = useState(tenant.name);
  const [description, setDescription] = useState(tenant.description || '');
  const [status, setStatus] = useState(tenant.status);

  function handleSave() {
    update.mutate(
      { id: tenant.id, data: { name, description, status } },
      mutationToast({
        success: '租户已更新',
        error: '更新失败',
        onSuccess: () => onOpenChange(false)
      })
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑租户</DialogTitle>
          <DialogDescription>修改 {tenant.name} 的基本信息</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='edit-name'>名称</Label>
            <Input id='edit-name' value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='edit-desc'>描述</Label>
            <Input
              id='edit-desc'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='edit-status'>状态</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='active'>启用</SelectItem>
                <SelectItem value='disabled'>禁用</SelectItem>
              </SelectContent>
            </Select>
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

// ── Add Tenant Dialog ──────────────────────────────────────────────────────

function AddTenantDialog() {
  const [open, setOpen] = useState(false);
  const create = useMutation(createTenantMutation);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSave() {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), description: description || undefined },
      mutationToast({
        success: '租户已创建',
        error: '创建失败',
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDescription('');
        }
      })
    );
  }

  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <Icons.add className='mr-1 h-3.5 w-3.5' />
        新增
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增租户</DialogTitle>
            <DialogDescription>创建一个新的婚庆公司租户</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='租户/公司名称'
              />
            </div>
            <div className='space-y-2'>
              <Label>描述</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='可选'
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
