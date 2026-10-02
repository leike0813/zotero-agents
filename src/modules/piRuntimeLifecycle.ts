import type { PiExecutionCheckpoint } from "./piOwnerPersistence";
import type { PiOwnerRef } from "./piTranscriptStore";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import { record as recordPiRuntimeAudit } from "./piRuntimeAudit";

declare const __PI_RUNTIME_CAPACITY__: number;

const HOUR_MS = 60 * 60 * 1000;
export const PI_SHUTDOWN_BUDGET_MS = 15_000;
export const PI_PROVIDER_INACTIVITY_MS = 5 * 60 * 1000;
export const PI_PROVIDER_HARD_LIMIT_MS = HOUR_MS;
/**
 * Accepted active-turn capacities. Production ships the default until a
 * performance run selects a higher passing value on Windows and Linux.
 */
export const PI_RUNTIME_CAPACITY_OPTIONS = [4, 6, 8, 12] as const;
export const PI_RUNTIME_CAPACITY_DEFAULT = 12;
/** Slots kept free so a foreground turn never waits behind background work. */
export const PI_RUNTIME_FOREGROUND_RESERVE = 2;

/**
 * Resolves the active-turn capacity. The value comes from the build-only
 * `__PI_RUNTIME_CAPACITY__` define or an explicit factory option; anything
 * outside the accepted set keeps the shipped default.
 */
export function resolvePiRuntimeCapacity(value: unknown): number {
  return PI_RUNTIME_CAPACITY_OPTIONS.includes(
    value as (typeof PI_RUNTIME_CAPACITY_OPTIONS)[number],
  )
    ? (value as number)
    : PI_RUNTIME_CAPACITY_DEFAULT;
}

function builtPiRuntimeCapacity(): number | undefined {
  return typeof __PI_RUNTIME_CAPACITY__ === "number"
    ? __PI_RUNTIME_CAPACITY__
    : undefined;
}

export type PiPhysicalSettlement = "settled" | "unknown";

export type PiExecutionLease = {
  readonly signal: AbortSignal;
  readonly deadline: number;
  checkpoint(resumeEligible: boolean): PiExecutionCheckpoint;
  trackPhysical(settlement: Promise<void | PiPhysicalSettlement>): void;
  release(): void;
};

type Admission = {
  owner: PiOwnerRef;
  turnId: string;
  lane: "foreground" | "background";
  budgetMs?: number;
  elapsedMs?: number;
  signal?: AbortSignal;
};

