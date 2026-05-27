'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { useState, useCallback, type ReactNode } from 'react';
import {
  menusQueryOptions,
  createMenuMutation,
  updateMenuMutation,
  deleteMenuMutation,
  reorderMenusMutation
} from '../api/queries';
import type { MenuItem } from '../api/types';
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

// ── Icon Picker ────────────────────────────────────────────────────────────

const ICON_KEYS = [
  'dashboard',
  'kanban',
  'panelLeft',
  'forms',
  'post',
  'page',
  'workspace',
  'user',
  'teams',
  'employee',
  'userPen',
  'creditCard',
  'billing',
  'product',
  'chat',
  'notification',
  'phone',
  'settings',
  'palette',
  'calendar',
  'sparkles',
  'badgeCheck',
  'lock',
  'pro',
  'exclusive',
  'galleryVerticalEnd',
  'search'
];

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = search ? ICON_KEYS.filter((k) => k.includes(search.toLowerCase())) : ICON_KEYS;

  return (
    <div className='space-y-2'>
      <Input
        placeholder='搜索图标...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className='h-8 text-sm'
      />
      <div className='grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto border rounded-lg p-2'>
        <button
          type='button'
          key='_none'
          onClick={() => onChange('')}
          className={`flex items-center justify-center rounded p-1.5 text-xs text-muted-foreground hover:bg-accent ${
            !value ? 'ring-2 ring-primary' : ''
          }`}
          title='无图标'
        >
          无
        </button>
        {filtered.map((key) => {
          const Icon = Icons[key as keyof typeof Icons] as
            | React.ComponentType<{ className?: string }>
            | undefined;
          return (
            <button
              type='button'
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center justify-center rounded p-1.5 hover:bg-accent ${
                value === key ? 'ring-2 ring-primary bg-accent' : ''
              }`}
              title={key}
            >
              {Icon ? <Icon className='h-4 w-4' /> : key.slice(0, 2)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function flattenTree(
  items: MenuItem[],
  depth = 0,
  parentHidden = false
): (MenuItem & { _depth: number; _parentHidden: boolean })[] {
  const result: (MenuItem & { _depth: number; _parentHidden: boolean })[] = [];
  for (const item of items) {
    const hidden = parentHidden || !item.visible;
    result.push({ ...item, _depth: depth, _parentHidden: hidden });
    if (item.children?.length) {
      result.push(...flattenTree(item.children, depth + 1, !item.visible));
    }
  }
  return result;
}

function makeParentOptions(items: MenuItem[], excludeId?: string): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (item.id !== excludeId) {
      result.push(item);
      if (item.children?.length) {
        result.push(...makeParentOptions(item.children, excludeId));
      }
    }
  }
  return result;
}

// ── Main View ──────────────────────────────────────────────────────────────

export function MenusView() {
  const { data, isLoading } = useQuery(menusQueryOptions());
  const reorder = useMutationToast({
    ...reorderMenusMutation,
    successMsg: '排序已保存',
    errorMsg: '保存失败'
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (isLoading || !data)
    return <div className='py-12 text-center text-muted-foreground'>加载中...</div>;

  if (!data || data.length === 0) {
    return (
      <div className='py-12 text-center text-muted-foreground'>
        <Icons.post className='mx-auto mb-3 h-12 w-12 opacity-50' />
        <p>暂无菜单数据</p>
      </div>
    );
  }

  const allFlat = flattenTree(data);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-end'>
        <AddMenuDialog parentId={undefined} />
      </div>

      <div className='rounded-lg border'>
        <table className='w-full'>
          <thead className='bg-muted'>
            <tr>
              <th className='px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                菜单名称
              </th>
              <th className='px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell'>
                路径
              </th>
              <th className='px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell'>
                图标
              </th>
              <th className='px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                可见
              </th>
              <th className='px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {renderTree(data, {
              expanded,
              toggleExpand,
              depth: 0,
              siblingCount: data.length
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Recursive Tree Render ──────────────────────────────────────────────────

function renderTree(
  items: MenuItem[],
  ctx: {
    expanded: Set<string>;
    toggleExpand: (id: string) => void;
    depth: number;
    siblingCount: number;
  }
): ReactNode[] {
  const result: ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const hasChildren = !!item.children?.length;
    const isExpanded = ctx.expanded.has(item.id);
    const isFirst = i === 0;
    const isLast = i === items.length - 1;

    result.push(
      <MenuRow
        key={item.id}
        item={item}
        depth={ctx.depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggle={() => ctx.toggleExpand(item.id)}
        isFirst={isFirst}
        isLast={isLast}
        siblings={items}
      />
    );

    if (hasChildren && isExpanded) {
      result.push(
        ...renderTree(item.children!, {
          expanded: ctx.expanded,
          toggleExpand: ctx.toggleExpand,
          depth: ctx.depth + 1,
          siblingCount: item.children!.length
        })
      );
    }
  }
  return result;
}

// ── Menu Row ───────────────────────────────────────────────────────────────

function MenuRow({
  item,
  depth,
  hasChildren,
  isExpanded,
  onToggle,
  isFirst,
  isLast,
  siblings
}: {
  item: MenuItem;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isFirst: boolean;
  isLast: boolean;
  siblings: MenuItem[];
}) {
  const reorder = useMutationToast({
    ...reorderMenusMutation,
    successMsg: '排序已保存',
    errorMsg: '保存失败'
  });

  function move(dir: 'up' | 'down') {
    const idx = siblings.findIndex((s) => s.id === item.id);
    const other = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!other) return;
    const items = [
      { id: item.id, sortOrder: other.sortOrder },
      { id: other.id, sortOrder: item.sortOrder }
    ];
    reorder.mutate(items);
  }
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);

  const SiblingIcon = ICON_KEYS.includes(item.icon ?? '')
    ? (Icons[item.icon as keyof typeof Icons] as
        | React.ComponentType<{ className?: string }>
        | undefined)
    : undefined;

  return (
    <tr
      className={`border-b border-border hover:bg-accent/50 transition-colors ${
        depth === 0 && hasChildren ? 'cursor-pointer' : ''
      }`}
      onClick={hasChildren ? onToggle : undefined}
    >
      <td className='px-4 py-2.5' style={{ paddingLeft: `${depth * 24 + 16}px` }}>
        <div className='flex items-center gap-2'>
          {hasChildren && (
            <span className='shrink-0 text-muted-foreground'>
              {isExpanded ? (
                <Icons.chevronDown className='h-3.5 w-3.5' />
              ) : (
                <Icons.chevronRight className='h-3.5 w-3.5' />
              )}
            </span>
          )}
          <span className='font-medium text-sm'>{item.label}</span>
          {hasChildren && (
            <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
              {item.children!.length}
            </Badge>
          )}
        </div>
      </td>
      <td className='px-4 py-2.5 text-muted-foreground font-mono text-xs hidden sm:table-cell'>
        {item.href || '—'}
      </td>
      <td className='px-4 py-2.5 hidden md:table-cell'>
        {SiblingIcon ? (
          <SiblingIcon className='h-4 w-4 text-muted-foreground' />
        ) : (
          <span className='text-muted-foreground text-xs'>—</span>
        )}
      </td>
      <td className='px-4 py-2.5 text-center'>
        <Badge variant={item.visible ? 'default' : 'outline'} className='text-xs'>
          {item.visible ? '可见' : '隐藏'}
        </Badge>
      </td>
      <td className='px-4 py-2.5 text-right' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-end gap-0.5'>
          <Button
            variant='ghost'
            size='sm'
            disabled={isFirst}
            onClick={() => move('up')}
            title='上移'
          >
            <Icons.chevronUp className='h-3.5 w-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            disabled={isLast}
            onClick={() => move('down')}
            title='下移'
          >
            <Icons.chevronDown className='h-3.5 w-3.5' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setEditOpen(true)}>
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setDeleteOpen(true)}>
            <Icons.trash className='h-3.5 w-3.5' />
          </Button>
          {depth === 0 && (
            <Button variant='ghost' size='sm' onClick={() => setAddChildOpen(true)}>
              <Icons.add className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          label={item.label}
          menuId={item.id}
        />
        <EditDialog open={editOpen} onOpenChange={setEditOpen} item={item} />
        <AddMenuDialog open={addChildOpen} onOpenChange={setAddChildOpen} parentId={item.id} />
      </td>
    </tr>
  );
}

// ── Delete Dialog ──────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  label,
  menuId
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  menuId: string;
}) {
  const del = useMutationToast({
    ...deleteMenuMutation,
    successMsg: '菜单已删除',
    errorMsg: '删除失败'
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除菜单 <strong>{label}</strong> 吗？如有子菜单需先删除子菜单。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant='destructive'
            onClick={() => del.mutate(menuId, { onSuccess: () => onOpenChange(false) })}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

function EditDialog({
  open,
  onOpenChange,
  item
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: MenuItem;
}) {
  const { data } = useQuery(menusQueryOptions());
  const update = useMutationToast({
    ...updateMenuMutation,
    successMsg: '菜单已更新',
    errorMsg: '更新失败'
  });
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href || '');
  const [icon, setIcon] = useState(item.icon || '');
  const [visible, setVisible] = useState(item.visible ? 'true' : 'false');
  const [parentId, setParentId] = useState(item.parentId || '__none__');

  const parentOptions = data ? makeParentOptions(data, item.id).filter((p) => !p.parentId) : [];

  function handleSave() {
    if (!label.trim()) return;
    update.mutate(
      {
        id: item.id,
        data: {
          label: label.trim(),
          href: href || undefined,
          icon: icon || undefined,
          visible: visible === 'true',
          parentId: parentId === '__none__' ? null : parentId
        }
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑菜单 — {item.label}</DialogTitle>
          <DialogDescription>修改菜单属性。如果父菜单隐藏，所有子菜单也会隐藏。</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4 max-h-[70vh] overflow-y-auto'>
          <div className='space-y-2'>
            <Label>名称 *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='菜单名称（必填）'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>路径</Label>
              <Input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder='/studio/xxx'
              />
            </div>
            <div className='space-y-2'>
              <Label>父菜单</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder='顶级菜单' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>顶级菜单（无父级）</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>图标</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className='space-y-2'>
            <Label>可见性</Label>
            <Select value={visible} onValueChange={setVisible}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='true'>可见</SelectItem>
                <SelectItem value='false'>隐藏（子菜单也隐藏）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !label.trim()}>
            {update.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Dialog ─────────────────────────────────────────────────────────────

function AddMenuDialog({
  open: controlledOpen,
  onOpenChange,
  parentId
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  parentId?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const create = useMutationToast({
    ...createMenuMutation,
    successMsg: '菜单已创建',
    errorMsg: '创建失败'
  });
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [icon, setIcon] = useState('');

  function handleSave() {
    if (!label.trim()) return;
    create.mutate(
      {
        parentId,
        label: label.trim(),
        href: href || undefined,
        icon: icon || undefined
      },
      {
        onSuccess: () => {
          setOpen(false);
          setLabel('');
          setHref('');
          setIcon('');
        }
      }
    );
  }

  return (
    <>
      {controlledOpen === undefined && (
        <Button size='sm' onClick={() => setOpen(true)}>
          <Icons.add className='mr-1 h-3.5 w-3.5' /> 新增
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{parentId ? '新增子菜单' : '新增顶级菜单'}</DialogTitle>
            <DialogDescription>
              {parentId
                ? '在当前菜单下添加子菜单项。子菜单的路径建议以父菜单路径开头。'
                : '添加顶级菜单项。顶级菜单会显示在侧边栏的一级导航中。'}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='菜单名称（必填）'
              />
            </div>
            <div className='space-y-2'>
              <Label>路径</Label>
              <Input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder={parentId ? '/studio/parent/child' : '/studio/xxx'}
              />
            </div>
            <div className='space-y-2'>
              <Label>图标</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={create.isPending || !label.trim()}>
              {create.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
