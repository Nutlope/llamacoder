export const GENERATION_DEADLINE_MS = 270_000;

export type CompletionDeadlineClock = {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
};

type AbortableCompletionStream<T> = {
  abort(): void;
  finalContent(): Promise<T>;
};

const systemClock: CompletionDeadlineClock = {
  set(callback, delayMs) {
    return setTimeout(callback, delayMs);
  },
  clear(handle) {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

export function superviseCompletionStream<T>(
  stream: AbortableCompletionStream<T>,
  {
    timeoutMs = GENERATION_DEADLINE_MS,
    onTimeout,
    clock = systemClock,
  }: {
    timeoutMs?: number;
    onTimeout?: () => void;
    clock?: CompletionDeadlineClock;
  } = {},
): Promise<T> {
  let settled = false;
  const deadline = clock.set(() => {
    if (settled) return;
    onTimeout?.();
    stream.abort();
  }, timeoutMs);

  return stream.finalContent().finally(() => {
    settled = true;
    clock.clear(deadline);
  });
}
