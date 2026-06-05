'use client';

import { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { MATERIAL_CATEGORIES, getMaterialsByCategory } from '../constants/materials';
import { useSceneStore } from '../store/scene-store';
import type { MaterialCategory, MaterialDef } from '../api/types';

interface MaterialPanelProps {
  className?: string;
}

export function MaterialPanel({ className }: MaterialPanelProps) {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('stage');
  const addObject = useSceneStore((s) => s.addObject);

  const materials = getMaterialsByCategory(activeCategory);

  const handleDragStart = useCallback(
    (e: React.DragEvent, material: MaterialDef) => {
      e.dataTransfer.setData('application/material', JSON.stringify(material));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const handleClick = useCallback(
    (material: MaterialDef) => {
      const venue = useSceneStore.getState().venue;
      addObject({
        type: material.type,
        category: material.category,
        name: material.name,
        position: {
          x: (venue.width - material.defaultSize.width) / 2,
          y: (venue.depth - material.defaultSize.depth) / 2
        },
        size: material.defaultSize,
        rotation: 0,
        layerId: material.category === 'table' ? 'tables' : material.category,
        locked: false,
        visible: true,
        style: { color: material.color },
        business: material.business ?? {}
      });
    },
    [addObject]
  );

  return (
    <div className={cn('flex flex-col border-r bg-background', className)}>
      <div className='shrink-0 border-b px-3 py-2'>
        <h3 className='text-xs font-semibold'>物料库</h3>
      </div>

      <div className='flex shrink-0 gap-0.5 border-b px-2 py-1'>
        {MATERIAL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type='button'
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] transition-colors',
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <ScrollArea className='flex-1'>
        <div className='grid grid-cols-2 gap-2 p-2'>
          {materials.map((mat) => (
            <div
              key={mat.type}
              draggable
              onDragStart={(e) => handleDragStart(e, mat)}
              onClick={() => handleClick(mat)}
              onKeyDown={(e) => e.key === 'Enter' && handleClick(mat)}
              role='button'
              tabIndex={0}
              className='group flex cursor-grab flex-col items-center gap-1 rounded-lg border bg-card p-2 transition-all hover:border-primary hover:shadow-sm active:cursor-grabbing'
              title={`${mat.name} (${mat.defaultSize.width}×${mat.defaultSize.depth}m)`}
            >
              <div
                className='flex size-10 items-center justify-center rounded-md'
                style={{ backgroundColor: mat.color + '33' }}
              >
                <Icons.product className='size-5 text-muted-foreground group-hover:text-primary' />
              </div>
              <span className='text-[11px] font-medium'>{mat.name}</span>
              <span className='text-muted-foreground text-[9px]'>
                {mat.defaultSize.width}×{mat.defaultSize.depth}m
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
