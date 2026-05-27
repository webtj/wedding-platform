import { toast } from 'sonner';

export function mutationToast(opts: {
  success?: string;
  error?: string;
  onSuccess?: () => void;
  onError?: () => void;
}) {
  return {
    onSuccess: () => {
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '操作失败，请稍后重试';
      toast.error(opts.error ?? msg);
      opts.onError?.();
    }
  };
}
