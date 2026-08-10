export type PromiseSettlementWatchdog = {
  clear: () => void;
};

export type BoundedWaitStartupOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type BoundedWaitResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown }
  | { status: "timed-out" }
  | { status: "canceled" };

export class BoundedWaitError extends Error {
  readonly kind: "timed-out" | "canceled";
  readonly phase: string;
  readonly timeoutMs?: number;

  constructor(args: {
    kind: "timed-out" | "canceled";
    phase: string;
    timeoutMs?: number;
  }) {
    super(
      args.kind === "timed-out"
        ? `${args.phase} timed out after ${args.timeoutMs} ms`
        : `${args.phase} canceled`,
    );
    this.name = "BoundedWaitError";
    this.kind = args.kind;
    this.phase = args.phase;
    this.timeoutMs = args.timeoutMs;
  }
}

export function waitForPromiseSettlement<T>(
  promise: Promise<T>,
  args: BoundedWaitStartupOptions & {
    phase: string;
    onLateFulfilled?: (value: T) => void | Promise<void>;
  },
): Promise<BoundedWaitResult<T>> {
  return new Promise((resolve) => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const signal = args.signal;
    const clear = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      signal?.removeEventListener("abort", onAbort);
    };
    const settle = (result: BoundedWaitResult<T>) => {
      if (!active) {
        return false;
      }
      active = false;
      clear();
      resolve(result);
      return true;
    };
    const onAbort = () => {
      settle({ status: "canceled" });
    };

    void promise.then(
      (value) => {
        if (!settle({ status: "fulfilled", value })) {
          void Promise.resolve(args.onLateFulfilled?.(value)).catch(
            () => undefined,
          );
        }
      },
      (error) => {
        settle({ status: "rejected", error });
      },
    );

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    if (args.timeoutMs !== undefined) {
      timer = setTimeout(
        () => settle({ status: "timed-out" }),
        Math.max(0, args.timeoutMs),
      );
    }
  });
}

export async function waitForBoundedPromise<T>(
  promise: Promise<T>,
  args: BoundedWaitStartupOptions & {
    phase: string;
    onLateFulfilled?: (value: T) => void | Promise<void>;
  },
): Promise<T> {
  const result = await waitForPromiseSettlement(promise, args);
  if (result.status === "fulfilled") {
    return result.value;
  }
  if (result.status === "rejected") {
    throw result.error;
  }
  throw new BoundedWaitError({
    kind: result.status,
    phase: args.phase,
    timeoutMs: args.timeoutMs,
  });
}

export function watchPromiseSettlement(
  promise: Promise<unknown>,
  timeoutMs: number,
  onTimeout: () => void | Promise<void>,
): PromiseSettlementWatchdog {
  let active = true;
  const timer = setTimeout(
    () => {
      if (!active) {
        return;
      }
      active = false;
      void Promise.resolve(onTimeout()).catch(() => undefined);
    },
    Math.max(0, timeoutMs),
  );
  const clear = () => {
    if (!active) {
      return;
    }
    active = false;
    clearTimeout(timer);
  };
  void promise.then(clear, clear);
  return { clear };
}
