import { isDebugModeEnabled } from "./debugMode";
import { incrementAcpRuntimeMetric, observeAcpRuntimeDuration, readAcpRuntimePerformanceClockMs, } from "./acp/diagnostics/acpRuntimePerformanceProfiler";
export const BUFFERED_WRITE_DELAY_MS = 2000;
export const BUFFERED_WRITE_MAX_BYTES = 128 * 1024;
export const BUFFERED_WRITE_MAX_ENTRIES = 256;
const states = new Map();
function normalizeHardPendingLimit(value) {
    if (!value) {
        return undefined;
    }
    return {
        maxEntries: Math.max(1, Math.floor(value.maxEntries)),
        maxBytes: Math.max(1, Math.floor(value.maxBytes)),
        overflow: "drop-oldest",
        onOverflow: value.onOverflow,
    };
}
function enforceHardPendingLimit(state) {
    const limit = state.hardPendingLimit;
    if (!limit) {
        return;
    }
    let droppedEntries = 0;
    let droppedBytes = 0;
    while (state.pending.length > limit.maxEntries ||
        state.pendingBytes > limit.maxBytes) {
        const dropped = state.pending.shift();
        if (!dropped) {
            break;
        }
        state.pendingBytes = Math.max(0, state.pendingBytes - dropped.bytes);
        droppedEntries += 1;
        droppedBytes += dropped.bytes;
    }
    if (droppedEntries === 0) {
        return;
    }
    state.diagnostics.droppedEntries += droppedEntries;
    state.diagnostics.droppedBytes += droppedBytes;
    if (!state.overflowActive) {
        state.overflowActive = true;
        state.diagnostics.overflowEpisodes += 1;
    }
    try {
        limit.onOverflow?.({
            droppedEntries,
            droppedBytes,
            overflowEpisode: state.diagnostics.overflowEpisodes,
        });
    }
    catch {
        // Diagnostic overflow reporting must never affect the write owner.
    }
}
function clearTimer(state) {
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }
}
function configureKeyState(args) {
    let state = states.get(args.key);
    if (!state) {
        state = {
            key: args.key,
            owner: args.owner,
            sink: args.sink,
            pending: [],
            pendingBytes: 0,
            timer: null,
            draining: null,
            failed: false,
            performanceProfileRequestId: args.performanceProfileRequestId,
            performanceChannel: args.performanceChannel,
            hardPendingLimit: normalizeHardPendingLimit(args.hardPendingLimit),
            overflowActive: false,
            discarded: false,
            diagnostics: {
                logicalEntries: 0,
                physicalWriteCycles: 0,
                bytes: 0,
                forcedFlushes: 0,
                failures: 0,
                retries: 0,
                droppedEntries: 0,
                droppedBytes: 0,
                overflowEpisodes: 0,
            },
        };
        states.set(args.key, state);
    }
    state.owner = args.owner;
    state.sink = args.sink;
    state.performanceProfileRequestId = args.performanceProfileRequestId;
    state.performanceChannel = args.performanceChannel;
    state.hardPendingLimit = normalizeHardPendingLimit(args.hardPendingLimit);
    return state;
}
/**
 * Makes a key known to the coordinator without queueing any entry, so a
 * snapshot barrier can hold a fixed watermark for an owner that has not
 * admitted a record yet. Enqueuing later reuses this state.
 */