export function createPiRuntimeLifecycle(
  options: {
    monotonicNow?: () => number;
    wallNow?: () => number;
    /** Explicit capacity for performance exploration; production uses the define. */
    capacity?: number;
  } = {},
) {
  const capacity = resolvePiRuntimeCapacity(
    options.capacity ?? builtPiRuntimeCapacity(),
  );
  const backgroundCapacity = capacity - PI_RUNTIME_FOREGROUND_RESERVE;
  const monotonicNow =
    options.monotonicNow ??
    (() => {
      if (typeof globalThis.performance?.now === "function")
        return globalThis.performance.now();
      const window = (
        globalThis as { Zotero?: { getMainWindow?: () => Window } }
      ).Zotero?.getMainWindow?.();
      if (typeof window?.performance?.now === "function")
        return window.performance.now();
      const telemetry = (
        globalThis as {
          Services?: { telemetry?: { msSinceProcessStart?: number } };
        }
      ).Services?.telemetry;
      if (typeof telemetry?.msSinceProcessStart === "number")
        return telemetry.msSinceProcessStart;
      throw new Error("monotonic_clock_unavailable");
    });
  const wallNow = options.wallNow ?? Date.now;
  let closed = false;
  let skillAdmissionOpen = true;
  let maintenance: Promise<void> | undefined;
  let dailyTimer: ReturnType<typeof setTimeout> | undefined;
  let nextLane: Admission["lane"] = "foreground";
  const active = new Set<{
    lane: Admission["lane"];
    owner: PiOwnerRef;
    abort(): void;
  }>();
  const queues: Record<
    Admission["lane"],
    {
      input: Admission;
      queuedAt: number;
      reservedAvailable: boolean;
      resolve(lease: PiExecutionLease): void;
      reject(error: Error): void;
      detach(): void;
    }[]
  > = { foreground: [], background: [] };

  const pump = () => {
    if (closed) return;
    while (active.size < capacity) {
      const backgroundCount = [...active].filter(
        (entry) => entry.lane === "background",
      ).length;
      const backgroundReady =
        queues.background.length > 0 && backgroundCount < backgroundCapacity;
      const lane: Admission["lane"] =
        queues.foreground.length &&
        (!backgroundReady || nextLane === "foreground")
          ? "foreground"
          : "background";
      if (
        !queues[lane].length ||
        (lane === "background" && backgroundCount >= backgroundCapacity)
      )
        break;
      const pending = queues[lane].shift()!;
      pending.detach();
      const input = pending.input;
      const Controller = resolveNativeAbortControllerConstructor();
      if (!Controller) {
        pending.reject(new Error("pi_signal_unavailable"));
        continue;
      }
      const controller = new Controller();
      const abort = () => controller.abort();
      let started: number;
      try {
        started = monotonicNow();
      } catch {
        pending.reject(new Error("monotonic_clock_unavailable"));
        continue;
      }
      const ceiling = (input.owner.kind === "skill_run" ? 8 : 2) * HOUR_MS;
      const budgetMs = Math.min(ceiling, input.budgetMs ?? ceiling);
      const elapsedMs = input.elapsedMs ?? 0;
      let stoppedAt: number | undefined;
      let releasing = false;
      let physical = 0;
      const entry = { lane, owner: input.owner, abort };
      active.add(entry);
      recordPiRuntimeAudit({
        operation: "queue.capacity",
        origin: "runtime",
        correlation: { turnId: input.turnId },
        attributes: {
          lane,
          capacity,
          activeCount: active.size,
          waitMs: Math.max(0, started - pending.queuedAt),
          reservedAvailable: pending.reservedAvailable,
        },
      });
      nextLane = lane === "foreground" ? "background" : "foreground";
      input.signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, Math.max(0, budgetMs - elapsedMs));
      // Node tests must not keep the process alive for a production turn budget.
      (timer as unknown as { unref?: () => void }).unref?.();
      const releaseIfSettled = () => {
        if (!releasing || physical) return;
        clearTimeout(timer);
        input.signal?.removeEventListener("abort", abort);
        active.delete(entry);
        pump();
      };
      pending.resolve({
        signal: controller.signal,
        deadline: wallNow() + Math.max(0, budgetMs - elapsedMs),
        checkpoint(resumeEligible) {
          const activeMs = Math.min(
            budgetMs,
            elapsedMs + Math.max(0, (stoppedAt ?? monotonicNow()) - started),
          );
          return {
            version: 1,
            turnId: input.turnId,
            budgetMs,
            activeMs,
            remainingMs: Math.max(0, budgetMs - activeMs),
            resumeEligible: resumeEligible && activeMs < budgetMs,
          };
        },
        trackPhysical(settlement) {
          if (releasing && !active.has(entry))
            throw new Error("execution_lease_released");
          physical++;
          void settlement.then(
            (outcome) => {
              if (outcome === "unknown") return;
              physical--;
              releaseIfSettled();
            },
            () => undefined,
          );
        },
        release() {
          if (releasing) return;
          stoppedAt = monotonicNow();
          releasing = true;
          releaseIfSettled();
        },
      });
    }
  };

  const lifecycle = {
    acquire(input: Admission): Promise<PiExecutionLease> {
      if (closed || input.signal?.aborted)
        return Promise.reject(new Error("runtime_closed"));
      if (input.owner.kind === "skill_run" && !skillAdmissionOpen)
        return Promise.reject(new Error("recovery_accounting_unavailable"));
      if (
        !input.turnId ||
        !input.owner.ownerId ||
        (input.budgetMs !== undefined &&
          (!Number.isFinite(input.budgetMs) || input.budgetMs <= 0)) ||
        (input.elapsedMs !== undefined &&
          (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0))
      ) {
        return Promise.reject(new Error("execution_budget_invalid"));
      }
      const ceiling = (input.owner.kind === "skill_run" ? 8 : 2) * HOUR_MS;
      if (
        (input.elapsedMs ?? 0) >= Math.min(ceiling, input.budgetMs ?? ceiling)
      )
        return Promise.reject(new Error("execution_budget_exhausted"));
      return new Promise((resolve, reject) => {
        const queue = queues[input.lane];
        const abort = () => {
          const index = queue.indexOf(pending);
          if (index >= 0) queue.splice(index, 1);
          pending.detach();
          reject(new Error("aborted"));
        };
        const pending = {
          input,
          queuedAt: monotonicNow(),
          reservedAvailable: active.size < capacity,
          resolve,
          reject,
          detach: () => input.signal?.removeEventListener("abort", abort),
        };
        input.signal?.addEventListener("abort", abort, { once: true });
        queue.push(pending);
        pump();
      });
    },
    setSkillAdmissionOpen(open: boolean) {
      skillAdmissionOpen = open && !closed;
    },
    get skillAdmissionOpen() {
      return skillAdmissionOpen;
    },
    hasPhysicalHold(owner?: PiOwnerRef) {
      return [...active].some(
        (entry) =>
          !owner ||
          (entry.owner.kind === owner.kind &&
            entry.owner.ownerId === owner.ownerId),
      );
    },
    get activeCount() {
      return active.size;
    },
    get capacity() {
      return capacity;
    },
    get backgroundCapacity() {
      return backgroundCapacity;
    },
    maintain(task: () => Promise<void>): Promise<void> {
      if (closed) return Promise.resolve();
      if (maintenance) return maintenance;
      maintenance = Promise.resolve()
        .then(task)
        .finally(() => {
          maintenance = undefined;
        });
      return maintenance;
    },
    scheduleMaintenance(task: () => Promise<void>) {
      if (closed || dailyTimer !== undefined) return;
      const schedule = () => {
        dailyTimer = setTimeout(() => {
          dailyTimer = undefined;
          void lifecycle
            .maintain(task)
            .catch(() => undefined)
            .finally(() => {
              if (!closed) schedule();
            });
        }, 24 * HOUR_MS);
        (dailyTimer as unknown as { unref?: () => void }).unref?.();
      };
      schedule();
    },
    closeAdmission() {
      if (closed) return;
      closed = true;
      skillAdmissionOpen = false;
      clearTimeout(dailyTimer);
      dailyTimer = undefined;
      for (const queue of Object.values(queues)) {
        for (const pending of queue.splice(0)) {
          pending.detach();
          pending.reject(new Error("runtime_closed"));
        }
      }
      for (const entry of active) entry.abort();
    },
    get closed() {
      return closed;
    },
  };
  return lifecycle;
}

