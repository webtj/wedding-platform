'use client';

import { useQuery } from '@tanstack/react-query';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { useState } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  accountsQueryOptions,
  filterOptionsQueryOptions,
  createAccountMutation,
  updateAccountMutation,
  deleteAccountMutation
} from '../api/queries';
import type { Account } from '../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

// ── Main Table ─────────────────────────────────────────────────────────────

export function AccountsTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    roleCode: parseAsString.withDefault('')
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
    ...(params.roleCode && { roleCode: params.roleCode })
  };

  const { data, isLoading } = useQuery(accountsQueryOptions(filters));
  const { data: opts } = useQuery(filterOptionsQueryOptions());

  if (isLoading || !data) {
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-3 flex-1 flex-wrap'>
          <div className='relative max-w-xs flex-1'>
            <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索账号或姓名...'
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSearch(e.target.value);
              }}
              className='pl-9'
            />
          </div>
          <Select
            value={params.roleCode || '__all__'}
            onValueChange={(v) => setParams({ roleCode: v === '__all__' ? '' : v, page: 1 })}
          >
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='全部角色' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>全部角色</SelectItem>
              {opts?.roles.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AddAccountDialog opts={opts} />
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  opts={opts}
                />
              ))
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

// ── Row ────────────────────────────────────────────────────────────────────

function AccountRow({
  account,
  opts
}: {
  account: Account;
  opts?: {
    tenants: { id: string; name: string }[];
    roles: { id: string; code: string; name: string }[];
  } | null;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const roles =
    account.tenantMembers
      ?.flatMap((m) => m.roles.map((r) => ({ code: r.role.code, name: r.role.name })))
      .filter((v, i, a) => a.findIndex((x) => x.code === v.code) === i) ?? [];

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <code className='text-xs font-mono'>{account.authAccounts?.[0]?.identifier ?? '-'}</code>
        </div>
      </TableCell>
      <TableCell className='font-medium'>{account.displayName}</TableCell>
      <TableCell>
        <div className='flex flex-wrap gap-1'>
          {roles.map((r) => (
            <Badge key={r.code} variant='outline' className='text-xs'>
              {r.name}
            </Badge>
          ))}
          {roles.length === 0 && <span className='text-muted-foreground text-xs'>-</span>}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
          {account.status === 'active' ? '启用' : '禁用'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setEditOpen(true)}>
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setDeleteOpen(true)}>
            <Icons.trash className='h-3.5 w-3.5' />
          </Button>
        </div>
        <EditAccountDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          account={account}
          opts={opts}
        />
        <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} account={account} />
      </TableCell>
    </TableRow>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

