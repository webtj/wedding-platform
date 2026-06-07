'use client';

import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  PERMISSION_METADATA,
  groupPermissionsByGroup,
  type PermissionCode
} from '@/lib/permissions';

const GROUP_LABEL: Record<string, string> = {
  platform: '平台',
  tenant: '租户',
  member: '账号',
  role: '角色',
  lead: '意向单',
  project: '项目',
  scene: '场景',
  contract: '合同',
  task: '任务',
  asset: '素材',
  timeline: '日程',
  ai: 'AI',
  notification: '通知',
  template: '生图模板',
  material: '物料',
  material_type: '素材类型',
  tenant_root: '租户'
};

export function PermissionMultiSelect({
  value,
  onChange,
  disabled
}: {
  value: PermissionCode[];
  onChange: (next: PermissionCode[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const groups = useMemo(() => groupPermissionsByGroup(), []);

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return groups;
    const q = filter.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        codes: g.codes.filter(
          (c) =>
            c.toLowerCase().includes(q) ||
            (PERMISSION_METADATA[c]?.description ?? '').toLowerCase().includes(q)
        )
      }))
      .filter((g) => g.codes.length > 0);
  }, [filter, groups]);

  function toggle(code: PermissionCode) {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  }

  function selectAllInGroup(codes: PermissionCode[]) {
    const next = new Set(value);
    for (const c of codes) next.add(c);
    onChange(Array.from(next));
  }

  function clearGroup(codes: PermissionCode[]) {
    const next = value.filter((c) => !codes.includes(c));
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className='h-auto min-h-9 w-full justify-between px-3 py-1.5'
        >
          <div className='flex flex-1 flex-wrap items-center gap-1 overflow-hidden'>
            {value.length === 0 ? (
              <span className='text-muted-foreground text-sm'>未选择权限</span>
            ) : value.length <= 3 ? (
              value.map((c) => (
                <Badge key={c} variant='secondary' className='font-mono text-xs'>
                  {c}
                </Badge>
              ))
            ) : (
              <>
                <Badge variant='secondary' className='font-mono text-xs'>
                  {value[0]}
                </Badge>
                <Badge variant='secondary' className='text-xs'>
                  +{value.length - 1} 个
                </Badge>
              </>
            )}
          </div>
          <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[420px] p-0' align='start'>
        <div className='border-b p-2'>
          <Input
            placeholder='搜索权限码或描述…'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className='h-8'
          />
        </div>
        <ScrollArea className='h-[360px]'>
          <div className='space-y-3 p-3'>
            {filteredGroups.length === 0 ? (
              <div className='text-muted-foreground py-6 text-center text-sm'>
                没有匹配的权限
              </div>
            ) : (
              filteredGroups.map((g) => {
                const allSelected = g.codes.every((c) => value.includes(c));
                const someSelected =
                  !allSelected && g.codes.some((c) => value.includes(c));
                return (
                  <div key={g.group} className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <div className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                        {GROUP_LABEL[g.group] ?? g.group}
                      </div>
                      <button
                        type='button'
                        onClick={() =>
                          allSelected ? clearGroup(g.codes) : selectAllInGroup(g.codes)
                        }
                        className='text-muted-foreground hover:text-foreground text-xs'
                      >
                        {allSelected ? '清空' : '全选'}
                      </button>
                    </div>
                    <div className='space-y-0.5'>
                      {g.codes.map((code) => {
                        const meta = PERMISSION_METADATA[code];
                        const checked = value.includes(code);
                        return (
                          <div
                            key={code}
                            className={cn(
                              'hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm'
                            )}
                            role='button'
                            tabIndex={0}
                            onClick={() => toggle(code)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                toggle(code);
                              }
                            }}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(code)}
                              onClick={(e) => e.stopPropagation()}
                              className='mt-0.5'
                            />
                            <div className='flex-1 space-y-0.5'>
                              <div className='flex items-center gap-1.5'>
                                <code className='bg-muted rounded px-1 py-0.5 font-mono text-xs'>
                                  {code}
                                </code>
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                {meta?.description ?? ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {someSelected && (
                      <div className='border-t pt-1' />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
