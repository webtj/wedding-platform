'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { WEDDING_MATERIAL_TEMPLATE } from '../constants';
import { apiClient } from '@/lib/api-client';
import { getQueryClient } from '@/lib/query-client';
import { categoryKeys } from '../api/queries';
import { toast } from 'sonner';

export function TemplateImportButton() {
  const [pending, setPending] = useState(false);

  async function importTemplate() {
    if (pending) return;
    setPending(true);
    let catOk = 0;
    let matOk = 0;
    let skip = 0;
    try {
      for (const tpl of WEDDING_MATERIAL_TEMPLATE) {
        let catId: string;
        try {
          const cat = await apiClient<{ id: string }>('/material-categories', {
            method: 'POST',
            body: JSON.stringify({ name: tpl.name })
          });
          catId = cat.id;
          catOk++;
        } catch {
          skip++;
          const existing = await apiClient<Array<{ id: string; name: string }>>(
            '/material-categories'
          );
          const found = existing.find((c) => c.name === tpl.name);
          if (!found) continue;
          catId = found.id;
        }
        for (const item of tpl.items) {
          try {
            await apiClient('/materials', {
              method: 'POST',
              body: JSON.stringify({ categoryId: catId, name: item, status: 'missing' })
            });
            matOk++;
          } catch {
            // ignore single-item failures
          }
        }
      }
      const qc = getQueryClient();
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      const msg = skip > 0
        ? `已导入 ${catOk} 个分类 + ${matOk} 件物料（${skip} 个分类已存在）`
        : `已导入 ${catOk} 个分类 + ${matOk} 件物料`;
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导入失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size='sm' variant='outline' onClick={importTemplate} disabled={pending}>
      {pending ? (
        <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
      ) : (
        <Icons.sparkles className='mr-1.5 h-3.5 w-3.5' />
      )}
      {pending ? '导入中...' : '导入婚礼物料模板'}
    </Button>
  );
}
