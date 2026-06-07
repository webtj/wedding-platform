'use client';

import { useQuery } from '@tanstack/react-query';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { useState, useEffect, useMemo } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  teamRolesQueryOptions,
  teamRoleDetailQueryOptions,
  tenantMenuTreeQueryOptions,
  assignTeamRoleMenusMutation,
  createTeamRoleMutation,
  updateTeamRoleMutation,
  deleteTeamRoleMutation
} from '../api/queries';
import { useAuthContext } from '@/lib/auth/auth-context';
import type { TeamRole, MenuTreeNode } from '../api/types';
import type { MenuItemData } from '@/lib/auth/types';
import {
  ROLE_TEMPLATES,
  ROLE_TEMPLATE_CODES,
  summarizePermissionGroups,
  type RoleTemplateCode
} from '@/lib/role-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export function TeamRolesTable() {
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
  const { data, isLoading } = useQuery(teamRolesQueryOptions(filters));

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
              <TableHead>权限功能</TableHead>
              <TableHead>菜单</TableHead>
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

function RoleRow({ role }: { role: TeamRole }) {
  const { menus, isPlatformAdmin } = useAuthContext();
  const [permsOpen, setPermsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Platform admins (cross-tenant) → no menu restriction, allow any.
  // Tenant users → restrict to menus they themselves have access to.
  // Fallback: if the user has zero menu overlap with this tenant (e.g. fresh
  // role assignment), still allow them — the backend `canAssignMenu` is the
  // security boundary and validates tenant scope on every save.
  const allowedMenuIds = isPlatformAdmin
    ? null
    : (collectMenuIds(menus).size > 0 ? collectMenuIds(menus) : null);

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
        <RoleCapabilitiesCell permissionCodes={role.permissionCodes ?? []} />
      </TableCell>
      <TableCell>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setPermsOpen(true)}
          className='h-7 px-2 text-xs'
        >
          <Icons.externalLink className='mr-1 h-3.5 w-3.5' />
          关联菜单
        </Button>
        <MenuPermsDialog
          open={permsOpen}
          onOpenChange={setPermsOpen}
          roleId={role.id}
          roleName={role.name}
          allowedMenuIds={allowedMenuIds}
        />
      </TableCell>
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

// Hide permission codes from designers. Show the count of capability codes
// + a popover with the human-readable group breakdown. The v2 single source
// of truth is role.permissionCodes, set by the template picker or by the
// menu union recompute; we never expose raw codes like "lead.read".
function RoleCapabilitiesCell({ permissionCodes }: { permissionCodes: string[] }) {
  if (permissionCodes.length === 0) {
    return <span className='text-xs text-muted-foreground'>未配置</span>;
  }
  const groups = summarizePermissionGroups(permissionCodes);
  const groupCount = groups.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-7 px-2 text-xs'>
          <Icons.lock className='mr-1 h-3.5 w-3.5' />
          {permissionCodes.length} 项功能
          <span className='ml-1 text-muted-foreground'>· {groupCount} 组</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 max-h-80 overflow-y-auto' align='start'>
        <p className='text-xs font-medium mb-2'>该角色可执行的功能</p>
        <Accordion type='multiple' className='w-full'>
          {groups.map((g) => (
            <AccordionItem key={g.group} value={g.group} className='border-b-0'>
              <AccordionTrigger className='text-sm py-2 hover:no-underline'>
                <span className='flex items-center gap-2'>
                  {g.group}
                  <span className='text-xs text-muted-foreground'>（{g.codes.length}）</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className='space-y-1 pl-5 list-disc text-xs text-muted-foreground'>
                  {g.descriptions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className='text-xs text-muted-foreground pt-2 border-t mt-2'>
          权限码对策划师不可见，只显示功能描述。
        </p>
      </PopoverContent>
    </Popover>
  );
}

// ── Menu Permission Tree Dialog ────────────────────────────────────────────

function MenuPermsDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  allowedMenuIds
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roleId: string;
  roleName: string;
  allowedMenuIds: Set<string> | null;
}) {
  const { data: tenantMenus } = useQuery({ ...tenantMenuTreeQueryOptions(), enabled: open });
  const { data: roleDetail } = useQuery({ ...teamRoleDetailQueryOptions(roleId), enabled: open });
  const assign = useMutationToast({
    ...assignTeamRoleMenusMutation,
    successMsg: '菜单已保存',
    errorMsg: '保存失败'
  });

  const roleMenuIds = useMemo(
    () => new Set(roleDetail?.menus?.map((m) => m.menuItem.id) ?? []),
    [roleDetail]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection when role detail loads
  useEffect(() => {
    if (open && roleDetail) setSelected(new Set(roleMenuIds));
  }, [open, roleDetail, roleMenuIds]);

  function toggle(id: string, children: MenuTreeNode[] | undefined) {
    if (allowedMenuIds && !allowedMenuIds.has(id)) return;
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
      { roleId, menuItemIds: Array.from(selected) },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[80vh]'>
        <DialogHeader>
          <DialogTitle>关联菜单 — {roleName}</DialogTitle>
          <DialogDescription>
            勾选该角色可访问的菜单项。选中父菜单会自动勾选所有子菜单。
            关联的菜单会自动授予该角色对应的接口权限（在『菜单管理 → 接口权限』中配置）。
          </DialogDescription>
        </DialogHeader>
        <div className='overflow-y-auto max-h-[50vh] space-y-1 py-2'>
          {tenantMenus?.map((menu: MenuTreeNode) => (
            <MenuTreeRow
              key={menu.id}
              node={menu}
              selected={selected}
              onToggle={toggle}
              depth={0}
              allowedIds={allowedMenuIds}
            />
          ))}
          {(!tenantMenus || tenantMenus.length === 0) && (
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
  allowedIds: Set<string> | null;
}) {
  const checked = selected.has(node.id);
  const isAllowed = allowedIds === null || allowedIds.has(node.id);

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
  role: TeamRole;
}) {
  const update = useMutationToast({
    ...updateTeamRoleMutation,
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
  role: TeamRole;
}) {
  const del = useMutationToast({
    ...deleteTeamRoleMutation,
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

const NO_TEMPLATE = '__none__';

function AddRoleDialog() {
  const [open, setOpen] = useState(false);
  const [templateCode, setTemplateCode] = useState<string>(NO_TEMPLATE);
  const create = useMutationToast({
    ...createTeamRoleMutation,
    successMsg: '角色已创建',
    errorMsg: '创建失败'
  });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const selectedTemplate =
    templateCode !== NO_TEMPLATE ? ROLE_TEMPLATES[templateCode as RoleTemplateCode] : null;

  // When the user picks a template, prefill name + description (but never code —
  // codes must be tenant-unique and operators usually want a project-specific one).
  useEffect(() => {
    if (!open) return;
    if (selectedTemplate) {
      setName((prev) => (prev.trim() === '' ? selectedTemplate.name : prev));
      setDescription((prev) => (prev.trim() === '' ? selectedTemplate.description : prev));
    }
  }, [open, templateCode, selectedTemplate]);

  function reset() {
    setTemplateCode(NO_TEMPLATE);
    setCode('');
    setName('');
    setDescription('');
  }

  function handleSave() {
    if (!code.trim() || !name.trim()) return;
    const payload: {
      code: string;
      name: string;
      description?: string;
      permissionCodes?: string[];
    } = {
      code: code.trim(),
      name: name.trim(),
      description: description || undefined
    };
    if (selectedTemplate) {
      payload.permissionCodes = [...selectedTemplate.permissionCodes];
    }
    create.mutate(payload, {
      onSuccess: () => {
        setOpen(false);
        reset();
      }
    });
  }

  const previewGroups = selectedTemplate
    ? summarizePermissionGroups(selectedTemplate.permissionCodes)
    : [];

  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <Icons.add className='mr-1 h-3.5 w-3.5' />
        新增
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
            <DialogDescription>
              从模板开始可一键获得该角色对应的全部功能。模板可创建后再通过『关联菜单』微调。
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <Label>从模板开始</Label>
              <Select value={templateCode} onValueChange={setTemplateCode}>
                <SelectTrigger>
                  <SelectValue placeholder='选择模板（可选）' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>
                    <span className='text-muted-foreground'>空白角色</span>
                  </SelectItem>
                  {ROLE_TEMPLATE_CODES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ROLE_TEMPLATES[c].name}（{ROLE_TEMPLATES[c].permissionCodes.length} 项功能）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className='text-xs text-muted-foreground'>{selectedTemplate.description}</p>
              )}
            </div>

            {selectedTemplate && (
              <div className='rounded-md border bg-muted/30 p-3 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>将获得 {selectedTemplate.permissionCodes.length} 项功能</span>
                  <Badge variant='secondary'>{selectedTemplate.name}</Badge>
                </div>
                <Accordion type='multiple' className='w-full'>
                  {previewGroups.map((g) => (
                    <AccordionItem key={g.group} value={g.group} className='border-b-0'>
                      <AccordionTrigger className='text-sm py-2 hover:no-underline'>
                        <span className='flex items-center gap-2'>
                          <Icons.panelLeft className='h-3.5 w-3.5' />
                          {g.group}
                          <span className='text-xs text-muted-foreground'>（{g.codes.length}）</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className='space-y-1 pl-5 list-disc text-xs text-muted-foreground'>
                          {g.descriptions.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <p className='text-xs text-muted-foreground pt-1'>
                  隐藏码：策划师用户看不到具体接口权限码，只看到功能描述。
                </p>
              </div>
            )}

            <div className='space-y-2'>
              <Label>代码 *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='小写字母+下划线，如 designer'
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
