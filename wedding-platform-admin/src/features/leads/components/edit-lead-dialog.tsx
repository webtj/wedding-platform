'use client';

import { useAppForm } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { updateLeadMutation } from '../api/queries';
import { STATUS_OPTIONS, SOURCE_OPTIONS } from '../constants';
import { toDateInput } from '@/lib/date-format';
import type { Lead, LeadMutationPayload } from '../api/types';

export function EditLeadDialog({
  open,
  onOpenChange,
  lead
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
}) {
  const update = useMutationToast({
    ...updateLeadMutation,
    successMsg: '已更新',
    errorMsg: '更新失败'
  });

  const form = useAppForm({
    defaultValues: {
      name: lead.name ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      sourceChannel: lead.sourceChannel ?? 'other',
      status: lead.status ?? 'new',
      weddingDate: toDateInput(lead.weddingDate),
      budgetYuan: lead.budgetCents ? lead.budgetCents / 100 : 0,
      note: lead.note ?? ''
    },
    onSubmit: async ({ value }) => {
      update.mutate(
        {
          id: lead.id,
          data: {
            name: value.name || undefined,
            phone: value.phone || undefined,
            email: value.email || undefined,
            sourceChannel: value.sourceChannel,
            status: value.status,
            weddingDate: value.weddingDate || undefined,
            budgetCents: value.budgetYuan ? Math.round(value.budgetYuan * 100) : undefined,
            note: value.note || undefined
          } satisfies LeadMutationPayload
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>编辑意向单</DialogTitle>
          <DialogDescription>修改客户信息和跟进状态</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form className='flex flex-col gap-4 max-h-[60vh] overflow-y-auto p-0 mx-0'>
            <div className='grid grid-cols-2 gap-3'>
              <form.TextField name='name' label='客户名称' />
              <form.TextField name='phone' label='电话' />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <form.TextField name='email' label='邮箱' type='email' />
              <form.SelectField
                name='sourceChannel'
                label='来源'
                options={SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <form.SelectField
                name='status'
                label='状态'
                options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              />
              <form.TextField name='weddingDate' label='婚期' type='text' placeholder='YYYY-MM-DD' />
            </div>
            <form.TextField
              name='budgetYuan'
              label='预算（元）'
              type='number'
              placeholder='客户预算'
            />
            <form.TextField name='note' label='备注' />
            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                {([canSubmit, isSubmitting]) => (
                  <Button type='submit' disabled={!canSubmit || update.isPending}>
                    {isSubmitting || update.isPending ? '保存中...' : '保存'}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
