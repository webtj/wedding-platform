import { Logger } from '@nestjs/common';

interface AsyncTaskSubmitResult {
  taskId: string;
}

interface AsyncTaskPollResult<T> {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  result?: T;
  error?: string;
}

export interface AsyncPollerConfig<T> {
  submit: () => Promise<AsyncTaskSubmitResult>;
  poll: (taskId: string) => Promise<AsyncTaskPollResult<T>>;
  intervalMs?: number;
  maxAttempts?: number;
  extract: (result: T) => unknown;
}

const logger = new Logger('AsyncTaskPoller');

export async function pollAsyncTask<T>(config: AsyncPollerConfig<T>): Promise<unknown> {
  const { submit, poll, extract, intervalMs = 3000, maxAttempts = 60 } = config;

  const { taskId } = await submit();
  logger.log(`Task submitted: ${taskId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);
    const result = await poll(taskId);

    if (result.status === 'succeeded' && result.result) {
      logger.log(`Task ${taskId} succeeded (attempt ${attempt + 1})`);
      return extract(result.result);
    }
    if (result.status === 'failed') {
      throw new Error(`Task ${taskId} failed: ${result.error ?? 'unknown error'}`);
    }
  }

  throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
