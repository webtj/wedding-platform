'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMutationToast } from '@/lib/use-mutation-toast';
import {
  categoriesQueryOptions,
  createCategoryMutation,
  updateCategoryMutation,
  deleteCategoryMutation,
  createMaterialMutation,
  updateMaterialMutation
} from '../api/queries';
import type { Material, MaterialCategory } from '../api/types';
import { CategoryCard } from './category-card';
import { CategoryDialog } from './category-dialog';
import { MatDialog } from './mat-dialog';

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MaterialsPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const [allExpanded, setAllExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<MaterialCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [addMatCatId, setAddMatCatId] = useState<string | null>(null);
  const [editMat, setEditMat] = useState<Material | null>(null);

  const createCat = useMutationToast({ ...createCategoryMutation, successMsg: '分类已创建' });
  const updateCat = useMutationToast({ ...updateCategoryMutation, successMsg: '已更新' });
  const deleteCat = useMutationToast({ ...deleteCategoryMutation, successMsg: '分类已删除' });
  const createMat = useMutationToast({ ...createMaterialMutation, successMsg: '物料已添加' });
  const updateMat = useMutationToast({ ...updateMaterialMutation, successMsg: '已更新' });

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-3'>
        <Button size='sm' variant='outline' onClick={() => setAllExpanded(!allExpanded)}>
          {allExpanded ? (
            <Icons.chevronsUp className='mr-1 h-3.5 w-3.5' />
          ) : (
            <Icons.chevronsDown className='mr-1 h-3.5 w-3.5' />
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
            aria-label='搜索物料'
          />
        </div>
        <div className='flex-1' />
        <Button size='sm' onClick={() => setCreateCatOpen(true)}>
          <Icons.add className='mr-1.5 h-3.5 w-3.5' />
          添加分类
        </Button>
      </div>

      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          forceExpand={allExpanded}
          search={debouncedSearch}
          onEdit={() => setEditCat(cat)}
          onDeleteRequest={() => setDeleteCatId(cat.id)}
          onAddMaterial={() => setAddMatCatId(cat.id)}
          onEditMaterial={setEditMat}
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
              isLoading={deleteCat.isPending}
              onClick={() => deleteCat.mutate(deleteCatId!, { onSuccess: () => setDeleteCatId(null) })}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addMatCatId && (
        <MatDialog
          open
          onOpenChange={() => setAddMatCatId(null)}
          onSave={(d) =>
            createMat.mutate(
              { ...d, categoryId: addMatCatId },
              { onSuccess: () => setAddMatCatId(null) }
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
    </div>
  );
}
