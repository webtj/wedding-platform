'use client';

import { useMemo, useState, useCallback } from 'react';
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
import {
  createAiTemplate,
  deleteAiTemplate,
  getAiTemplates,
  updateAiTemplate
} from '../api/queries';
import type { AiTemplate } from '../api/types';

const TEMPLATE_CATEGORY = 'image_design';

function createTemplateCode() {
  return `image_${Date.now().toString(36)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate
}: {
  template: AiTemplate;
  onEdit: (template: AiTemplate) => void;
  onDelete: (template: AiTemplate) => void;
  onDuplicate: (template: AiTemplate) => void;
}) {
  const isCustom = !template.isBuiltIn && template.tenantId !== null;

  return (
    <div className='group rounded-lg border bg-card p-3 transition-colors hover:border-primary/40'>
      <div className='mb-2 flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-1.5'>
            <h3 className='truncate text-sm font-medium'>{template.name}</h3>
            <Badge variant='outline' className='h-5 px-1.5 text-[10px]'>
              {template.isBuiltIn ? '内置' : '自定义'}
            </Badge>
          </div>
          <p className='text-muted-foreground mt-0.5 font-mono text-[10px]'>{template.code}</p>
        </div>
        <div className='flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='复制为自定义模板'
            onClick={() => onDuplicate(template)}
          >
            <Icons.add className='size-3.5' />
          </Button>
          {isCustom && (
            <>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7'
                title='编辑'
                onClick={() => onEdit(template)}
              >
                <Icons.edit className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7 text-destructive'
                title='删除'
                onClick={() => onDelete(template)}
              >
                <Icons.trash className='size-3.5' />
              </Button>
            </>
          )}
        </div>
      </div>
      <p className='text-muted-foreground line-clamp-3 text-xs leading-relaxed'>
        {template.prompt}
      </p>
      <div className='mt-3 flex items-center justify-between text-[10px] text-muted-foreground'>
        <span>{formatDate(template.updatedAt)}</span>
        <span>{template.prompt.length} 字</span>
      </div>
    </div>
  );
}

export function PromptTemplateManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AiTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<AiTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formError, setFormError] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['ai-workbench-templates', TEMPLATE_CATEGORY],
    queryFn: () => getAiTemplates(TEMPLATE_CATEGORY)
  });

  const items = useMemo(() => templates ?? [], [templates]);
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      `${item.name} ${item.prompt} ${item.code}`.toLowerCase().includes(keyword)
    );
  }, [items, search]);

  const stats = useMemo(
    () => ({
      builtIn: items.filter((item) => item.isBuiltIn).length,
      custom: items.filter((item) => !item.isBuiltIn).length,
      total: items.length
    }),
    [items]
  );

  const resetForm = useCallback(() => {
    setEditingTemplate(null);
    setFormName('');
    setFormPrompt('');
    setFormError('');
  }, []);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ai-workbench-templates'] });
  }, [queryClient]);

  const openAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((template: AiTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormPrompt(template.prompt);
    setFormError('');
    setFormOpen(true);
  }, []);

  const openDuplicate = useCallback((template: AiTemplate) => {
    setEditingTemplate(null);
    setFormName(`${template.name} 调整版`);
    setFormPrompt(template.prompt);
    setFormError('');
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((template: AiTemplate) => {
    setDeletingTemplate(template);
    setDeleteOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const name = formName.trim();
    const prompt = formPrompt.trim();

    if (!name) {
      setFormError('请输入模板名称');
      return;
    }
    if (prompt.length < 4) {
      setFormError('提示词至少需要 4 个字符');
      return;
    }

    try {
      if (editingTemplate) {
        await updateAiTemplate(editingTemplate.id, { name, prompt, category: TEMPLATE_CATEGORY });
        toast.success('模板已更新');
      } else {
        await createAiTemplate({
          code: createTemplateCode(),
          name,
          prompt,
          category: TEMPLATE_CATEGORY
        });
        toast.success('模板已新增');
      }
      setFormOpen(false);
      resetForm();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    }
  }, [editingTemplate, formName, formPrompt, refresh, resetForm]);

  const handleDelete = useCallback(async () => {
    if (!deletingTemplate) return;
    try {
      await deleteAiTemplate(deletingTemplate.id);
      toast.success('模板已删除');
      setDeleteOpen(false);
      setDeletingTemplate(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }, [deletingTemplate, refresh]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-3 md:grid-cols-3'>
        {[
          { label: '内置灵感', value: stats.builtIn, icon: Icons.sparkles },
          { label: '自定义模板', value: stats.custom, icon: Icons.edit },
          { label: '可用总数', value: stats.total, icon: Icons.palette }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className='rounded-lg border bg-card p-3'>
              <div className='flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary'>
                  <Icon className='size-4' />
                </div>
                <div>
                  <p className='text-lg font-semibold leading-none'>{stat.value}</p>
                  <p className='text-muted-foreground mt-1 text-xs'>{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='搜索模板、场景或提示词...'
            className='h-9 pl-8'
          />
        </div>
        <Button type='button' size='sm' className='h-9 gap-1.5' onClick={openAdd}>
          <Icons.add className='size-3.5' />
          新增模板
        </Button>
      </div>

      {isLoading ? (
        <div className='rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground'>
          正在加载模板...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className='rounded-lg border border-dashed py-12 text-center'>
          <Icons.search className='mx-auto mb-3 size-8 text-muted-foreground/50' />
          <p className='text-sm text-muted-foreground'>没有找到匹配的生图模板</p>
        </div>
      ) : (
        <div className='grid gap-3 lg:grid-cols-2 xl:grid-cols-3'>
          {filteredItems.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={openEdit}
              onDelete={openDelete}
              onDuplicate={openDuplicate}
            />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑生图模板' : '新增生图模板'}</DialogTitle>
            <DialogDescription>
              模板会出现在 AI 工作台的推荐词里，适合沉淀常用婚礼风格、物料和构图要求。
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid gap-2'>
              <Label>模板名称</Label>
              <Input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder='如：白玫瑰迎宾牌'
              />
            </div>
            <div className='grid gap-2'>
              <Label>提示词</Label>
              <Textarea
                value={formPrompt}
                onChange={(event) => setFormPrompt(event.target.value)}
                placeholder='描述画面主体、花材、色调、构图、留白和材质...'
                className='min-h-36 resize-none'
              />
            </div>
            {formError && (
              <p className='flex items-center gap-1.5 text-sm text-destructive'>
                <Icons.warning className='size-4' />
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button type='button' onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除后，这个推荐词不会再出现在 AI 工作台。</DialogDescription>
          </DialogHeader>
          <div className='rounded-lg bg-muted/60 p-3'>
            <p className='text-sm font-medium'>{deletingTemplate?.name}</p>
            <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
              {deletingTemplate?.prompt}
            </p>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button type='button' variant='destructive' onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
