import { resolveRuntimeWindowCandidates } from "./runtimeBridge";
export function resolveNativeAbortControllerConstructor(owner) {
    const AbortControllerCtor = owner?.["AbortController"] ??
        globalThis["AbortController"] ??
        resolveRuntimeWindowCandidates().find((candidate) => typeof candidate.AbortController ===
            "function")?.AbortController;
    return typeof AbortControllerCtor === "function"
        ? AbortControllerCtor
        : undefined;
}
export function createCancellationController() {
    let aborted = false;
    const listeners = new Set();
    const signal = {
        get aborted() {
            return aborted;
        },
        addEventListener(_type, listener) {
            if (aborted) {
                listener();
                return;
            }
            listeners.add(listener);
        },
        removeEventListener(_type, listener) {
            listeners.delete(listener);
        },
    };
    return {
        signal,
        abort() {
            if (aborted) {
                return;
            }
            aborted = true;
            const pending = Array.from(listeners);
            listeners.clear();
            for (const listener of pending) {
                listener();
            }
        },
    };
}
export class BoundedWaitError extends Error {
    kind;
    phase;
    timeoutMs;
    constructor(args) {
        super(args.kind === "timed-out"
            ? `${args.phase} timed out after ${args.timeoutMs} ms`
            : `${args.phase} canceled`);
        this.name = "BoundedWaitError";
        this.kind = args.kind;
        this.phase = args.phase;
        this.timeoutMs = args.timeoutMs;
    }
}
export function waitForPromiseSettlement(promise, args) {
    return new Promise((resolve) => {
        let active = true;
        let timer;
        const signal = args.signal;
        const clear = () => {
            if (timer !== undefined) {
                clearTimeout(timer);
                timer = undefined;
            }
            signal?.removeEventListener("abort", onAbort);
        };
        const settle = (result) => {
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
        void promise.then((value) => {
            if (!settle({ status: "fulfilled", value })) {
                void Promise.resolve(args.onLateFulfilled?.(value)).catch(() => undefined);
            }
        }, (error) => {
            settle({ status: "rejected", error });
        });
        if (signal?.aborted) {
            onAbort();
            return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        if (args.timeoutMs !== undefined) {
            timer = setTimeout(() => settle({ status: "timed-out" }), Math.max(0, args.timeoutMs));
        }
    });
}
export async function waitForBoundedPromise(promise, args) {
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
export function watchPromiseSettlement(promise, timeoutMs, onTimeout) {
    let active = true;
    const timer = setTimeout(() => {
        if (!active) {
            return;
        }
        active = false;
        void Promise.resolve(onTimeout()).catch(() => undefined);
    }, Math.max(0, timeoutMs));
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
