'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial
} from '@/features/materials/api/service';
import type { Material, MaterialCategory } from '@/features/materials/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';

const catKeys = { all: ['material-categories'] as const };
const matKeys = { all: ['materials'] as const };
const catQ = queryOptions({ queryKey: catKeys.all, queryFn: getCategories });
const crCat = mutationOptions({
  mutationFn: (d: Parameters<typeof createCategory>[0]) => createCategory(d),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: catKeys.all })
});
const upCat = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) =>
    updateCategory(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: catKeys.all })
});
const dlCat = mutationOptions({
  mutationFn: (id: string) => deleteCategory(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: catKeys.all })
});
const crMat = mutationOptions({
  mutationFn: (d: Parameters<typeof createMaterial>[0]) => createMaterial(d),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: matKeys.all })
});
const upMat = mutationOptions({
  mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMaterial>[1] }) =>
    updateMaterial(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: matKeys.all })
});
const dlMat = mutationOptions({
  mutationFn: (id: string) => deleteMaterial(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: matKeys.all })
});

export default function MaterialsPage() {
  const { data: categories, isLoading } = useQuery(catQ);
  const [allExpanded, setAllExpanded] = useState(false);
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<MaterialCategory | null>(null);
  const [addMatOpen, setAddMatOpen] = useState<string | null>(null);
  const [editMat, setEditMat] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const deleteCatConfirm = useMutationToast({ ...dlCat, successMsg: '分类已删除' });

  const createCat = useMutationToast({ ...crCat, successMsg: '分类已创建' });
  const updateCat = useMutationToast({ ...upCat, successMsg: '已更新' });
  const createMat = useMutationToast({ ...crMat, successMsg: '物料已添加' });
  const updateMat = useMutationToast({ ...upMat, successMsg: '已更新' });
  const deleteMat = useMutationToast({ ...dlMat, successMsg: '物料已删除' });

  if (isLoading || !categories)
    return <div className='py-16 text-center text-sm text-muted-foreground'>加载中...</div>;

  return (
    <PageContainer pageTitle='物料管理'>
      <div className='space-y-3'>
        {/* Top bar */}
        <div className='flex items-center gap-3'>
          <Button size='sm' variant='outline' onClick={() => setAllExpanded(!allExpanded)}>
            {allExpanded ? (
              <Icons.chevronsUpDown className='mr-1 h-3.5 w-3.5' />
            ) : (
              <Icons.chevronsUpDown className='mr-1 h-3.5 w-3.5' />
            )}
            {allExpanded ? '全部折叠' : '全部展开'}
          </Button>
          <div className='relative flex-1 max-w-xs'>
            <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索物料...'
              className='pl-9 h-8'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className='flex-1' />
          <Button size='sm' onClick={() => setCreateCatOpen(true)}>
            <Icons.add className='mr-1.5 h-3.5 w-3.5' />
            添加分类
          </Button>
        </div>

        {/* Category cards */}
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            forceExpand={allExpanded}
            onEdit={() => setEditCat(cat)}
            onDeleteRequest={() => setDeleteCatId(cat.id)}
            onEditMat={setEditMat}
            updateMat={updateMat}
            deleteMat={deleteMat}
            search={search}
          />
        ))}

        {categories.length === 0 && (
          <div className='py-16 text-center border-2 border-dashed rounded-xl'>
            <p className='text-sm text-muted-foreground mb-2'>暂无物料分类</p>
            <Button size='sm' onClick={() => setCreateCatOpen(true)}>
              创建第一个分类
            </Button>
          </div>
        )}
      </div>

      <CategoryDialog
        open={createCatOpen}
        onOpenChange={setCreateCatOpen}
        onSave={(d) => createCat.mutate(d, { onSuccess: () => setCreateCatOpen(false) })}
      />
      {editCat && (
        <CategoryDialog
          open
          onOpenChange={() => setEditCat(null)}
          initial={editCat}
          onSave={(d) =>
            updateCat.mutate({ id: editCat.id, data: d }, { onSuccess: () => setEditCat(null) })
          }
        />
      )}
      <Dialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除此分类将同时删除其下所有物料，不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteCatId(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              disabled={deleteCatConfirm.isPending}
              onClick={() =>
                deleteCatConfirm.mutate(deleteCatId!, { onSuccess: () => setDeleteCatId(null) })
              }
            >
              {deleteCatConfirm.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addMatOpen && (
        <MatDialog
          open
          onOpenChange={() => setAddMatOpen(null)}
          categoryId={addMatOpen}
          onSave={(d) =>
            createMat.mutate(
              { ...d, categoryId: addMatOpen },
              { onSuccess: () => setAddMatOpen(null) }
            )
          }
        />
      )}
      {editMat && (
        <MatDialog
          open
          onOpenChange={() => setEditMat(null)}
          initial={editMat}
          onSave={(d) =>
            updateMat.mutate({ id: editMat.id, data: d }, { onSuccess: () => setEditMat(null) })
          }
        />
      )}
    </PageContainer>
  );
}

