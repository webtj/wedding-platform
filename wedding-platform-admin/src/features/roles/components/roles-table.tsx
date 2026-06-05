'use client';

import { useQuery } from '@tanstack/react-query';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { useState, useEffect, useMemo } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  rolesQueryOptions,
  roleMenusQueryOptions,
  allMenusQueryOptions,
  assignRoleMenusMutation,
  createRoleMutation,
  updateRoleMutation,
  deleteRoleMutation
} from '../api/queries';
import { useAuthContext } from '@/lib/auth/auth-context';
import type { Role, MenuTreeNode } from '../api/types';
import type { MenuItemData } from '@/lib/auth/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

// ── Helpers ────────────────────────────────────────────────────────────────

function collectMenuIds(menus: MenuItemData[]): Set<string> {
  const ids = new Set<string>();
  for (const m of menus) {
    ids.add(m.id);
    if (m.children) {
      for (const c of m.children) {
        ids.add(c.id);
      }
    }
  }
  return ids;
}

// ── Main Table ─────────────────────────────────────────────────────────────

export function RolesTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault('')
  });
  const [searchInput, setSearchInput] = useState(params.search);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setParams({ search: value, page: 1 });
  }, 400);

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search })
  };
  const { data, isLoading } = useQuery(rolesQueryOptions(filters));

  if (isLoading || !data)
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='搜索角色名称或代码...'
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className='pl-9'
          />
        </div>
        <AddRoleDialog />
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>代码</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>菜单</TableHead>
              <TableHead>成员</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='h-24 text-center text-muted-foreground'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((role) => (
                <RoleRow key={role.id} role={role} />
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

function RoleRow({ role }: { role: Role }) {
  const { menus } = useAuthContext();
  const [permsOpen, setPermsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Users can only assign menus they themselves have access to
  const allowedMenuIds = collectMenuIds(menus);

  return (
    <TableRow>
      <TableCell className='font-medium'>{role.name}</TableCell>
      <TableCell>
        <code className='text-xs font-mono'>{role.code}</code>
      </TableCell>
      <TableCell className='text-muted-foreground'>{role.description || '-'}</TableCell>
      <TableCell>
        <Badge variant={role.isBuiltIn ? 'secondary' : 'outline'}>
          {role.isBuiltIn ? '内置' : '自定义'}
        </Badge>
      </TableCell>
      <TableCell>
        <button
          onClick={() => setPermsOpen(true)}
          className='text-primary hover:underline text-sm cursor-pointer'
        >
          {role.menus?.length ?? 0} 个菜单
        </button>
        <MenuPermsDialog
          open={permsOpen}
          onOpenChange={setPermsOpen}
          role={role}
          allowedMenuIds={allowedMenuIds}
        />
      </TableCell>
      <TableCell className='text-muted-foreground'>{role._count?.members ?? 0}</TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setEditOpen(true)}>
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
          {!role.isBuiltIn && (
            <Button variant='ghost' size='sm' onClick={() => setDeleteOpen(true)}>
              <Icons.trash className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
        <EditRoleDialog open={editOpen} onOpenChange={setEditOpen} role={role} />
        <DeleteRoleDialog open={deleteOpen} onOpenChange={setDeleteOpen} role={role} />
      </TableCell>
    </TableRow>
  );
}

// ── Menu Permission Tree Dialog ────────────────────────────────────────────

function MenuPermsDialog({
  open,
  onOpenChange,
  role,
  allowedMenuIds
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: Role;
  allowedMenuIds: Set<string>;
}) {
  const { data: allMenus } = useQuery({ ...allMenusQueryOptions(), enabled: open });
  const { data: roleMenus } = useQuery({ ...roleMenusQueryOptions(role.id), enabled: open });
  const assign = useMutationToast({
    ...assignRoleMenusMutation,
    successMsg: '菜单已保存',
    errorMsg: '保存失败'
  });

  const roleMenuIds = useMemo(
    () => new Set(roleMenus?.map((m) => m.id) ?? []),
    [roleMenus]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection when dialog opens or roleMenus data arrives
  useEffect(() => {
    if (open && roleMenus) setSelected(new Set(roleMenuIds));
  }, [open, roleMenus, roleMenuIds]);

  function toggle(id: string, children: MenuTreeNode[] | undefined) {
    if (!allowedMenuIds.has(id)) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      children?.forEach((c) => removeBranch(next, c));
    } else {
      next.add(id);
      children?.forEach((c) => addBranch(next, c));
    }
    setSelected(next);
  }

  function handleSave() {
    assign.mutate(
      { roleId: role.id, menuIds: Array.from(selected) },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[80vh]'>
        <DialogHeader>
          <DialogTitle>菜单权限 — {role.name}</DialogTitle>
          <DialogDescription>
            勾选该角色可访问的菜单项。选中父菜单会自动勾选所有子菜单。
          </DialogDescription>
        </DialogHeader>
        <div className='overflow-y-auto max-h-[50vh] space-y-1 py-2'>
          {allMenus?.map((menu: MenuTreeNode) => (
            <MenuTreeRow
              key={menu.id}
              node={menu}
              selected={selected}
              onToggle={toggle}
              depth={0}
              allowedIds={allowedMenuIds}
            />
          ))}
          {(!allMenus || allMenus.length === 0) && (
            <p className='text-muted-foreground text-sm text-center py-4'>暂无菜单数据</p>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={assign.isPending}>
            {assign.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function removeBranch(set: Set<string>, node: MenuTreeNode) {
  set.delete(node.id);
  node.children?.forEach((c) => removeBranch(set, c));
}

function addBranch(set: Set<string>, node: MenuTreeNode) {
  set.add(node.id);
  node.children?.forEach((c) => addBranch(set, c));
}

function MenuTreeRow({
  node,
  selected,
  onToggle,
  depth,
  allowedIds
}: {
  node: MenuTreeNode;
  selected: Set<string>;
  onToggle: (id: string, children: MenuTreeNode[] | undefined) => void;
  depth: number;
  allowedIds: Set<string>;
}) {
  const checked = selected.has(node.id);
  const isAllowed = allowedIds.has(node.id);

  return (
    <div>
      <label
        className={`flex items-center gap-2 py-1 rounded px-1 ${isAllowed ? 'hover:bg-accent cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        <Checkbox
          checked={checked}
          disabled={!isAllowed}
          onCheckedChange={() => isAllowed && onToggle(node.id, node.children)}
        />
        <span className='text-sm'>{node.label}</span>
      </label>
      {node.children?.map((child) => (
        <MenuTreeRow
          key={child.id}
          node={child}
          selected={selected}
          onToggle={onToggle}
          depth={depth + 1}
          allowedIds={allowedIds}
        />
      ))}
    </div>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

function EditRoleDialog({
  open,
  onOpenChange,
  role
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: Role;
}) {
  const update = useMutationToast({
    ...updateRoleMutation,
    successMsg: '角色已更新',
    errorMsg: '更新失败'
  });
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');

  function handleSave() {
    update.mutate(
      { id: role.id, data: { name, description } },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑角色 — {role.name}</DialogTitle>
          <DialogDescription>
            {role.isBuiltIn ? '内置角色仅可修改名称和描述' : '修改角色基本信息'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>描述</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
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

function DeleteRoleDialog({
  open,
  onOpenChange,
  role
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: Role;
}) {
  const del = useMutationToast({
    ...deleteRoleMutation,
    successMsg: '角色已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除角色 <strong>{role.name}</strong> 吗？如有成员关联则无法删除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            onClick={() => del.mutate(role.id, { onSuccess: () => onOpenChange(false) })}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Dialog ─────────────────────────────────────────────────────────────

function AddRoleDialog() {
  const [open, setOpen] = useState(false);
  const create = useMutationToast({
    ...createRoleMutation,
    successMsg: '角色已创建',
    errorMsg: '创建失败'
  });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSave() {
    if (!code.trim() || !name.trim()) return;
    create.mutate(
      { code: code.trim(), name: name.trim(), description: description || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setCode('');
          setName('');
          setDescription('');
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
            <DialogTitle>新增角色</DialogTitle>
            <DialogDescription>创建新的平台角色，代码需唯一（如 planner_v2）</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <Label>代码 *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='小写字母+下划线，如 planner_v2'
              />
            </div>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='角色名称'
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
            <Button
              onClick={handleSave}
              disabled={create.isPending || !code.trim() || !name.trim()}
            >
              {create.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