export function registerBufferedWriteKey(args) {
    return configureKeyState(args);
}
function schedule(state) {
    if (state.discarded ||
        state.timer ||
        state.draining ||
        state.pending.length === 0) {
        return;
    }
    state.timer = setTimeout(() => {
        state.timer = null;
        void drain(state).catch(() => undefined);
    }, BUFFERED_WRITE_DELAY_MS);
}
async function drain(state) {
    if (state.draining) {
        await state.draining;
        return;
    }
    if (state.pending.length === 0) {
        return;
    }
    clearTimer(state);
    const batch = state.pending;
    const batchBytes = state.pendingBytes;
    state.pending = [];
    state.pendingBytes = 0;
    const wasRetry = state.failed;
    const startedAt = __acp_runtime_performance_profiler_enabled__ &&
        (typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__)
        ? readAcpRuntimePerformanceClockMs()
        : 0;
    const write = (async () => {
        state.diagnostics.physicalWriteCycles += 1;
        if (wasRetry) {
            state.diagnostics.retries += 1;
        }
        try {
            await state.sink(batch.map((entry) => entry.value));
            state.failed = false;
            state.overflowActive = false;
        }
        catch (error) {
            state.diagnostics.failures += 1;
            state.failed = true;
            state.pending = [...batch, ...state.pending];
            state.pendingBytes += batchBytes;
            enforceHardPendingLimit(state);
            throw error;
        }
    })();
    state.draining = write;
    try {
        await write;
    }
    finally {
        if (__acp_runtime_performance_profiler_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            const labels = {
                persistenceChannel: state.performanceChannel || "other",
            };
            incrementAcpRuntimeMetric(state.performanceProfileRequestId, "buffered_write_batch", labels);
            incrementAcpRuntimeMetric(state.performanceProfileRequestId, "buffered_write_bytes", labels, batchBytes);
            observeAcpRuntimeDuration(state.performanceProfileRequestId, "buffered_write_duration", labels, readAcpRuntimePerformanceClockMs() - startedAt);
        }
        if (state.draining === write) {
            state.draining = null;
        }
        if (!state.failed && !state.discarded) {
            schedule(state);
        }
    }
}
export function enqueueBufferedWrite(args) {
    const state = configureKeyState(args);
    const bytes = Math.max(0, Math.floor(args.bytes));
    state.pending.push({ value: args.entry, bytes });
    state.pendingBytes += bytes;
    state.diagnostics.logicalEntries += 1;
    state.diagnostics.bytes += bytes;
    enforceHardPendingLimit(state);
    if (state.pending.length >= BUFFERED_WRITE_MAX_ENTRIES ||
        state.pendingBytes >= BUFFERED_WRITE_MAX_BYTES) {
        void drain(state).catch(() => undefined);
    }
    else {
        schedule(state);
    }
}
export async function flushBufferedWriteKey(key) {
    const state = states.get(key);
    if (!state) {
        return;
    }
    state.diagnostics.forcedFlushes += 1;
    clearTimer(state);
    while (state.draining || state.pending.length > 0) {
        if (state.draining) {
            await state.draining;
        }
        else {
            await drain(state);
        }
    }
}
/**
 * Takes the entries pending at this instant and settles exactly that batch, so
 * the caller gets a fixed watermark. Anything appended afterwards stays
 * pending for a later drain and cannot extend the batch. This never re-checks
 * pending, so an active producer cannot drag the caller along with it.
 */
export async function captureBufferedWriteKeys(keys, capture) {
    let release;
    const held = new Promise((resolve) => {
        release = resolve;
    });
    // Capture every pending batch before the first await. The existing draining
    // slot also covers snapshot I/O, so deletion waits and later drains queue.
    const captured = keys.flatMap((key) => {
        const state = states.get(key);
        if (!state)
            return [];
        const prior = state.draining;
        const batch = state.pending;
        const bytes = state.pendingBytes;
        const sink = state.sink;
        clearTimer(state);
        state.pending = [];
        state.pendingBytes = 0;
        state.draining = held;
        return [{ state, prior, batch, bytes, sink }];
    });
    try {
        await Promise.allSettled(captured.map(async ({ state, prior, batch, bytes, sink }) => {
            await prior?.catch(() => undefined);
            if (state.discarded || !batch.length)
                return;
            state.diagnostics.physicalWriteCycles += 1;
            try {
                await sink(batch.map((entry) => entry.value));
                state.failed = false;
            }
            catch {
                state.failed = true;
                state.diagnostics.failures += 1;
                if (!state.discarded) {
                    state.pending = [...batch, ...state.pending];
                    state.pendingBytes += bytes;
                    enforceHardPendingLimit(state);
                }
            }
        }));
        return await capture();
    }
    finally {
        release();
        for (const { state } of captured) {
            if (state.draining === held)
                state.draining = null;
            if (!state.discarded && !state.failed)
                schedule(state);
        }
    }
}
export async function flushBufferedWriteOwner(owner) {
    const keys = Array.from(states.values())
        .filter((state) => state.owner === owner)
        .map((state) => state.key);
    await Promise.all(keys.map((key) => flushBufferedWriteKey(key)));
}
export async function flushAllBufferedWrites() {
    await Promise.all(Array.from(states.keys()).map((key) => flushBufferedWriteKey(key)));
}
export function getBufferedWriteDiagnosticsForTests() {
    return Array.from(states.values()).map((state) => ({
        key: state.key,
        owner: state.owner,
        ...state.diagnostics,
        pendingEntries: state.pending.length,
        pendingBytes: state.pendingBytes,
    }));
}
export function discardBufferedWriteKey(key) {
    const state = states.get(key);
    if (!state) {
        return;
    }
    state.discarded = true;
    clearTimer(state);
    states.delete(key);
}
export async function discardBufferedWriteKeyAndWait(key) {
    const state = states.get(key);
    if (!state) {
        return;
    }
    state.discarded = true;
    state.pending = [];
    state.pendingBytes = 0;
    clearTimer(state);
    states.delete(key);
    if (state.draining) {
        await Promise.allSettled([state.draining]);
    }
}
export async function resetBufferedWriteCoordinatorForTests() {
    await Promise.allSettled(Array.from(states.keys()).map((key) => flushBufferedWriteKey(key)));
    for (const state of states.values()) {
        clearTimer(state);
    }
    states.clear();
}
