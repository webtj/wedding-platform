'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAppForm } from '@/components/ui/tanstack-form';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { createLeadMutation } from '../api/queries';
import { SOURCE_OPTIONS } from '../constants';
import type { LeadMutationPayload } from '../api/types';

export function AddLeadDialog() {
  const [open, setOpen] = useState(false);
  const create = useMutationToast({
    ...createLeadMutation,
    successMsg: '意向单已创建',
    errorMsg: '创建失败'
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      sourceChannel: 'other',
      weddingDate: '',
      budgetYuan: 0,
      note: ''
    },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) return;
      create.mutate(
        {
          name: value.name.trim(),
          phone: value.phone || undefined,
          email: value.email || undefined,
          sourceChannel: value.sourceChannel,
          weddingDate: value.weddingDate || undefined,
          budgetCents: value.budgetYuan ? Math.round(value.budgetYuan * 100) : undefined,
          note: value.note || undefined
        } satisfies LeadMutationPayload,
        {
          onSuccess: () => {
            setOpen(false);
            form.reset();
          }
        }
      );
    }
  });

  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <Icons.add className='mr-1.5 h-3.5 w-3.5' />
        新增意向单
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>新增意向单</DialogTitle>
            <DialogDescription>记录新的客户咨询意向</DialogDescription>
          </DialogHeader>
          <form.AppForm>
            <form.Form className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto p-0 mx-0'>
              <form.TextField
                name='name'
                label='客户名称 *'
                placeholder='客户姓名或称呼'
                required
              />
              <div className='grid grid-cols-2 gap-3'>
                <form.TextField name='phone' label='电话' placeholder='手机号' />
                <form.TextField
                  name='email'
                  label='邮箱'
                  type='email'
                  placeholder='email@example.com'
                  validators={{
                    onBlur: ({ value }: { value: string }) => {
                      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return '邮箱格式不正确';
                      }
                      return undefined;
                    }
                  }}
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <form.SelectField
                  name='sourceChannel'
                  label='来源'
                  options={SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                />
                <form.TextField name='weddingDate' label='婚期' type='text' placeholder='YYYY-MM-DD' />
              </div>
              <form.TextField
                name='budgetYuan'
                label='预算（元）'
                type='number'
                placeholder='客户预算'
              />
              <form.TextField name='note' label='备注' placeholder='客户需求备注' />
              <DialogFooter>
                <Button variant='outline' type='button' onClick={() => setOpen(false)}>
                  取消
                </Button>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting, state.values.name] as const}
                >
                  {([canSubmit, isSubmitting, name]) => (
                    <Button type='submit' disabled={!canSubmit || !String(name).trim()}>
                      {isSubmitting ? '创建中...' : '创建'}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form.Form>
          </form.AppForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
