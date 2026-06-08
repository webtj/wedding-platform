'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/lib/auth/auth-context';
import {
  fetchQuickPromptCategories,
  createQuickPromptCategory,
  updateQuickPromptCategory,
  deleteQuickPromptCategory,
  createQuickPrompt,
  updateQuickPrompt,
  deleteQuickPrompt
} from '../api/queries';
import type { QuickPromptCategory, QuickPrompt, PromptCategoryType } from '../api/types';

// ── Constants ────────────────────────────────────────────────────────────

const QUERY_KEY = ['quick-prompts'];

const FILTER_TABS: { value: string; label: string }[] = [
  { value: 'image_design', label: '生图灵感' },
  { value: 'copywriting', label: '文案灵感' },
  { value: '', label: '全部' }
];

// ── Helpers ──────────────────────────────────────────────────────────────

function isBuiltIn(item: { tenantId: string | null }): boolean {
  return !item.tenantId;
}

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Category Card ────────────────────────────────────────────────────────

function CategoryCard({
  category,
  forceExpand,
  search,
  isPlatformAdmin,
  onEdit,
  onDeleteRequest,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt
}: {
  category: QuickPromptCategory;
  forceExpand: boolean;
  search: string;
  isPlatformAdmin: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onAddPrompt: () => void;
  onEditPrompt: (p: QuickPrompt) => void;
  onDeletePrompt: (p: QuickPrompt) => void;
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
  const all = category.prompts ?? [];
  const searchLower = search.toLowerCase();
  const categoryMatches = search && category.name.toLowerCase().includes(searchLower);
  let prompts = all;
  if (search) {
    prompts = categoryMatches
      ? all
      : all.filter((p) => p.name.toLowerCase().includes(searchLower) || p.prompt.toLowerCase().includes(searchLower));
  }

  if (search && !categoryMatches && prompts.length === 0) return null;

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
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
              expanded && 'rotate-90'
            )}
          />
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='font-semibold text-sm truncate'>{category.name}</span>
              {builtIn && (
                <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>
                  内置
                </Badge>
              )}
              <span className='text-xs text-muted-foreground whitespace-nowrap'>
                {prompts.length} 条
              </span>
            </div>
          </div>
          <div className='flex items-center gap-0.5 flex-shrink-0'>
            {(!builtIn || isPlatformAdmin) && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                title='添加推荐词'
                onClick={(e) => {
                  e.stopPropagation();
                  onAddPrompt();
                }}
              >
                <Icons.add className='h-3 w-3' />
              </Button>
            )}
            {(!builtIn || isPlatformAdmin) && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                title='编辑分类'
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Icons.edit className='h-3 w-3' />
              </Button>
            )}
            {(!builtIn || isPlatformAdmin) && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-destructive'
                title='删除分类'
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest();
                }}
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
            {prompts.map((p) => (
              <PromptChip
                key={p.id}
                prompt={p}
                isPlatformAdmin={isPlatformAdmin}
                onEdit={() => onEditPrompt(p)}
                onDelete={() => onDeletePrompt(p)}
              />
            ))}
            {prompts.length === 0 && !search && (
              <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>
                暂无推荐词
              </p>
            )}
            {prompts.length === 0 && search && (
              <p className='text-xs text-muted-foreground py-8 text-center col-span-full'>
                未找到匹配的推荐词
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Prompt Chip ──────────────────────────────────────────────────────────

function PromptChip({
  prompt,
  isPlatformAdmin,
  onEdit,
  onDelete
}: {
  prompt: QuickPrompt;
  isPlatformAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const builtIn = isBuiltIn(prompt);

  return (
    <div className='group flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm transition-all hover:shadow-sm hover:border-primary/40'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='flex-1 truncate text-xs cursor-default'>{prompt.name}</span>
          </TooltipTrigger>
          <TooltipContent side='top' className='max-w-xs'>
            <p className='text-xs'>{prompt.prompt}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {builtIn && (
        <Badge variant='secondary' className='text-[9px] px-1 py-0 flex-shrink-0'>
          内置
        </Badge>
      )}
      {(!builtIn || isPlatformAdmin) && (
        <div className='flex items-center gap-0.5 flex-shrink-0'>
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='编辑'
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Icons.edit className='size-3' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-6 text-destructive'
            title='删除'
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Icons.trash className='size-3' />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export function QuickPromptManager() {
  const { isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<string>('image_design');
  const [search, setSearch] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const { data: categories, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, activeType],
    queryFn: () => fetchQuickPromptCategories(activeType || undefined)
  });

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<QuickPromptCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [addPromptCatId, setAddPromptCatId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<QuickPrompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<QuickPrompt | null>(null);

  const [catName, setCatName] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptText, setPromptText] = useState('');

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const keyword = debouncedSearch.trim().toLowerCase();
    if (!keyword) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        prompts: cat.prompts.filter(
          (p) =>
            p.name.toLowerCase().includes(keyword) ||
            p.prompt.toLowerCase().includes(keyword)
        )
      }))
      .filter((cat) => cat.name.toLowerCase().includes(keyword) || cat.prompts.length > 0);
  }, [categories, debouncedSearch]);

  const totalPrompts = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.prompts.length, 0),
    [filteredCategories]
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  async function handleAddCategory() {
    if (!catName.trim()) return;
    try {
      await createQuickPromptCategory({ name: catName.trim() });
      toast.success('分类已创建');
      setAddCatOpen(false);
      setCatName('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '创建失败');
    }
  }

  async function handleEditCategory() {
    if (!editCat || !catName.trim()) return;
    try {
      await updateQuickPromptCategory(editCat.id, { name: catName.trim() });
      toast.success('分类已更新');
      setEditCat(null);
      setCatName('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '更新失败');
    }
  }

  async function handleDeleteCategory() {
    if (!deleteCatId) return;
    try {
      await deleteQuickPromptCategory(deleteCatId);
      toast.success('分类已删除');
      setDeleteCatId(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  }

  async function handleAddPrompt() {
    if (!addPromptCatId || !promptName.trim()) return;
    try {
      await createQuickPrompt({
        categoryId: addPromptCatId,
        name: promptName.trim(),
        prompt: promptText.trim() || promptName.trim()
      });
      toast.success('推荐词已添加');
      setAddPromptCatId(null);
      setPromptName('');
      setPromptText('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '添加失败');
    }
  }

  async function handleEditPrompt() {
    if (!editingPrompt || !promptName.trim()) return;
    try {
      await updateQuickPrompt(editingPrompt.id, {
        name: promptName.trim(),
        prompt: promptText.trim() || promptName.trim()
      });
      toast.success('推荐词已更新');
      setEditingPrompt(null);
      setPromptName('');
      setPromptText('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '更新失败');
    }
  }

  async function handleDeletePrompt() {
    if (!deletingPrompt) return;
    try {
      await deleteQuickPrompt(deletingPrompt.id);
      toast.success('推荐词已删除');
      setDeletingPrompt(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12 text-muted-foreground'>
        <Icons.spinner className='h-5 w-5 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {/* Type Filter Tabs */}
      <div className='flex flex-wrap items-center gap-2'>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type='button'
            onClick={() => setActiveType(tab.value)}
            className={cn(
              'inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors',
              activeType === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
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
            placeholder='搜索分类或推荐词...'
            className='pl-9 h-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label='搜索分类或推荐词'
          />
        </div>
        <div className='flex-1' />
        <p className='text-muted-foreground text-sm'>
          {filteredCategories.length} 个分类，{totalPrompts} 条推荐词
        </p>
        <Button size='sm' onClick={() => setAddCatOpen(true)}>
          <Icons.add className='mr-1.5 h-3.5 w-3.5' />
          添加分类
        </Button>
      </div>

      {/* Category Cards */}
      {filteredCategories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          forceExpand={allExpanded}
          search={debouncedSearch}
          isPlatformAdmin={isPlatformAdmin}
          onEdit={() => {
            setCatName(cat.name);
            setEditCat(cat);
          }}
          onDeleteRequest={() => setDeleteCatId(cat.id)}
          onAddPrompt={() => {
            setPromptName('');
            setPromptText('');
            setAddPromptCatId(cat.id);
          }}
          onEditPrompt={(p) => {
            setPromptName(p.name);
            setPromptText(p.prompt);
            setEditingPrompt(p);
          }}
          onDeletePrompt={setDeletingPrompt}
        />
      ))}

      {filteredCategories.length === 0 && (
        <div className='py-16 text-center border-2 border-dashed rounded-xl'>
          <p className='text-sm text-muted-foreground mb-2'>
            {search.trim() ? '没有找到匹配的推荐词' : '暂无推荐词分类'}
          </p>
          <p className='text-xs text-muted-foreground mb-4'>
            {search.trim() ? '尝试其他关键词' : '点击上方"添加分类"开始创建'}
          </p>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>分类名称</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder='如：场景布置、花艺设计'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddCatOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddCategory} disabled={!catName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCat} onOpenChange={(o) => { if (!o) setEditCat(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>分类名称</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder='分类名称'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditCat(null)}>
              取消
            </Button>
            <Button onClick={handleEditCategory} disabled={!catName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            删除此分类将同时删除其下所有推荐词，不可撤销。
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteCatId(null)}>
              取消
            </Button>
            <Button variant='destructive' onClick={handleDeleteCategory}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Prompt Dialog */}
      <Dialog
        open={!!addPromptCatId || !!editingPrompt}
        onOpenChange={(o) => {
          if (!o) {
            setAddPromptCatId(null);
            setEditingPrompt(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrompt ? '编辑推荐词' : '添加推荐词'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>名称</Label>
              <Input
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder='简短描述'
              />
            </div>
            <div className='space-y-1.5'>
              <Label>推荐词内容（可选，留空则使用名称）</Label>
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
                placeholder='完整的推荐词/灵感文本'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setAddPromptCatId(null);
                setEditingPrompt(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={editingPrompt ? handleEditPrompt : handleAddPrompt}
              disabled={!promptName.trim()}
            >
              {editingPrompt ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Prompt Dialog */}
      <Dialog open={!!deletingPrompt} onOpenChange={() => setDeletingPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除推荐词「{deletingPrompt?.name}」吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeletingPrompt(null)}>
              取消
            </Button>
            <Button variant='destructive' onClick={handleDeletePrompt}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