function CategoryCard({
  cat,
  forceExpand,
  onEdit,
  onDeleteRequest,
  onEditMat,
  updateMat,
  deleteMat,
  search
}: {
  cat: MaterialCategory;
  forceExpand: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onEditMat: (m: Material) => void;
  updateMat: { mutate: (vars: { id: string; data: Partial<Material> }) => void };
  deleteMat: { mutate: (id: string) => void };
  search: string;
}) {
  const [open, setOpen] = useState(true);
  const expanded = forceExpand ? true : open;
  const { data, refetch } = useQuery(
    queryOptions({ queryKey: [...matKeys.all, cat.id], queryFn: () => getMaterials(cat.id) })
  );
  const materials = (data?.items ?? []).filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase())
  );
  const avail = materials.filter((m) => m.status === 'available').length;
  const pct = materials.length > 0 ? Math.round((avail / materials.length) * 100) : 0;

  if (search && materials.length === 0) return null;

  return (
    <div className='border rounded-lg overflow-hidden bg-card'>
      {/* Header */}
      <div
        className='flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none'
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
        role='button'
        tabIndex={0}
      >
        <Icons.chevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
        <div className='flex-1 min-w-0'>
          <div className='flex items-baseline gap-2'>
            <span className='font-semibold text-sm'>{cat.name}</span>
            <span className='text-xs text-muted-foreground'>{materials.length} 件</span>
          </div>
          {materials.length > 0 && (
            <div className='flex items-center gap-2 mt-1'>
              <div className='flex-1 max-w-[100px] h-1 rounded-full bg-secondary overflow-hidden'>
                <div
                  className='h-full bg-emerald-500 rounded-full transition-all duration-500'
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className='text-xs text-muted-foreground tabular-nums'>
                {avail}/{materials.length} 已有
              </span>
            </div>
          )}
        </div>
        <div className='flex items-center gap-0.5' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()} role='button' tabIndex={0}>
          <QuickAddMat catId={cat.id} onAdded={() => refetch()} />
          <Button variant='ghost' size='sm' className='h-7 text-xs' onClick={onEdit}>
            编辑
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs text-destructive'
            onClick={onDeleteRequest}
          >
            删除
          </Button>
        </div>
      </div>

      {/* Materials grid */}
      {expanded && (
        <div className='border-t p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'>
          {materials.map((m) => (
            <MatChip
              key={m.id}
              material={m}
              onToggle={() =>
                updateMat.mutate({
                  id: m.id,
                  data: { status: m.status === 'available' ? 'missing' : 'available' }
                })
              }
              onEdit={() => onEditMat(m)}
              onDelete={() => deleteMat.mutate(m.id)}
            />
          ))}
          {materials.length === 0 && !search && (
            <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>暂无物料</p>
          )}
          {materials.length === 0 && search && (
            <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>
              未找到匹配的物料
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MatChip({
  material,
  onToggle,
  onEdit,
  onDelete
}: {
  material: Material;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAvail = material.status === 'available';

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all hover:shadow-sm ${
        isAvail
          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
          : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
      }`}
      onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      role='button'
      tabIndex={0}
    >
      {isAvail ? (
        <Icons.circleCheck className='h-4 w-4 text-emerald-500 flex-shrink-0' />
      ) : (
        <Icons.circleX className='h-4 w-4 text-amber-500 flex-shrink-0' />
      )}
      <span className='flex-1 truncate text-xs'>{material.name}</span>
      {material.quantity != null && (
        <Badge variant='secondary' className='text-xs px-1.5 py-0 h-5 font-mono flex-shrink-0'>
          {material.quantity}
        </Badge>
      )}
      <div
        className='hidden group-hover:flex items-center gap-0.5 flex-shrink-0'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
        role='button'
        tabIndex={0}
      >
        <Button variant='ghost' size='sm' className='h-5 text-xs px-1' onClick={onEdit}>
          编辑
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-5 text-xs px-1 text-destructive'
          onClick={onDelete}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

function QuickAddMat({ catId, onAdded }: { catId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const add = useMutationToast({ ...crMat, successMsg: '已添加' });
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function save() {
    if (!title.trim()) return;
    add.mutate(
      { categoryId: catId, name: title.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle('');
          onAdded();
        }
      }
    );
  }

  if (!open)
    return (
      <Button
        variant='ghost'
        size='sm'
        className='text-xs text-muted-foreground hover:text-foreground gap-1 h-7'
        onClick={() => setOpen(true)}
      >
        <Icons.add className='h-3 w-3' />
        快速添加
      </Button>
    );

  return (
    <div className='flex items-center gap-2'>
      <Input
        ref={ref}
        placeholder='物料名称，回车创建'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
        className='h-7 text-xs flex-1'
      />
      <Button size='sm' className='h-7 text-xs' onClick={save} disabled={!title.trim()}>
        添加
      </Button>
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MaterialCategory;
  onSave: (d: { name: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  useEffect(() => {
    if (open) setName(initial?.name ?? '');
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑分类' : '添加分类'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label>名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSave({ name: name.trim() })} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatDialog({
  open,
  onOpenChange,
  categoryId: _categoryId,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId?: string;
  initial?: Material;
  onSave: (d: {
    name: string;
    status?: 'available' | 'missing';
    quantity?: number;
    note?: string;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState<'available' | 'missing'>(initial?.status ?? 'missing');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setStatus(initial?.status ?? 'missing');
      setQuantity(initial?.quantity?.toString() ?? '');
      setNote(initial?.note ?? '');
    }
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '编辑物料' : '添加物料'}</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='space-y-2'>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>状态</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'available' | 'missing')}
                className='border-input bg-card text-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm'
              >
                <option value='available'>有了</option>
                <option value='missing'>缺失</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label>数量</Label>
              <Input type='number' value={quantity} onChange={(e) => setQuantity(e.target.value)} />
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
          <Button
            onClick={() =>
              onSave({
                name: name.trim(),
                status,
                quantity: quantity ? +quantity : undefined,
                note: note || undefined
              })
            }
            disabled={!name.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
