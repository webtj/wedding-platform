import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UseMutationOptions } from '@tanstack/react-query';

export function useMutationToast<TData, TError, TVars, TContext>(
  options: UseMutationOptions<TData, TError, TVars, TContext> & {
    successMsg?: string;
    errorMsg?: string;
  }
) {
  const { successMsg, errorMsg, onSuccess: origSuccess, onError: origError, ...rest } = options;

  return useMutation<TData, TError, TVars, TContext>({
    ...rest,
    onSuccess(data, vars, ctx) {
      if (successMsg) toast.success(successMsg);
      (origSuccess as any)?.(data, vars, ctx);
    },
    onError(err, vars, ctx) {
      const msg = errorMsg ?? (err instanceof Error ? err.message : '操作失败');
      toast.error(msg);
      (origError as any)?.(err, vars, ctx);
    }
  });
}
