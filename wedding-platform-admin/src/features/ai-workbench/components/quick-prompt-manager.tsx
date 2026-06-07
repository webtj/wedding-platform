'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { apiClient } from '@/lib/api-client';

// ── Types ───────────────────────────────────────────────────────────────────

interface QuickPromptCategory {
  id: string;
  tenantId: string | null;
  name: string;
  sortOrder: number;
  prompts: QuickPrompt[];
}

interface QuickPrompt {
  id: string;
  tenantId: string | null;
  categoryId: string;
  name: string;
  prompt: string;
  sortOrder: number;
}

// ── API ─────────────────────────────────────────────────────────────────────

const QUERY_KEY = ['quick-prompts'];

function fetchCategories(): Promise<QuickPromptCategory[]> {
  return apiClient<QuickPromptCategory[]>('/quick-prompts/categories');
}

function createCategory(data: { name: string }) {
  return apiClient<QuickPromptCategory>('/quick-prompts/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

function deleteCategory(id: string) {
  return apiClient(`/quick-prompts/categories/${id}`, { method: 'DELETE' });
}

function createPrompt(data: { categoryId: string; name: string; prompt: string }) {
  return apiClient<QuickPrompt>('/quick-prompts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

function updatePrompt(id: string, data: { name?: string; prompt?: string }) {
  return apiClient<QuickPrompt>(`/quick-prompts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

function deletePrompt(id: string) {
  return apiClient(`/quick-prompts/${id}`, { method: 'DELETE' });
}

// ── Components ──────────────────────────────────────────────────────────────

function PromptCard({
  prompt,
  onEdit,
  onDelete
}: {
  prompt: QuickPrompt;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const builtIn = !prompt.tenantId;

  return (
    <div className='group rounded-lg border bg-card p-3 transition-colors hover:border-primary/40'>
      <div className='mb-1 flex items-start justify-between gap-2'>
        <h4 className='text-sm font-medium'>{prompt.name}</h4>
        <div className='flex shrink-0 gap-1'>
          {!builtIn && (
            <>
              <Button type='button' variant='ghost' size='icon' className='size-6' title='编辑' onClick={onEdit}>
                <Icons.edit className='size-3' />
              </Button>
              <Button type='button' variant='ghost' size='icon' className='size-6 text-destructive' title='删除' onClick={onDelete}>
                <Icons.trash className='size-3' />
              </Button>
            </>
          )}
          {builtIn && (
            <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>内置</Badge>
          )}
        </div>
      </div>
      <p className='text-muted-foreground line-clamp-3 text-xs'>{prompt.prompt}</p>
    </div>
  );
}

function CategorySection({
  category,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
  onDeleteCategory
}: {
  category: QuickPromptCategory;
  onAddPrompt: (categoryId: string) => void;
  onEditPrompt: (prompt: QuickPrompt) => void;
  onDeletePrompt: (prompt: QuickPrompt) => void;
  onDeleteCategory: (category: QuickPromptCategory) => void;
}) {
  const builtIn = !category.tenantId;

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <h3 className='text-sm font-semibold'>{category.name}</h3>
        {builtIn && <Badge variant='secondary' className='text-[10px] px-1.5 py-0'>内置</Badge>}
        <span className='text-muted-foreground text-xs'>({category.prompts.length})</span>
        <div className='flex-1' />
        {!builtIn && (
          <Button variant='ghost' size='sm' className='h-7 text-xs text-destructive' onClick={() => onDeleteCategory(category)}>
            删除分类
          </Button>
        )}
        <Button variant='ghost' size='sm' className='h-7 text-xs' onClick={() => onAddPrompt(category.id)}>
          <Icons.add className='mr-1 h-3 w-3' />
          添加
        </Button>
      </div>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        {category.prompts.map((p) => (
          <PromptCard
            key={p.id}
            prompt={p}
            onEdit={() => onEditPrompt(p)}
            onDelete={() => onDeletePrompt(p)}
          />
        ))}
        {category.prompts.length === 0 && (
          <p className='text-muted-foreground py-4 text-center text-xs col-span-full'>暂无推荐词</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function QuickPromptManager() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCategories
  });

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addPromptCategoryId, setAddPromptCategoryId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<QuickPrompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<QuickPrompt | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<QuickPromptCategory | null>(null);

  // Form states
  const [catName, setCatName] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptText, setPromptText] = useState('');

  function refresh() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function handleAddCategory() {
    if (!catName.trim()) return;
    try {
      await createCategory({ name: catName.trim() });
      toast.success('分类已创建');
      setAddCatOpen(false);
      setCatName('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '创建失败');
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    try {
      await deleteCategory(deletingCategory.id);
      toast.success('分类已删除');
      setDeletingCategory(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  }

  async function handleAddPrompt() {
    if (!addPromptCategoryId || !promptName.trim() || !promptText.trim()) return;
    try {
      await createPrompt({ categoryId: addPromptCategoryId, name: promptName.trim(), prompt: promptText.trim() });
      toast.success('推荐词已添加');
      setAddPromptCategoryId(null);
      setPromptName('');
      setPromptText('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || '添加失败');
    }
  }

  async function handleEditPrompt() {
    if (!editingPrompt || !promptName.trim() || !promptText.trim()) return;
    try {
      await updatePrompt(editingPrompt.id, { name: promptName.trim(), prompt: promptText.trim() });
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
      await deletePrompt(deletingPrompt.id);
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
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {categories?.length ?? 0} 个分类，{categories?.reduce((sum, c) => sum + c.prompts.length, 0) ?? 0} 条推荐词
        </p>
        <Button size='sm' onClick={() => setAddCatOpen(true)}>
          <Icons.add className='mr-1.5 h-3.5 w-3.5' />
          添加分类
        </Button>
      </div>

      {categories?.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          onAddPrompt={(categoryId) => {
            setPromptName('');
            setPromptText('');
            setAddPromptCategoryId(categoryId);
          }}
          onEditPrompt={(prompt) => {
            setPromptName(prompt.name);
            setPromptText(prompt.prompt);
            setEditingPrompt(prompt);
          }}
          onDeletePrompt={setDeletingPrompt}
          onDeleteCategory={setDeletingCategory}
        />
      ))}

      {categories?.length === 0 && (
        <div className='py-16 text-center border-2 border-dashed rounded-xl'>
          <p className='text-sm text-muted-foreground mb-2'>暂无推荐词分类</p>
          <p className='text-xs text-muted-foreground mb-4'>点击上方"添加分类"开始创建</p>
        </div>
      )}

      {/* ── Add Category Dialog ── */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>分类名称</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder='如：场景、风格、物料' />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddCatOpen(false)}>取消</Button>
            <Button onClick={handleAddCategory} disabled={!catName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Prompt Dialog ── */}
      <Dialog open={!!addPromptCategoryId || !!editingPrompt} onOpenChange={(o) => { if (!o) { setAddPromptCategoryId(null); setEditingPrompt(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrompt ? '编辑推荐词' : '添加推荐词'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>名称</Label>
              <Input value={promptName} onChange={(e) => setPromptName(e.target.value)} placeholder='简短描述' />
            </div>
            <div className='space-y-1.5'>
              <Label>推荐词内容</Label>
              <Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={3} placeholder='完整的推荐词/灵感文本' />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setAddPromptCategoryId(null); setEditingPrompt(null); }}>取消</Button>
            <Button onClick={editingPrompt ? handleEditPrompt : handleAddPrompt} disabled={!promptName.trim() || !promptText.trim()}>
              {editingPrompt ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Prompt Dialog ── */}
      <Dialog open={!!deletingPrompt} onOpenChange={() => setDeletingPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除推荐词「{deletingPrompt?.name}」吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeletingPrompt(null)}>取消</Button>
            <Button variant='destructive' onClick={handleDeletePrompt}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Category Dialog ── */}
      <Dialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除分类</DialogTitle>
            <DialogDescription>
              删除「{deletingCategory?.name}」将同时删除其下所有推荐词，不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeletingCategory(null)}>取消</Button>
            <Button variant='destructive' onClick={handleDeleteCategory}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
