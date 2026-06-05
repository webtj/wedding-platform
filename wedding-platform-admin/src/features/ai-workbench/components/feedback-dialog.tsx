'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { submitFeedback } from '../api/queries';
import { toast } from 'sonner';

interface FeedbackDialogProps {
  generationId: string;
  imageId?: string;
  children: React.ReactNode;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackDialog({
  generationId,
  imageId,
  children,
  onFeedbackSubmitted
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('请选择评分');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback(generationId, {
        rating,
        reason: reason.trim() || undefined,
        imageId
      });
      toast.success('感谢您的反馈！');
      setOpen(false);
      setRating(0);
      setReason('');
      onFeedbackSubmitted?.();
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>评价生成结果</DialogTitle>
          <DialogDescription>
            您的反馈将帮助我们改进 AI 生成质量
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4 py-4'>
          {/* Star rating */}
          <div className='flex flex-col items-center gap-2'>
            <p className='text-muted-foreground text-sm'>请为本次生成评分</p>
            <div className='flex gap-1'>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type='button'
                  className='p-0.5 transition-transform hover:scale-110'
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(value)}
                >
                  <Icons.star
                    className={cn(
                      'size-8 transition-colors',
                      (hoveredRating || rating) >= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className='text-muted-foreground text-xs'>
                {rating === 1 && '非常不满意'}
                {rating === 2 && '不太满意'}
                {rating === 3 && '一般'}
                {rating === 4 && '比较满意'}
                {rating === 5 && '非常满意'}
              </p>
            )}
          </div>

          {/* Reason textarea */}
          <div className='flex flex-col gap-2'>
            <label htmlFor='feedback-reason' className='text-sm font-medium'>
              补充说明（可选）
            </label>
            <Textarea
              id='feedback-reason'
              placeholder='请描述您对生成结果的看法，或需要改进的地方...'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className='min-h-[100px] resize-none'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
            {isSubmitting ? (
              <>
                <Icons.spinner className='mr-2 size-4 animate-spin' />
                提交中...
              </>
            ) : (
              '提交反馈'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
