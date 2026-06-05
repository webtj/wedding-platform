'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getCategories, getMaterials } from '@/features/materials/api/service';
import type { Material, MaterialCategory } from '@/features/materials/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string;
  linkedIds: Set<string>;
  onLinked: () => void;
};

export function MaterialPickerDialog({ open, onOpenChange, taskId, linkedIds, onLinked }: Props) {
  const { data: categories } = useQuery(
    queryOptions({
      queryKey: ['material-categories'],
      queryFn: () => getCategories(),
      enabled: open
    })
  );
  const { data: matData } = useQuery(
    queryOptions({
      queryKey: ['materials', 'all'],
      queryFn: () => getMaterials(undefined, 1, 500),
      enabled: open
    })
  );
  const [category, setCategory] = useState('__all__');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cats: MaterialCategory[] = categories ?? [];
  const filtered = (matData?.items ?? []).filter((m: Material) => {
    if (linkedIds.has(m.id)) return false;
    if (search) {
      if (!m.name.toLowerCase().includes(search.toLowerCase())) return false;
    } else {
      if (category !== '__all__' && m.categoryId !== category) return false;
    }
    return true;
  });
  const filteredIds = new Set(filtered.map((m: Material) => m.id));
  const selectedInFilter = [...selected].filter((id) => filteredIds.has(id));
  const allSelected = filtered.length > 0 && selectedInFilter.length === filtered.length;
  const someSelected = selectedInFilter.length > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((m: Material) => n.delete(m.id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        filtered.forEach((m: Material) => n.add(m.id));
        return n;
      });
    }
  }

  function save() {
    if (selected.size === 0) return;
    Promise.all(
      [...selected].map((mid) =>
        apiClient(`/tasks/${taskId}/materials`, {
          method: 'POST',
          body: JSON.stringify({ materialId: mid })
        })
      )
    ).then(() => {
      onLinked();
      onOpenChange(false);
      setSelected(new Set());
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl flex flex-col' style={{ height: '70vh' }}>
        <DialogHeader>
          <DialogTitle>关联物料</DialogTitle>
        </DialogHeader>
        <div className='flex gap-4 flex-1 min-h-0 overflow-hidden'>
          {/* Left: categories */}
          <div className='w-36 flex-shrink-0 space-y-0.5 overflow-y-auto h-full'>
            <button
              onClick={() => setCategory('__all__')}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${category === '__all__' || search ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}
            >
              全部
            </button>
            {cats.map((c: MaterialCategory) => (
              <button
                key={c.id}
                onClick={() => {
                  setCategory(c.id);
                  setSearch('');
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${category === c.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Right: material list + search */}
          <div className='flex-1 flex flex-col min-h-0'>
            <div className='relative mb-3'>
              <Icons.search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='搜索物料...'
                className='pl-8 h-8 text-xs'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className='flex-1 overflow-y-auto space-y-1 pr-1'>
              {filtered.map((m: Material) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors hover:bg-secondary/30 ${selected.has(m.id) ? 'bg-primary/5 border-primary/30' : ''}`}
                >
                  <input
                    type='checkbox'
                    checked={selected.has(m.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(m.id)) n.delete(m.id);
                        else n.add(m.id);
                        return n;
                      })
                    }
                    aria-label={`选择 ${m.name}`}
                    className='w-3.5 h-3.5 rounded accent-primary'
                  />
                  <span className='flex-1 truncate'>{m.name}</span>
                  {m.quantity != null && (
                    <span className='text-[10px] text-muted-foreground font-mono flex-shrink-0'>
                      x{m.quantity}
                    </span>
                  )}
                  <span
                    className={`text-[10px] flex-shrink-0 ${m.status === 'available' ? 'text-stone-500' : 'text-red-500'}`}
                  >
                    {m.status === 'available' ? '已有' : '缺失'}
                  </span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className='text-xs text-muted-foreground py-8 text-center'>无匹配物料</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className='flex items-center gap-2'>
          <span className='text-xs text-muted-foreground flex-1'>已选 {selected.size} 件</span>
          <Button
            variant='outline'
            size='sm'
            onClick={toggleSelectAll}
            className={someSelected ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}
          >
            {allSelected
              ? '取消全选'
              : someSelected
                ? `全选 (${filtered.length})`
                : `全选 (${filtered.length})`}
          </Button>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size='sm' onClick={save} disabled={selected.size === 0}>
            保存 ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
