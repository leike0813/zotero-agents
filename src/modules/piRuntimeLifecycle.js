import { resolveNativeAbortControllerConstructor } from "../utils/wait";
const HOUR_MS = 60 * 60 * 1000;
export const PI_SHUTDOWN_BUDGET_MS = 15_000;
export const PI_PROVIDER_INACTIVITY_MS = 5 * 60 * 1000;
export const PI_PROVIDER_HARD_LIMIT_MS = HOUR_MS;
/**
 * Accepted active-turn capacities. Production ships the default until a
 * performance run selects a higher passing value on Windows and Linux.
 */
export const PI_RUNTIME_CAPACITY_OPTIONS = [4, 6, 8, 12];
export const PI_RUNTIME_CAPACITY_DEFAULT = 12;
/** Slots kept free so a foreground turn never waits behind background work. */
export const PI_RUNTIME_FOREGROUND_RESERVE = 2;
/**
 * Resolves the active-turn capacity. The value comes from the build-only
 * `__PI_RUNTIME_CAPACITY__` define or an explicit factory option; anything
 * outside the accepted set keeps the shipped default.
 */
export function resolvePiRuntimeCapacity(value) {
    return PI_RUNTIME_CAPACITY_OPTIONS.includes(value)
        ? value
        : PI_RUNTIME_CAPACITY_DEFAULT;
}
function builtPiRuntimeCapacity() {
    return typeof __PI_RUNTIME_CAPACITY__ === "number"
        ? __PI_RUNTIME_CAPACITY__
        : undefined;
}
export function createPiRuntimeLifecycle(options = {}) {
    const capacity = resolvePiRuntimeCapacity(options.capacity ?? builtPiRuntimeCapacity());
    const backgroundCapacity = capacity - PI_RUNTIME_FOREGROUND_RESERVE;
    const monotonicNow = options.monotonicNow ??
        (() => {
            if (typeof globalThis.performance?.now === "function")
                return globalThis.performance.now();
            const window = globalThis.Zotero?.getMainWindow?.();
            if (typeof window?.performance?.now === "function")
                return window.performance.now();
            const telemetry = globalThis.Services?.telemetry;
            if (typeof telemetry?.msSinceProcessStart === "number")
                return telemetry.msSinceProcessStart;
            throw new Error("monotonic_clock_unavailable");
        });
    const wallNow = options.wallNow ?? Date.now;
    let closed = false;
    let skillAdmissionOpen = true;
    let maintenance;
    let dailyTimer;
    let nextLane = "foreground";
    const active = new Set();
    const queues = { foreground: [], background: [] };
    const pump = () => {
        if (closed)
            return;
        while (active.size < capacity) {
            const backgroundCount = [...active].filter((entry) => entry.lane === "background").length;
            const backgroundReady = queues.background.length > 0 && backgroundCount < backgroundCapacity;
            const lane = queues.foreground.length &&
                (!backgroundReady || nextLane === "foreground")
                ? "foreground"
                : "background";
            if (!queues[lane].length ||
                (lane === "background" && backgroundCount >= backgroundCapacity))
                break;
            const pending = queues[lane].shift();
            pending.detach();
            const input = pending.input;
            const Controller = resolveNativeAbortControllerConstructor();
            if (!Controller) {
                pending.reject(new Error("pi_signal_unavailable"));
                continue;
            }
            const controller = new Controller();
            const abort = () => controller.abort();
            let started;
            try {
                started = monotonicNow();
            }
            catch {
                pending.reject(new Error("monotonic_clock_unavailable"));
                continue;
            }
            const ceiling = (input.owner.kind === "skill_run" ? 8 : 2) * HOUR_MS;
            const budgetMs = Math.min(ceiling, input.budgetMs ?? ceiling);
            const elapsedMs = input.elapsedMs ?? 0;
            let stoppedAt;
            let releasing = false;
            let physical = 0;
            const entry = { lane, owner: input.owner, abort };
            active.add(entry);
            nextLane = lane === "foreground" ? "background" : "foreground";
            input.signal?.addEventListener("abort", abort, { once: true });
            const timer = setTimeout(abort, Math.max(0, budgetMs - elapsedMs));
            // Node tests must not keep the process alive for a production turn budget.
            timer.unref?.();
            const releaseIfSettled = () => {
                if (!releasing || physical)
                    return;
                clearTimeout(timer);
                input.signal?.removeEventListener("abort", abort);
                active.delete(entry);
                pump();
            };
            pending.resolve({
                signal: controller.signal,
                deadline: wallNow() + Math.max(0, budgetMs - elapsedMs),
                checkpoint(resumeEligible) {
                    const activeMs = Math.min(budgetMs, elapsedMs + Math.max(0, (stoppedAt ?? monotonicNow()) - started));
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
                    void settlement.then((outcome) => {
                        if (outcome === "unknown")
                            return;
                        physical--;
                        releaseIfSettled();
                    }, () => undefined);
                },
                release() {
                    if (releasing)
                        return;
                    stoppedAt = monotonicNow();
                    releasing = true;
                    releaseIfSettled();
                },
            });
        }
    };
    const lifecycle = {
        acquire(input) {
            if (closed || input.signal?.aborted)
                return Promise.reject(new Error("runtime_closed"));
            if (input.owner.kind === "skill_run" && !skillAdmissionOpen)
                return Promise.reject(new Error("recovery_accounting_unavailable"));
            if (!input.turnId ||
                !input.owner.ownerId ||
                (input.budgetMs !== undefined &&
                    (!Number.isFinite(input.budgetMs) || input.budgetMs <= 0)) ||
                (input.elapsedMs !== undefined &&
                    (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0))) {
                return Promise.reject(new Error("execution_budget_invalid"));
            }
            const ceiling = (input.owner.kind === "skill_run" ? 8 : 2) * HOUR_MS;
            if ((input.elapsedMs ?? 0) >= Math.min(ceiling, input.budgetMs ?? ceiling))
                return Promise.reject(new Error("execution_budget_exhausted"));
            return new Promise((resolve, reject) => {
                const queue = queues[input.lane];
                const abort = () => {
                    const index = queue.indexOf(pending);
                    if (index >= 0)
                        queue.splice(index, 1);
                    pending.detach();
                    reject(new Error("aborted"));
                };
                const pending = {
                    input,
                    resolve,
                    reject,
                    detach: () => input.signal?.removeEventListener("abort", abort),
                };
                input.signal?.addEventListener("abort", abort, { once: true });
                queue.push(pending);
                pump();
            });
        },
        setSkillAdmissionOpen(open) {
            skillAdmissionOpen = open && !closed;
        },
        get skillAdmissionOpen() {
            return skillAdmissionOpen;
        },
        hasPhysicalHold(owner) {
            return [...active].some((entry) => !owner ||
                (entry.owner.kind === owner.kind &&
                    entry.owner.ownerId === owner.ownerId));
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
        maintain(task) {
            if (closed)
                return Promise.resolve();
            if (maintenance)
                return maintenance;
            maintenance = Promise.resolve()
                .then(task)
                .finally(() => {
                maintenance = undefined;
            });
            return maintenance;
        },
        scheduleMaintenance(task) {
            if (closed || dailyTimer !== undefined)
                return;
            const schedule = () => {
                dailyTimer = setTimeout(() => {
                    dailyTimer = undefined;
                    void lifecycle
                        .maintain(task)
                        .catch(() => undefined)
                        .finally(() => {
                        if (!closed)
                            schedule();
                    });
                }, 24 * HOUR_MS);
                dailyTimer.unref?.();
            };
            schedule();
        },
        closeAdmission() {
            if (closed)
                return;
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
            for (const entry of active)
                entry.abort();
        },
        get closed() {
            return closed;
        },
    };
    return lifecycle;
}
let singleton;
export function getPiRuntimeLifecycle() {
    return (singleton ??= createPiRuntimeLifecycle());
}
export function resetPiRuntimeLifecycleForTests() {
    singleton?.closeAdmission();
    singleton = undefined;
}
/** Restores reservations before opening admission; per-owner recovery is serial. */
export async function startPiRuntimeLifecycle(input) {
    const lifecycle = getPiRuntimeLifecycle();
    lifecycle.setSkillAdmissionOpen(false);
    try {
        const restored = await input.restoreReservations();
        if (lifecycle.closed)
            return;
        lifecycle.setSkillAdmissionOpen(restored);
        const recoverAndClean = async () => {
            await input.recover();
            if (lifecycle.closed)
                return;
            await input.cleanup();
        };
        void lifecycle.maintain(recoverAndClean).catch(() => undefined);
        // Daily maintenance retries cleanup only. Operation observation belongs to
        // startup, late evidence and explicit user checks, never a polling timer.
        lifecycle.scheduleMaintenance(async () => {
            await input.cleanup();
        });
    }
    catch {
        lifecycle.setSkillAdmissionOpen(false);
    }
}
/** Bounded observation; expiry never claims the underlying task has settled. */
export async function waitForPiShutdown(task, deadline) {
    let timer;
    try {
        return await Promise.race([
            task,
            new Promise((resolve) => {
                timer = setTimeout(() => resolve(undefined), Math.max(0, deadline - Date.now()));
            }),
        ]);
    }
    finally {
        clearTimeout(timer);
    }
}
