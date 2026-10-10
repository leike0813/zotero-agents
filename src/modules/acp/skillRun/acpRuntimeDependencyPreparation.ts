import {
  BoundedWaitError,
  createCancellationController,
  type CancellationSignal,
} from "../../../utils/wait";

export const ACP_DEPENDENCY_PREPARATION_TIMEOUT_MS = 15 * 60 * 1000;

export type AcpDependencyPreparationContext = {
  command: string;
  args: string[];
  cwd: string;
  environment: Record<string, string>;
};

export type AcpDependencyPreparationExecution = {
  signal: CancellationSignal;
  deadline: number;
};

export function createAcpDependencyPreparationScheduler<T>() {
  type Waiter = {
    deadline: number;
    settle: (result: { value: T } | { error: unknown }) => void;
  };
  type Job = {
    key: string;
    background: boolean;
    execute: (options: AcpDependencyPreparationExecution) => Promise<T>;
    controller: ReturnType<typeof createCancellationController>;
    waiters: Set<Waiter>;
  };
  const jobs = new Map<string, Job>();
  const queue: Job[] = [];
  let active: Promise<void> | undefined;
  let activeJob: Job | undefined;
  let stopped = false;
  const forget = (job: Job) => {
    if (jobs.get(job.key) === job) jobs.delete(job.key);
  };
  const release = (job: Job, waiter: Waiter) => {
    job.waiters.delete(waiter);
    if (!job.waiters.size) {
      forget(job);
      job.controller.abort();
      const index = queue.indexOf(job);
      if (index >= 0) queue.splice(index, 1);
    }
  };
  const pump = () => {
    if (stopped || active || !queue.length) return;
    const index = queue.findIndex((job) => !job.background);
    const job = queue.splice(index < 0 ? 0 : index, 1)[0];
    activeJob = job;
    const finish = (result: { value: T } | { error: unknown }) => {
      forget(job);
      for (const waiter of [...job.waiters]) waiter.settle(result);
    };
    active = Promise.resolve()
      .then(() => {
        if (job.controller.signal.aborted)
          throw new BoundedWaitError({
            kind: "canceled",
            phase: "runtime-dependency-preparation",
          });
        return job.execute({
          signal: job.controller.signal,
          deadline: Math.min(
            Date.now() + ACP_DEPENDENCY_PREPARATION_TIMEOUT_MS,
            Math.max(...[...job.waiters].map((waiter) => waiter.deadline)),
          ),
        });
      })
      .then(
        (value) => finish({ value }),
        (error) => finish({ error }),
      )
      .finally(() => {
        active = undefined;
        activeJob = undefined;
        pump();
      });
  };
  return {
    prepare(
      context: AcpDependencyPreparationContext,
      execute: (options: AcpDependencyPreparationExecution) => Promise<T>,
      options: {
        background?: boolean;
        signal?: CancellationSignal;
        timeoutMs?: number;
        timeoutGraceMs?: number;
      } = {},
    ): Promise<T> {
      if (stopped || options.signal?.aborted)
        return Promise.reject(
          new BoundedWaitError({
            kind: "canceled",
            phase: "runtime-dependency-preparation",
          }),
        );
      const key = JSON.stringify([
        context.command,
        context.args,
        context.cwd,
        Object.entries(context.environment).sort(),
      ]);
      let job = jobs.get(key);
      if (!job) {
        job = {
          key,
          background: options.background === true,
          execute,
          controller: createCancellationController(),
          waiters: new Set(),
        };
        jobs.set(key, job);
        queue.push(job);
      }
      if (!options.background) job.background = false;
      const owner = job;
      const timeoutMs = Math.max(
        1,
        options.timeoutMs ?? ACP_DEPENDENCY_PREPARATION_TIMEOUT_MS,
      );
      const promise = new Promise<T>((resolve, reject) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const waiter: Waiter = {
          deadline: Date.now() + timeoutMs,
          settle(result) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            release(owner, waiter);
            if ("value" in result) resolve(result.value);
            else reject(result.error);
          },
        };
        const onAbort = () =>
          waiter.settle({
            error: new BoundedWaitError({
              kind: "canceled",
              phase: "runtime-dependency-preparation",
            }),
          });
        owner.waiters.add(waiter);
        options.signal?.addEventListener("abort", onAbort, { once: true });
        if (!settled)
          timer = setTimeout(() => {
            const expire = () =>
              waiter.settle({
                error: new BoundedWaitError({
                  kind: "timed-out",
                  phase: "runtime-dependency-preparation",
                  timeoutMs,
                }),
              });
            if (
              activeJob === owner &&
              owner.waiters.size === 1 &&
              options.timeoutGraceMs
            ) {
              // Stop work at the deadline, then allow bounded output/termination collection.
              forget(owner);
              owner.controller.abort();
              timer = setTimeout(expire, options.timeoutGraceMs);
            } else expire();
          }, timeoutMs);
      });
      pump();
      return promise;
    },
    async shutdown() {
      stopped = true;
      const owned = new Set(jobs.values());
      if (activeJob) owned.add(activeJob);
      for (const job of owned) {
        for (const waiter of [...job.waiters])
          waiter.settle({
            error: new BoundedWaitError({
              kind: "canceled",
              phase: "runtime-dependency-preparation",
            }),
          });
      }
      activeJob?.controller.abort();
      const completion = active;
      if (completion) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          completion,
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 2000);
          }),
        ]);
        clearTimeout(timer);
      }
    },
  };
}
