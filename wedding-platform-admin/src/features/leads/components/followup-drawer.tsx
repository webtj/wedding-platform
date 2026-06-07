'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useMutationToast } from '@/lib/use-mutation-toast';
import { addFollowupMutation, leadByIdOptions } from '../api/queries';
import { toDateTimeDisplay } from '@/lib/date-format';

export function FollowupDrawer({
  leadId,
  open,
  onOpenChange
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: lead, isLoading } = useQuery({
    ...leadByIdOptions(leadId ?? ''),
    enabled: !!leadId && open
  });

  const [content, setContent] = useState('');

  const addFollowup = useMutationToast({
    ...addFollowupMutation,
    successMsg: '跟进记录已添加',
    errorMsg: '添加失败'
  });

  function handleAdd() {
    if (!lead || !content.trim()) return;
    addFollowup.mutate(
      { leadId: lead.id, content: content.trim() },
      { onSuccess: () => setContent('') }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>
            {isLoading ? '加载中...' : `跟进 — ${lead?.name ?? lead?.phone ?? ''}`}
          </SheetTitle>
          {lead && (
            <SheetDescription>
              {lead.leadNo} · {lead.followups?.length ?? 0} 条跟进记录
            </SheetDescription>
          )}
        </SheetHeader>

        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          {isLoading || !lead ? (
            <div className='flex items-center justify-center py-12 text-muted-foreground'>
              <Icons.spinner className='h-5 w-5 animate-spin' />
            </div>
          ) : (
            <>
              {/* ── Add followup ── */}
              <section className='space-y-2'>
                <textarea
                  aria-label='跟进内容'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className='border-input bg-card text-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none resize-y'
                  placeholder='记录这次沟通内容、约定、注意事项...'
                />
                <div className='flex justify-end'>
                  <Button
                    size='sm'
                    onClick={handleAdd}
                    disabled={!content.trim() || addFollowup.isPending}
                    isLoading={addFollowup.isPending}
                  >
                    <Icons.add className='mr-1 h-3.5 w-3.5' />
                    添加跟进记录
                  </Button>
                </div>
              </section>

              {/* ── Timeline ── */}
              <section className='space-y-3 border-t pt-4'>
                <h3 className='text-sm font-semibold text-muted-foreground'>
                  时间轴（{lead.followups?.length ?? 0} 条跟进）
                </h3>
                <ul className='space-y-3 text-sm'>
                  {lead.followups?.map((f) => (
                    <li key={f.id} className='flex items-start gap-2.5'>
                      <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
                        <Icons.chat className='h-3 w-3 text-muted-foreground' />
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-foreground whitespace-pre-wrap break-words'>{f.content}</p>
                        <p className='text-xs text-muted-foreground'>
                          {f.createdBy?.displayName ?? '未知'} · {toDateTimeDisplay(f.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                  {lead.contract && (
                    <li className='flex items-start gap-2.5'>
                      <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
                        <Icons.check className='h-3 w-3 text-muted-foreground' />
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-foreground'>已建合同 {lead.contract.contractNo}</p>
                        <p className='text-xs text-muted-foreground'>{toDateTimeDisplay(lead.updatedAt)}</p>
                      </div>
                    </li>
                  )}
                  {lead.convertedProject && (
                    <li className='flex items-start gap-2.5'>
                      <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
                        <Icons.check className='h-3 w-3 text-muted-foreground' />
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-foreground'>已转项目</p>
                        <p className='text-xs text-muted-foreground'>{toDateTimeDisplay(lead.updatedAt)}</p>
                      </div>
                    </li>
                  )}
                  <li className='flex items-start gap-2.5'>
                    <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted'>
                      <Icons.add className='h-3 w-3 text-muted-foreground' />
                    </span>
                    <div className='flex-1 min-w-0'>
                      <p className='text-foreground'>创建意向单</p>
                      <p className='text-xs text-muted-foreground'>
                        {lead.createdBy?.displayName ?? '未知'} · {toDateTimeDisplay(lead.createdAt)}
                      </p>
                    </div>
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
