'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import type { Icon as TablerIcon } from '@/components/icons';
import {
  IconRuler2,
  IconPencilPlus,
  IconCake,
  IconHandStop,
  IconTable,
  IconWallpaper,
  IconSticker,
  IconDeviceProjector,
  IconBook,
  IconGift,
  IconMail,
  IconClipboardList,
  IconFlower,
  IconBalloon,
  IconConfetti,
  IconGlassChampagne,
  IconCandle,
  IconButterfly,
  IconDiamond,
  IconPennant,
  IconAlbum,
  IconCamera,
  IconAward,
  IconTicket,
  IconTag,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { MaterialType, ManagerMode, SizeOption } from '../api/types';
import { getMaterialTypes, createMaterialType, updateMaterialType, deleteMaterialType, getTenants } from '../api/service';

// -- Icons --
const ICON_OPTIONS: { icon: TablerIcon; label: string; value: string }[] = [
  { icon: Icons.heart, label: '爱心', value: '💍' },
  { icon: IconDiamond, label: '钻戒', value: '💎' },
  { icon: Icons.pro, label: '皇冠', value: '👑' },
  { icon: IconGlassChampagne, label: '香槟杯', value: '🥂' },
  { icon: IconConfetti, label: '彩带', value: '🎊' },
  { icon: IconBalloon, label: '气球', value: '🎈' },
  { icon: Icons.notification, label: '铃铛', value: '🔔' },
  { icon: IconCandle, label: '蜡烛', value: '🕯️' },
  { icon: IconPennant, label: '旗帜', value: '🎏' },
  { icon: IconFlower, label: '花朵', value: '🌸' },
  { icon: Icons.leaf, label: '绿叶', value: '🍃' },
  { icon: IconButterfly, label: '蝴蝶', value: '🦋' },
  { icon: IconCake, label: '蛋糕', value: '🍽️' },
  { icon: IconGift, label: '礼物', value: '🍬' },
  { icon: IconMail, label: '信件', value: '💌' },
  { icon: IconHandStop, label: '手卡', value: '🤚' },
  { icon: IconSticker, label: '贴纸', value: '✨' },
  { icon: IconTicket, label: '票券', value: '🎫' },
  { icon: IconTag, label: '吊牌', value: '🏷️' },
  { icon: Icons.bookmark, label: '书签', value: '🔖' },
  { icon: IconAward, label: '奖章', value: '🏅' },
  { icon: IconWallpaper, label: '背景墙', value: '🖼️' },
  { icon: IconTable, label: '桌卡', value: '📋' },
  { icon: IconAlbum, label: '相册', value: '📖' },
  { icon: Icons.frame, label: '相框', value: '🪟' },
  { icon: IconDeviceProjector, label: '投影', value: '📽️' },
  { icon: IconClipboardList, label: '清单', value: '📝' },
  { icon: Icons.media, label: '照片', value: '📷' },
  { icon: IconCamera, label: '相机', value: '📸' },
  { icon: Icons.music, label: '音乐', value: '🎵' },
  { icon: IconBook, label: '书本', value: '📖' },
  { icon: Icons.palette, label: '调色盘', value: '🎨' },
  { icon: Icons.brush, label: '画笔', value: '🖌️' },
  { icon: Icons.scissors, label: '剪刀', value: '✂️' },
  { icon: Icons.ruler, label: '尺子', value: '📏' },
  { icon: Icons.wand, label: '魔法棒', value: '🪄' },
  { icon: Icons.sparkles, label: '星光', value: '✨' },
  { icon: Icons.calendar, label: '日历', value: '📅' },
  { icon: Icons.clock, label: '时钟', value: '🕐' },
  { icon: Icons.map, label: '地图', value: '🗺️' },
  { icon: Icons.home, label: '场地', value: '🏠' },
  { icon: Icons.sun, label: '太阳', value: '☀️' },
  { icon: Icons.star, label: '星星', value: '⭐' },
  { icon: Icons.post, label: '文件', value: '📄' }
];

const ICON_MAP: Record<string, TablerIcon> = Object.fromEntries(
  ICON_OPTIONS.map((opt) => [opt.value, opt.icon])
);

function getIcon(iconStr?: string): TablerIcon {
  return (iconStr ? ICON_MAP[iconStr] : undefined) ?? Icons.post;
}

const CODE_REGEX = /^[a-z][a-z0-9_]*$/;
const PAGE_SIZE = 20;
const MAX_SIZES = 4; // 1 default + 3 additional

function getDefaultSize(item: MaterialType): SizeOption | null {
  if (item.sizes && item.sizes.length > 0) return item.sizes[0];
  if (item.defaultSize) return item.defaultSize;
  return null;
}

function getAllSizes(item: MaterialType): SizeOption[] {
  if (item.sizes && item.sizes.length > 0) return item.sizes;
  if (item.defaultSize) return [item.defaultSize];
  return [];
}

// -- Card --
function MaterialTypeCard({
  item,
  canEdit,
  onEdit,
  onDelete
}: {
  item: MaterialType;
  canEdit: boolean;
  onEdit: (item: MaterialType) => void;
  onDelete: (item: MaterialType) => void;
}) {
  const IconComp = getIcon(item.icon);
  const defaultSz = getDefaultSize(item);

  return (
    <Card className='group gap-0 py-0 overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm'>
      <CardContent className='flex items-center gap-3 p-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <IconComp className='size-5 text-primary' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>{item.name}</p>
          <p className='text-muted-foreground font-mono text-[10px] tracking-wide'>{item.code}</p>
        </div>
        {item.tenant && (
          <span className='text-muted-foreground text-[10px] truncate max-w-[60px]'>{item.tenant.name}</span>
        )}
        {defaultSz && (
          <div className='text-muted-foreground flex items-center gap-1 text-[10px]'>
            <IconRuler2 className='size-3' />
            <span>{defaultSz.width}x{defaultSz.height}</span>
          </div>
        )}
        <Badge variant='outline' className={cn('text-[10px] px-1.5 py-0 h-4', item.isSystem && 'bg-muted text-muted-foreground border-muted-foreground/20')}>
          {item.isSystem ? '内置' : '自定义'}
        </Badge>
        {canEdit && (
          <div className='flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100'>
            <Button variant='ghost' size='icon' className='size-6' onClick={() => onEdit(item)}>
              <Icons.edit className='size-3' />
            </Button>
            <Button variant='ghost' size='icon' className='size-6 text-destructive' onClick={() => onDelete(item)}>
              <Icons.trash className='size-3' />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -- Main --
export default function MaterialTypesManager({ mode }: { mode: ManagerMode }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('__all__');
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<MaterialType[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialType | null>(null);
  const [deletingItem, setDeletingItem] = useState<MaterialType | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formIconIdx, setFormIconIdx] = useState(0);
  const [formSizes, setFormSizes] = useState<SizeOption[]>([]);
  const [formError, setFormError] = useState('');

  const isSuper = mode === 'super';
  const apiBase = isSuper ? '/super/material-types' : '/material-types';

  const { data: tenantsData } = useQuery({
    queryKey: ['super-tenants-list'],
    queryFn: () => getTenants(),
    enabled: isSuper
  });

  const debounced = useDebouncedCallback((val: string) => {
    setDebouncedSearch(val);
    setPage(1);
  }, 400);

  const onSearchChange = useCallback((val: string) => {
    setSearch(val);
    debounced(val);
  }, [debounced]);

  const onTenantChange = useCallback((val: string) => {
    setTenantFilter(val);
    setPage(1);
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [apiBase, tenantFilter, debouncedSearch, page],
    queryFn: () => getMaterialTypes(mode, {
      page,
      pageSize: PAGE_SIZE,
      tenantId: isSuper && tenantFilter !== '__all__' ? tenantFilter : undefined,
      search: debouncedSearch || undefined,
    }),
    placeholderData: keepPreviousData
  });

  // Accumulate pages
  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllItems(data.items);
    } else {
      setAllItems((prev) => {
        const existing = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !existing.has(i.id))];
      });
    }
  }, [data, page]);

  const total = data?.total ?? 0;
  const hasMore = data ? allItems.length < data.total : false;

  // Infinite scroll — observer only fires when loader enters viewport
  useEffect(() => {
    const el = loaderRef.current;
    if (!el || !hasMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetching, allItems.length]);

  const stats = useMemo(() => ({
    system: allItems.filter((m) => m.isSystem).length,
    custom: allItems.filter((m) => !m.isSystem).length,
    total
  }), [allItems, total]);

  const canEditItem = useCallback((item: MaterialType): boolean => {
    if (isSuper) return item.isSystem;
    return !item.isSystem;
  }, [isSuper]);

  // -- Form --
  const resetForm = useCallback(() => {
    setFormName(''); setFormCode(''); setFormIconIdx(0);
    setFormSizes([]); setFormError(''); setEditingItem(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setFormSizes([{ width: 100, height: 150 }]);
    setFormOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((item: MaterialType) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    const idx = ICON_OPTIONS.findIndex((opt) => opt.value === item.icon);
    setFormIconIdx(idx >= 0 ? idx : 0);
    const sizes = getAllSizes(item);
    setFormSizes(sizes.length > 0 ? sizes.slice(0, MAX_SIZES) : [{ width: 100, height: 150 }]);
    setFormError('');
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((item: MaterialType) => {
    setDeletingItem(item); setDeleteOpen(true);
  }, []);

  const addSize = useCallback(() => {
    setFormSizes((prev) => prev.length < MAX_SIZES ? [...prev, { width: 100, height: 150 }] : prev);
  }, []);

  const removeSize = useCallback((idx: number) => {
    setFormSizes((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateSize = useCallback((idx: number, field: 'width' | 'height', value: number) => {
    setFormSizes((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }, []);

  const refreshList = useCallback(() => {
    setFormOpen(false);
    resetForm();
    setPage(1);
    queryClient.invalidateQueries({ queryKey: [apiBase] });
  }, [resetForm, queryClient, apiBase]);

  const handleSave = useCallback(async () => {
    const name = formName.trim();
    const code = formCode.trim();

    if (!name) { setFormError('请输入素材名称'); return; }
    if (!code) { setFormError('请输入素材代码'); return; }
    if (!CODE_REGEX.test(code)) { setFormError('代码格式错误'); return; }
    if (formSizes.length === 0) { setFormError('至少需要一个尺寸'); return; }
    for (const s of formSizes) {
      if (!s.width || s.width < 1 || !s.height || s.height < 1) {
        setFormError('尺寸宽高必须大于 0'); return;
      }
    }

    const dup = allItems.find((m) => m.code === code && m.id !== editingItem?.id);
    if (dup) { setFormError('素材代码已存在'); return; }

    const selectedIcon = ICON_OPTIONS[formIconIdx]?.value ?? ICON_OPTIONS[0].value;
    const defaultSize = { width: formSizes[0].width, height: formSizes[0].height };

    try {
      if (editingItem) {
        await updateMaterialType(mode, editingItem.id, { name, icon: selectedIcon, defaultSize, sizes: formSizes });
      } else {
        await createMaterialType(mode, { name, code, icon: selectedIcon, defaultSize, sizes: formSizes });
      }
      refreshList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    }
  }, [formName, formCode, formIconIdx, formSizes, editingItem, allItems, mode, refreshList]);

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await deleteMaterialType(mode, deletingItem.id);
      setDeleteOpen(false); setDeletingItem(null);
      refreshList();
    } catch {}
  }, [deletingItem, mode, refreshList]);

  const isEditing = editingItem !== null;

  return (
    <div className='flex flex-col gap-4'>
      {/* Stats */}
      <div className='grid grid-cols-3 gap-3'>
        <Card className='gap-0 py-0'>
          <CardContent className='flex items-center gap-3 p-3'>
            <div className='bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex size-8 items-center justify-center rounded-md'>
              <Icons.product className='size-4' />
            </div>
            <div>
              <p className='text-lg font-bold leading-tight'>{stats.system}</p>
              <p className='text-muted-foreground text-[10px]'>系统内置</p>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-0 py-0'>
          <CardContent className='flex items-center gap-3 p-3'>
            <div className='bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex size-8 items-center justify-center rounded-md'>
              <IconPencilPlus className='size-4' />
            </div>
            <div>
              <p className='text-lg font-bold leading-tight'>{stats.custom}</p>
              <p className='text-muted-foreground text-[10px]'>自定义</p>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-0 py-0'>
          <CardContent className='flex items-center gap-3 p-3'>
            <div className='bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex size-8 items-center justify-center rounded-md'>
              <Icons.product className='size-4' />
            </div>
            <div>
              <p className='text-lg font-bold leading-tight'>{stats.total}</p>
              <p className='text-muted-foreground text-[10px]'>总计</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
          <Input placeholder='搜索素材名称...' value={search} onChange={(e) => onSearchChange(e.target.value)} className='h-8 pl-8 text-sm' />
        </div>
        {isSuper && (
          <Select value={tenantFilter} onValueChange={onTenantChange}>
            <SelectTrigger className='h-8 w-[160px] text-sm'>
              <SelectValue placeholder='全部租户' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>全部</SelectItem>
              <SelectItem value='__platform__'>系统内置</SelectItem>
              {tenantsData?.items?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size='sm' onClick={openAdd} className='h-8'>
          <Icons.add className='size-3.5' /> 新增
        </Button>
      </div>

      {/* Cards */}
      {isLoading && allItems.length === 0 ? (
        <div className='py-12 text-center text-muted-foreground text-sm'>加载中...</div>
      ) : allItems.length === 0 ? (
        <div className='py-12 text-center'>
          <Icons.search className='text-muted-foreground/50 mx-auto mb-3 size-8' />
          <p className='text-muted-foreground text-sm'>没有找到匹配的素材类型</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {allItems.map((item) => (
            <MaterialTypeCard key={item.id} item={item} canEdit={canEditItem(item)} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={loaderRef} className='py-4 text-center text-muted-foreground text-xs'>
          {isFetching ? '加载中...' : '滚动加载更多'}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[85vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑素材类型' : '新增素材类型'}</DialogTitle>
            <DialogDescription>
              {isSuper
                ? (isEditing ? '修改系统内置素材类型。' : '添加新的系统内置素材类型。')
                : (isEditing ? '修改自定义素材类型。' : '添加新的自定义素材类型。')
              }
            </DialogDescription>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto space-y-4 pr-1'>
            {/* Name + Code row */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <Label>素材名称</Label>
                <Input placeholder='如：誓言卡' value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label>素材代码</Label>
                <Input placeholder='如：vow_card' value={formCode} onChange={(e) => setFormCode(e.target.value)} disabled={isEditing} className={cn('font-mono', isEditing && 'opacity-50')} />
              </div>
            </div>

            {/* Icons */}
            <div className='flex flex-col gap-2'>
              <Label>图标</Label>
              <div className='max-h-40 overflow-y-auto rounded-lg border p-2'>
                <div className='flex flex-wrap gap-2'>
                  {ICON_OPTIONS.map((opt, idx) => {
                    const Ic = opt.icon;
                    return (
                      <button key={opt.label} type='button' onClick={() => setFormIconIdx(idx)} className={cn('flex size-9 items-center justify-center rounded-lg border-2 transition-all', idx === formIconIdx ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:border-primary/50 hover:bg-accent')} title={opt.label}>
                        <Ic className='size-4' />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sizes */}
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <Label>尺寸列表（mm）</Label>
                {formSizes.length < MAX_SIZES && (
                  <Button type='button' variant='ghost' size='sm' className='h-6 gap-1 text-xs' onClick={addSize}>
                    <Icons.add className='size-3' /> 添加
                  </Button>
                )}
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {formSizes.map((sz, idx) => (
                  <div key={idx} className='flex items-center gap-1.5 rounded-md border px-2 py-1.5'>
                    {idx === 0 ? (
                      <Badge variant='default' className='text-[9px] px-1 py-0 h-3.5 shrink-0'>默认</Badge>
                    ) : (
                      <span className='text-muted-foreground text-[9px] shrink-0'>{idx + 1}.</span>
                    )}
                    <Input type='number' min={1} value={sz.width} onChange={(e) => updateSize(idx, 'width', Number(e.target.value))} className='h-7 flex-1 text-xs border-0 p-0 text-center' />
                    <span className='text-muted-foreground text-[10px]'>x</span>
                    <Input type='number' min={1} value={sz.height} onChange={(e) => updateSize(idx, 'height', Number(e.target.value))} className='h-7 flex-1 text-xs border-0 p-0 text-center' />
                    {formSizes.length > 1 && (
                      <Button type='button' variant='ghost' size='icon' className='size-5 shrink-0 text-destructive' onClick={() => removeSize(idx)}>
                        <Icons.close className='size-2.5' />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className='text-destructive flex items-center gap-1.5 text-sm'>
                <Icons.warning className='size-4' />{formError}
              </p>
            )}
          </div>
          <DialogFooter className='pt-2 border-t'>
            <Button variant='outline' onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col items-center gap-4 py-2'>
            <div className='bg-destructive/10 flex size-14 items-center justify-center rounded-full'>
              <Icons.trash className='text-destructive size-7' />
            </div>
            <div className='text-center'>
              <p className='font-medium'>确定要删除「{deletingItem?.name}」吗？</p>
              <p className='text-muted-foreground mt-1 text-sm'>此操作不可撤销</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant='destructive' onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