function EditAccountDialog({
  open,
  onOpenChange,
  account,
  opts
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: Account;
  opts?: {
    tenants: { id: string; name: string }[];
    roles: { id: string; code: string; name: string }[];
  } | null;
}) {
  const update = useMutationToast({
    ...updateAccountMutation,
    successMsg: '账号已更新',
    errorMsg: '更新失败'
  });
  const [displayName, setDisplayName] = useState(account.displayName);
  const [status, setStatus] = useState(account.status);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(account.tenantMembers?.flatMap((m) => m.roles.map((r) => r.role.id)) ?? [])
  );

  function toggleRole(roleId: string) {
    const next = new Set(selectedRoles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelectedRoles(next);
  }

  function validatePassword(): boolean {
    if (!password && !confirmPassword) {
      setPasswordError('');
      return true;
    }
    if (password.length < 8) {
      setPasswordError('密码至少 8 位');
      return false;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setPasswordError('密码必须包含字母和数字');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('两次密码不一致');
      return false;
    }
    setPasswordError('');
    return true;
  }

  function handleSave() {
    if (!validatePassword()) return;
    update.mutate(
      {
        id: account.id,
        data: {
          displayName,
          status,
          ...(password ? { password } : {}),
          roleIds: Array.from(selectedRoles)
        }
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑账号 — {account.displayName}</DialogTitle>
          <DialogDescription>修改用户信息、角色分配。留空密码则不修改。</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto'>
          <div className='space-y-2'>
            <Label>姓名</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>状态</Label>
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
            <div className='space-y-2'>
              <Label>新密码（选填，字母+数字，至少8位）</Label>
              <Input
                type='password'
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder='留空不修改'
              />
            </div>
            <div className='space-y-2'>
              <Label>确认密码</Label>
              <Input
                type='password'
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder='再次输入密码'
              />
            </div>
            {passwordError && <p className='text-sm text-destructive'>{passwordError}</p>}
          </div>
          <div className='space-y-2'>
            <Label>角色</Label>
            <div className='border rounded-lg p-3 space-y-1 max-h-[200px] overflow-y-auto'>
              {opts?.roles.map((r) => (
                <label key={r.code} className='flex items-center gap-2 py-1 cursor-pointer'>
                  <Checkbox
                    checked={selectedRoles.has(r.id)}
                    onCheckedChange={() => toggleRole(r.id)}
                  />
                  <span className='text-sm'>{r.name}</span>
                  <code className='text-muted-foreground text-xs'>{r.code}</code>
                </label>
              ))}
              {(!opts || opts.roles.length === 0) && (
                <p className='text-muted-foreground text-sm'>暂无角色数据</p>
              )}
            </div>
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

function DeleteAccountDialog({
  open,
  onOpenChange,
  account
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: Account;
}) {
  const del = useMutationToast({
    ...deleteAccountMutation,
    successMsg: '账号已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除用户 <strong>{account.displayName}</strong> 吗？平台管理员不可删除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            onClick={() => del.mutate(account.id, { onSuccess: () => onOpenChange(false) })}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Dialog ─────────────────────────────────────────────────────────────

function AddAccountDialog({
  opts
}: {
  opts?: {
    tenants: { id: string; name: string }[];
    roles: { id: string; code: string; name: string }[];
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const create = useMutationToast({
    ...createAccountMutation,
    successMsg: '账号已创建',
    errorMsg: '创建失败'
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  function toggleRole(roleId: string) {
    const next = new Set(selectedRoles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelectedRoles(next);
  }

  function handleSave() {
    if (!identifier.trim() || !displayName.trim() || selectedRoles.size === 0) return;
    if (password.length < 8) {
      setPasswordError('密码至少 8 位');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setPasswordError('密码必须包含字母和数字');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('两次密码不一致');
      return;
    }
    create.mutate(
      {
        identifier: identifier.trim(),
        password,
        displayName: displayName.trim(),
        roleIds: Array.from(selectedRoles)
      },
      {
        onSuccess: () => {
          setOpen(false);
          setIdentifier('');
          setPassword('');
          setDisplayName('');
          setSelectedRoles(new Set());
        }
      }
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
            <DialogTitle>新增账号</DialogTitle>
            <DialogDescription>创建新的平台账号，选择归属租户和角色。</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto'>
            <div className='space-y-2'>
              <Label>登录账号 *</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder='登录使用的账号名'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>密码 *（字母+数字，至少8位）</Label>
                <Input
                  type='password'
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder='字母+数字，至少8位'
                />
              </div>
              <div className='space-y-2'>
                <Label>确认密码 *</Label>
                <Input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder='再次输入密码'
                />
              </div>
              {passwordError && <p className='text-sm text-destructive'>{passwordError}</p>}
              <div className='space-y-2'>
                <Label>姓名 *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder='显示名称'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label>角色 *</Label>
              <div className='border rounded-lg p-3 space-y-1 max-h-[200px] overflow-y-auto'>
                {opts?.roles.map((r) => (
                  <label key={r.code} className='flex items-center gap-2 py-1 cursor-pointer'>
                    <Checkbox
                      checked={selectedRoles.has(r.id)}
                      onCheckedChange={() => toggleRole(r.id)}
                    />
                    <span className='text-sm'>{r.name}</span>
                    <code className='text-muted-foreground text-xs'>{r.code}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                create.isPending ||
                !identifier.trim() ||
                !password ||
                !displayName.trim() ||
                selectedRoles.size === 0
              }
            >
              {create.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
