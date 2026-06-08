'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

const TYPE_LABELS: Record<string, string> = {
  image_design: '生图灵感',
  copywriting: '文案灵感'
};

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

// ── Category List Item ───────────────────────────────────────────────────

function CategoryItem({
  category,
  isActive,
  isPlatformAdmin,
  onSelect,
  onEdit,
  onDelete
}: {
  category: QuickPromptCategory;
  isActive: boolean;
  isPlatformAdmin: boolean;
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const builtIn = isBuiltIn(category);
  const promptCount = category.prompts?.length ?? 0;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'hover:bg-muted/50 border border-transparent'
      )}
      onClick={onSelect}
    >
      <Icons.workspace className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-medium truncate'>{category.name}</span>
          {builtIn && (
            <Badge variant='secondary' className='text-[10px] px-1 py-0'>
              内置
            </Badge>
          )}
        </div>
      </div>
      <span className='text-xs text-muted-foreground'>{promptCount}</span>
      {(!builtIn || isPlatformAdmin) && (
        <div className='hidden group-hover:flex items-center gap-0.5'>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={onEdit}
          >
            <Icons.edit className='h-3 w-3' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-destructive'
            onClick={onDelete}
          >
            <Icons.trash className='h-3 w-3' />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Prompt Card ──────────────────────────────────────────────────────────

function PromptCard({
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
    <div className='group relative flex flex-col p-4 rounded-lg border bg-card transition-all hover:shadow-sm hover:border-primary/30'>
      <div className='flex items-start justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <h4 className='text-sm font-medium truncate'>{prompt.name}</h4>
          {builtIn && (
            <Badge variant='secondary' className='text-[10px] px-1.5 py-0 flex-shrink-0'>
              内置
            </Badge>
          )}
        </div>
        {(!builtIn || isPlatformAdmin) && (
          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={onEdit}
            >
              <Icons.edit className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-destructive'
              onClick={onDelete}
            >
              <Icons.trash className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>
      <p className='text-sm text-muted-foreground leading-relaxed line-clamp-4'>
        {prompt.prompt}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export function QuickPromptManager() {
  const { isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<string>('image_design');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, activeType],
    queryFn: () => fetchQuickPromptCategories(activeType || undefined)
  });

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<QuickPromptCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [addPromptOpen, setAddPromptOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<QuickPrompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<QuickPrompt | null>(null);

  const [catName, setCatName] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptText, setPromptText] = useState('');

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(keyword) ||
        cat.prompts.some(
          (p) =>
            p.name.toLowerCase().includes(keyword) ||
            p.prompt.toLowerCase().includes(keyword)
        )
    );
  }, [categories, search]);

  const selectedCategory = useMemo(() => {
    if (!filteredCategories.length) return null;
    if (selectedCategoryId) {
      return filteredCategories.find((c) => c.id === selectedCategoryId) ?? null;
    }
    return filteredCategories[0] ?? null;
  }, [filteredCategories, selectedCategoryId]);

  const filteredPrompts = useMemo(() => {
    if (!selectedCategory) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return selectedCategory.prompts ?? [];
    return (selectedCategory.prompts ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.prompt.toLowerCase().includes(keyword)
    );
  }, [selectedCategory, search]);

  const totalPrompts = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + (c.prompts?.length ?? 0), 0),
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
      if (selectedCategoryId === deleteCatId) {
        setSelectedCategoryId(null);
      }
      setDeleteCatId(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  }

  async function handleAddPrompt() {
    if (!selectedCategory || !promptName.trim()) return;
    try {
      await createQuickPrompt({
        categoryId: selectedCategory.id,
        name: promptName.trim(),
        prompt: promptText.trim() || promptName.trim()
      });
      toast.success('推荐词已添加');
      setAddPromptOpen(false);
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
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <button
            key={value}
            type='button'
            onClick={() => {
              setActiveType(value);
              setSelectedCategoryId(null);
            }}
            className={cn(
              'inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors',
              activeType === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className='flex gap-4 min-h-[500px]'>
        {/* Left: Category List */}
        <div className='w-56 flex-shrink-0'>
          <div className='rounded-lg border bg-card'>
            <div className='p-2 border-b flex items-center justify-between'>
              <h3 className='text-sm font-medium text-muted-foreground px-1'>
                分类列表({filteredCategories.length})
              </h3>
              <Button size='icon' variant='ghost' className='h-6 w-6' onClick={() => setAddCatOpen(true)}>
                <Icons.add className='h-4 w-4' />
              </Button>
            </div>
            <div className='h-[460px] overflow-y-auto'>
              <div className='p-2 space-y-1'>
                {filteredCategories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    isActive={selectedCategory?.id === cat.id}
                    isPlatformAdmin={isPlatformAdmin}
                    onSelect={() => setSelectedCategoryId(cat.id)}
                    onEdit={(e) => {
                      e.stopPropagation();
                      setCatName(cat.name);
                      setEditCat(cat);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteCatId(cat.id);
                    }}
                  />
                ))}
                {filteredCategories.length === 0 && (
                  <p className='text-xs text-muted-foreground text-center py-8'>
                    {search ? '无匹配分类' : '暂无分类'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Prompts Grid */}
        <div className='flex-1'>
          <div className='rounded-lg border bg-card h-full'>
            <div className='p-3 border-b space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-medium'>
                    {selectedCategory ? selectedCategory.name : '选择一个分类'}
                  </h3>
                  {selectedCategory && isBuiltIn(selectedCategory) && (
                    <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>
                      内置
                    </Badge>
                  )}
                  {selectedCategory && (
                    <span className='text-xs text-muted-foreground'>
                      {filteredPrompts.length} 条推荐词
                    </span>
                  )}
                </div>
                {selectedCategory && (isPlatformAdmin || !isBuiltIn(selectedCategory)) && (
                  <Button
                    size='sm'
                    onClick={() => {
                      setPromptName('');
                      setPromptText('');
                      setAddPromptOpen(true);
                    }}
                  >
                    <Icons.add className='mr-1.5 h-3.5 w-3.5' />
                    添加推荐词
                  </Button>
                )}
              </div>
              <div className='relative'>
                <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索分类或推荐词...'
                  className='pl-9 h-8'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label='搜索分类或推荐词'
                />
              </div>
            </div>
            <div className='h-[420px] overflow-y-auto'>
              <div className='p-3'>
                {selectedCategory ? (
                  filteredPrompts.length > 0 ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      {filteredPrompts.map((p) => (
                        <PromptCard
                          key={p.id}
                          prompt={p}
                          isPlatformAdmin={isPlatformAdmin}
                          onEdit={() => {
                            setPromptName(p.name);
                            setPromptText(p.prompt);
                            setEditingPrompt(p);
                          }}
                          onDelete={() => setDeletingPrompt(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                      <Icons.sparkles className='h-8 w-8 mb-2 opacity-50' />
                      <p className='text-sm'>暂无推荐词</p>
                      <p className='text-xs mt-1'>点击上方按钮添加</p>
                    </div>
                  )
                ) : (
                  <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                    <Icons.sparkles className='h-8 w-8 mb-2 opacity-50' />
                    <p className='text-sm'>请从左侧选择一个分类</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Add Prompt Dialog */}
      <Dialog open={addPromptOpen} onOpenChange={setAddPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加推荐词</DialogTitle>
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
                rows={4}
                placeholder='完整的推荐词/灵感文本'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddPromptOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddPrompt} disabled={!promptName.trim()}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={(o) => { if (!o) setEditingPrompt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑推荐词</DialogTitle>
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
              <Label>推荐词内容</Label>
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={4}
                placeholder='完整的推荐词/灵感文本'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingPrompt(null)}>
              取消
            </Button>
            <Button onClick={handleEditPrompt} disabled={!promptName.trim()}>
              保存
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
