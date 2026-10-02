export const ACP_RUNTIME_LOGICAL_TIME_V1 = "ACP_RUNTIME_LOGICAL_TIME_V1";
function defaultMacrotaskYield() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
export function createAcpRuntimeReplayLogicalTime(args) {
    const pending = new Map();
    const warningSet = new Set();
    const yieldToMacrotask = args.yieldToMacrotask || defaultMacrotaskYield;
    let currentOffsetMs = 0;
    let registrationSequence = 0;
    let disposed = false;
    const releasedWriteBearing = [];
    const captureAt = async (offsetMs) => {
        if (disposed)
            return;
        currentOffsetMs = Math.max(currentOffsetMs, offsetMs);
        const inspection = await args.inspect();
        for (const warning of inspection.warnings)
            warningSet.add(warning);
        for (const descriptor of inspection.timers) {
            if (pending.has(descriptor.nativeToken))
                continue;
            if (!descriptor.detachNative())
                continue;
            registrationSequence += 1;
            pending.set(descriptor.nativeToken, {
                descriptor,
                deadlineMs: currentOffsetMs + Math.max(0, descriptor.delayMs),
                registrationSequence,
            });
        }
    };
    const advanceTo = async (offsetMs) => {
        if (disposed)
            return;
        const targetOffsetMs = Math.max(currentOffsetMs, offsetMs);
        while (!args.signal?.aborted) {
            const due = [...pending.values()]
                .filter((entry) => entry.deadlineMs <= targetOffsetMs)
                .sort((left, right) => left.deadlineMs - right.deadlineMs ||
                left.registrationSequence - right.registrationSequence);
            if (due.length === 0)
                break;
            const batchDeadline = due[0].deadlineMs;
            const batch = due.filter((entry) => entry.deadlineMs === batchDeadline);
            currentOffsetMs = Math.max(currentOffsetMs, batchDeadline);
            for (const entry of batch) {
                if (args.signal?.aborted)
                    break;
                pending.delete(entry.descriptor.nativeToken);
                await entry.descriptor.fireIfCurrent();
            }
            await yieldToMacrotask();
            await captureAt(currentOffsetMs);
        }
        currentOffsetMs = targetOffsetMs;
    };
    return {
        advanceTo,
        captureAt,
        releaseToNative: async (finalOffsetMs) => {
            await advanceTo(finalOffsetMs);
            currentOffsetMs = Math.max(currentOffsetMs, finalOffsetMs);
            const future = [...pending.values()].sort((left, right) => left.deadlineMs - right.deadlineMs ||
                left.registrationSequence - right.registrationSequence);
            for (const entry of future) {
                const resumed = entry.descriptor.resumeNative(Math.max(0, entry.deadlineMs - currentOffsetMs));
                if (resumed && entry.descriptor.fallbackFlush) {
                    releasedWriteBearing.push(entry.descriptor);
                }
                pending.delete(entry.descriptor.nativeToken);
            }
            return {
                ok: warningSet.size === 0,
                warnings: [...warningSet],
            };
        },
        flushWriteBearing: async () => {
            let ok = true;
            for (const descriptor of releasedWriteBearing.splice(0)) {
                try {
                    if (!(await descriptor.fallbackFlush?.()))
                        ok = false;
                }
                catch (error) {
                    ok = false;
                    warningSet.add(`logical-write-fallback-failed:${descriptor.domain}:${error instanceof Error ? error.message : String(error)}`);
                }
            }
            if (!ok)
                warningSet.add("logical-write-fallback-incomplete");
            return { ok, warnings: [...warningSet] };
        },
        dispose: () => {
            disposed = true;
            pending.clear();
            releasedWriteBearing.length = 0;
        },
        pendingCount: () => pending.size,
        warnings: () => [...warningSet],
    };
}