let singleton: ReturnType<typeof createPiRuntimeLifecycle> | undefined;
export function getPiRuntimeLifecycle() {
  return (singleton ??= createPiRuntimeLifecycle());
}
export function resetPiRuntimeLifecycleForTests() {
  singleton?.closeAdmission();
  singleton = undefined;
}

/** Restores reservations before opening admission; per-owner recovery is serial. */
export async function startPiRuntimeLifecycle(input: {
  restoreReservations(): Promise<boolean>;
  recover(): Promise<void>;
  cleanup(): Promise<unknown>;
}) {
  const lifecycle = getPiRuntimeLifecycle();
  lifecycle.setSkillAdmissionOpen(false);
  try {
    const restored = await input.restoreReservations();
    if (lifecycle.closed) return;
    lifecycle.setSkillAdmissionOpen(restored);
    const recoverAndClean = async () => {
      await input.recover();
      if (lifecycle.closed) return;
      await input.cleanup();
    };
    void lifecycle.maintain(recoverAndClean).catch(() => undefined);
    // Daily maintenance retries cleanup only. Operation observation belongs to
    // startup, late evidence and explicit user checks, never a polling timer.
    lifecycle.scheduleMaintenance(async () => {
      await input.cleanup();
    });
  } catch {
    lifecycle.setSkillAdmissionOpen(false);
  }
}

/** Bounded observation; expiry never claims the underlying task has settled. */
export async function waitForPiShutdown<T>(
  task: Promise<T>,
  deadline: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(
          () => resolve(undefined),
          Math.max(0, deadline - Date.now()),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
