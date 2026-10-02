import { discardBufferedWriteKey, discardBufferedWriteKeyAndWait, captureBufferedWriteKeys, enqueueBufferedWrite, flushBufferedWriteKey, registerBufferedWriteKey, } from "./bufferedWriteCoordinator";
export const RUNTIME_AUDIT_MAX_PENDING_ENTRIES = 2048;
export const RUNTIME_AUDIT_MAX_PENDING_BYTES = 2 * 1024 * 1024;
export function createRuntimeAuditAppendQueue(args) {
    const keysByOwner = new Map();
    const maxPendingEntries = args.maxPendingEntries ?? RUNTIME_AUDIT_MAX_PENDING_ENTRIES;
    const maxPendingBytes = args.maxPendingBytes ?? RUNTIME_AUDIT_MAX_PENDING_BYTES;
    function keysForOwner(owner) {
        return Array.from(keysByOwner.entries())
            .filter(([, entryOwner]) => typeof owner === "undefined" || entryOwner === owner)
            .map(([key]) => key);
    }
    function trackKey(track) {
        keysByOwner.set(track.key, track.owner);
        return {
            key: track.key,
            owner: track.coordinatorOwner,
            performanceProfileRequestId: track.requestId,
            performanceChannel: "audit",
            hardPendingLimit: {
                maxEntries: maxPendingEntries,
                maxBytes: maxPendingBytes,
                overflow: "drop-oldest",
                onOverflow: (event) => {
                    args.log({
                        kind: "overflow",
                        key: track.key,
                        owner: track.owner,
                        path: track.path,
                        requestId: track.requestId,
                        ...event,
                    });
                },
            },
            sink: async (lines) => {
                try {
                    await args.sink({ owner: track.owner, path: track.path, lines });
                }
                catch (error) {
                    args.log({
                        kind: "append-failed",
                        key: track.key,
                        owner: track.owner,
                        path: track.path,
                        requestId: track.requestId,
                        error,
                    });
                    throw error;
                }
            },
        };
    }
    return {
        bind(bindArgs) {
            registerBufferedWriteKey(trackKey(bindArgs));
        },
        append(appendArgs) {
            const tracked = trackKey(appendArgs);
            enqueueBufferedWrite({
                ...tracked,
                entry: appendArgs.line,
                bytes: new TextEncoder().encode(appendArgs.line).length,
            });
        },
        keysForOwner,
        async barrier(owner, capture) {
            return captureBufferedWriteKeys(keysForOwner(owner), capture);
        },
        async flush(owner) {
            await Promise.all(keysForOwner(owner).map((key) => flushBufferedWriteKey(key)));
        },
        async release(owner) {
            const keys = keysForOwner(owner);
            await Promise.allSettled(keys.map((key) => flushBufferedWriteKey(key)));
            for (const key of keys) {
                discardBufferedWriteKey(key);
                keysByOwner.delete(key);
            }
        },
        async discardAndWait(owner) {
            const keys = keysForOwner(owner);
            await Promise.allSettled(keys.map((key) => discardBufferedWriteKeyAndWait(key)));
            for (const key of keys) {
                keysByOwner.delete(key);
            }
        },
        async flushAndDiscardAll() {
            await Promise.allSettled(Array.from(keysByOwner.keys()).map((key) => flushBufferedWriteKey(key)));
            for (const key of keysByOwner.keys()) {
                discardBufferedWriteKey(key);
            }
            keysByOwner.clear();
        },
        discardAll() {
            for (const key of keysByOwner.keys()) {
                discardBufferedWriteKey(key);
            }
            keysByOwner.clear();
        },
    };
}
