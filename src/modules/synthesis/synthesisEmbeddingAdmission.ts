import { SynthesisClientError } from "../../../packages/synthesis-contracts/src";
import type { CancellationSignal } from "../../utils/wait";

type Waiter = {
  query: boolean;
  limit: number;
  exclusive: boolean;
  testedAt?: string;
  grant(): void;
};

type Endpoint = {
  active: number;
  exclusive?: boolean;
  queries: number;
  waiting: Waiter[];
  overloadedAt?: number;
  reset?: ReturnType<typeof setTimeout>;
  resumeAt?: number;
  resume?: ReturnType<typeof setTimeout>;
};

const endpoints = new Map<string, Endpoint>();

/** Admission is shared across provider instances and connection aliases. */
export async function withEmbeddingAdmission<T>(args: {
  endpoint: string;
  query: boolean;
  limit: 1 | 2;
  exclusive?: boolean;
  testedAt?: string;
  deadline: number;
  now(): number;
  signal?: CancellationSignal;
  run(
    remaining: number,
    overloaded: (retryAfterMs?: number) => void,
  ): Promise<T>;
}): Promise<T> {
  const remaining = () => args.deadline - args.now();
  const timeout = () =>
    new SynthesisClientError("timeout", "Embedding admission expired");
  if (remaining() <= 0 || args.signal?.aborted) throw timeout();
  const lane: Endpoint = endpoints.get(args.endpoint) ?? {
    active: 0,
    queries: 0,
    waiting: [],
  };
  endpoints.set(args.endpoint, lane);
  function drain() {
    if (lane.exclusive || (lane.resumeAt ?? 0) > Date.now()) return;
    while (lane.waiting.length) {
      // A waiting document gets the next slot after three foreground queries.
      const prioritizeQueries = lane.queries < 3;
      const preferred = lane.waiting.findIndex(
        (w) => w.query === prioritizeQueries,
      );
      const index = Math.max(0, preferred);
      const next = lane.waiting[index];
      const retested =
        next.testedAt && Date.parse(next.testedAt) > (lane.overloadedAt ?? 0);
      const limit = lane.overloadedAt && !retested ? 1 : next.limit;
      if (lane.active >= limit || (next.exclusive && lane.active > 0)) break;
      lane.waiting.splice(index, 1);
      lane.active++;
      lane.exclusive = next.exclusive;
      lane.queries = next.query ? Math.min(3, lane.queries + 1) : 0;
      next.grant();
      if (next.exclusive) break;
    }
    if (!lane.active && !lane.waiting.length && !lane.overloadedAt)
      endpoints.delete(args.endpoint);
  }
  if (lane.waiting.length >= 64) {
    throw new SynthesisClientError("unavailable", "Embedding queue is full", {
      reason: "embedding_busy",
    });
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      args.signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      const index = lane.waiting.indexOf(waiter);
      if (index < 0) return;
      lane.waiting.splice(index, 1);
      cleanup();
      reject(timeout());
      drain();
    };
    const waiter: Waiter = {
      query: args.query,
      limit: args.limit,
      testedAt: args.testedAt,
      exclusive: args.exclusive ?? false,
      grant() {
        cleanup();
        resolve();
      },
    };
    const timer = setTimeout(cancel, remaining());
    args.signal?.addEventListener("abort", cancel, { once: true });
    lane.waiting.push(waiter);
    drain();
  });
  try {
    if (remaining() <= 0 || args.signal?.aborted) throw timeout();
    return await args.run(remaining(), (retryAfterMs) => {
      if (lane.reset) clearTimeout(lane.reset);
      lane.overloadedAt = Date.now();
      if (retryAfterMs && retryAfterMs > 0) {
        if (lane.resume) clearTimeout(lane.resume);
        lane.resumeAt = Math.max(lane.resumeAt ?? 0, Date.now() + retryAfterMs);
        const resume = () => {
          const delay = (lane.resumeAt ?? 0) - Date.now();
          if (delay > 0)
            lane.resume = setTimeout(resume, Math.min(2_147_483_647, delay));
          else {
            lane.resume = undefined;
            lane.resumeAt = undefined;
            drain();
          }
        };
        resume();
      }
      lane.reset = setTimeout(() => {
        lane.overloadedAt = undefined;
        lane.reset = undefined;
        drain();
      }, 60_000);
    });
  } finally {
    lane.active--;
    lane.exclusive = false;
    drain();
  }
}
