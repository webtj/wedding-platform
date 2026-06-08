'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { MaterialCategory, Material } from '../api/types';
import { isBuiltIn } from '../api/types';
import { MatChip } from './mat-chip';
import { QuickAddMat } from './quick-add-mat';

export function CategoryCard({
  category,
  forceExpand,
  search,
  missingOnly,
  onEdit,
  onDeleteRequest,
  onAddMaterial,
  onEditMaterial
}: {
  category: MaterialCategory;
  forceExpand: boolean;
  search: string;
  missingOnly: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onAddMaterial: () => void;
  onEditMaterial: (m: Material) => void;
}) {
  const [open, setOpen] = useState(true);
  const prevForceRef = useRef(forceExpand);

  useEffect(() => {
    if (forceExpand !== prevForceRef.current) {
      setOpen(forceExpand);
      prevForceRef.current = forceExpand;
    }
  }, [forceExpand]);

  const expanded = open;
  const builtIn = isBuiltIn(category);
  const all = category.materials ?? [];
  const searchLower = search.toLowerCase();
  const categoryMatches = search && category.name.toLowerCase().includes(searchLower);
  let materials = all;
  if (search) {
    materials = categoryMatches
      ? all
      : all.filter((m) => m.name.toLowerCase().includes(searchLower));
  }
  if (missingOnly) {
    materials = materials.filter((m) => m.status === 'missing');
  }
  const avail = all.filter((m) => m.status === 'available').length;
  const pct = all.length > 0 ? Math.round((avail / all.length) * 100) : 0;

  if (search && !categoryMatches && materials.length === 0) return null;
  if (missingOnly && materials.length === 0 && !search) return null;

  function handleHeaderKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!open);
    }
  }

  return (
    <Card className='py-3 gap-3'>
      <CardHeader className='pb-0'>
        <div
          className='flex items-center gap-3 cursor-pointer select-none'
          onClick={() => setOpen(!open)}
          onKeyDown={handleHeaderKey}
          role='button'
          tabIndex={0}
          aria-expanded={expanded}
        >
          <Icons.chevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-3 flex-wrap'>
              <div className='flex items-baseline gap-2 min-w-0'>
                <span className='font-semibold text-sm truncate'>{category.name}</span>
                {builtIn && (
                  <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>
                    内置
                  </Badge>
                )}
                <span className='text-xs text-muted-foreground whitespace-nowrap'>
                  {materials.length} 件
                </span>
              </div>
              {all.length > 0 && (
                <div className='flex items-center gap-2'>
                  <div className='w-[80px] h-1 rounded-full bg-secondary overflow-hidden'>
                    <div
                      className='h-full bg-emerald-500 rounded-full transition-all duration-500'
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className='text-xs text-muted-foreground tabular-nums whitespace-nowrap'>
                    {avail}/{all.length} 已有
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className='flex items-center gap-0.5 flex-shrink-0'>
            {!builtIn && <QuickAddMat catId={category.id} />}
            {!builtIn && (
              <Button variant='ghost' size='sm' className='h-7 text-xs' onClick={onAddMaterial}>
                <Icons.add className='h-3 w-3' />
              </Button>
            )}
            {!builtIn && (
              <Button variant='ghost' size='sm' className='h-7 text-xs' onClick={onEdit}>
                <Icons.edit className='h-3 w-3' />
              </Button>
            )}
            {!builtIn && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-destructive'
                onClick={onDeleteRequest}
              >
                <Icons.trash className='h-3 w-3' />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'>
            {materials.map((m) => (
              <MatChip
                key={m.id}
                material={m}
                categoryId={category.id}
                onEdit={() => onEditMaterial(m)}
              />
            ))}
            {materials.length === 0 && !search && (
              <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>
                暂无物料
              </p>
            )}
            {materials.length === 0 && search && (
              <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>
                未找到匹配的物料
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
