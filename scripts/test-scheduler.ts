import os from "node:os";

export function testWorkerCount(
  value?: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const count =
    value === undefined
      ? Math.min(os.availableParallelism(), env.CI ? 2 : 8)
      : Number(value);
  if (!Number.isInteger(count) || count < 1)
    throw new Error("test_jobs_must_be_positive_integer");
  return Math.min(count, os.availableParallelism());
}

/** Results retain inventory order; undefined means cancellation prevented dispatch. */
export async function runBoundedTests<T, R>(
  entries: readonly T[],
  concurrency: number,
  run: (entry: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<Array<R | undefined>> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error("invalid_test_concurrency");
  const results: Array<R | undefined> = Array(entries.length).fill(undefined);
  let next = 0;
  const workers = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
      while (!signal?.aborted && next < entries.length) {
        const index = next++;
        results[index] = await run(entries[index], index);
      }
    }),
  );
  for (const worker of workers)
    if (worker.status === "rejected") throw worker.reason;
  return results;
}
