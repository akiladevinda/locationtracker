import { DEFAULT_MAX_SYNC_RETRIES } from '@/config/constants';

const MAX_DELAY_MS = 30_000;

export function backoffDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(1000 * 2 ** exponent, MAX_DELAY_MS);
}

export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { DEFAULT_MAX_SYNC_RETRIES };
