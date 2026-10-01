import {
  discardBufferedWriteKey,
  discardBufferedWriteKeyAndWait,
  captureBufferedWriteKeys,
  enqueueBufferedWrite,
  flushBufferedWriteKey,
  registerBufferedWriteKey,
} from "./bufferedWriteCoordinator";

export const RUNTIME_AUDIT_MAX_PENDING_ENTRIES = 2048;
export const RUNTIME_AUDIT_MAX_PENDING_BYTES = 2 * 1024 * 1024;

export type RuntimeAuditAppendQueueLogEvent =
  | {
      kind: "overflow";
      key: string;
      owner: string;
      path: string;
      requestId?: string;
      droppedEntries: number;
      droppedBytes: number;
      overflowEpisode: number;
    }
  | {
      kind: "append-failed";
      key: string;
      owner: string;
      path: string;
      requestId?: string;
      error: unknown;
    };

export type RuntimeAuditAppendSinkArgs = {
  owner: string;
  path: string;
  lines: string[];
};

export type RuntimeAuditAppendQueue = {
  /**
   * Makes an owner's key known to the coordinator without queueing a record, so
   * a barrier can hold a fixed watermark for an owner that has not admitted
   * anything yet, such as immediately after a restart.
   */
  bind(args: {
    key: string;
    owner: string;
    coordinatorOwner: string;
    path: string;
    requestId?: string;
  }): void;
  append(args: {
    key: string;
    owner: string;
    coordinatorOwner: string;
    path: string;
    requestId?: string;
    line: string;
  }): void;
  keysForOwner(owner?: string): string[];
  barrier<T>(
    owner: string | undefined,
    capture: () => Promise<T> | T,
  ): Promise<T>;
  flush(owner?: string): Promise<void>;
  release(owner?: string): Promise<void>;
  discardAndWait(owner: string): Promise<void>;
  flushAndDiscardAll(): Promise<void>;
  discardAll(): void;
};

export function createRuntimeAuditAppendQueue(args: {
  log: (event: RuntimeAuditAppendQueueLogEvent) => void;
  sink: (args: RuntimeAuditAppendSinkArgs) => Promise<void>;
  maxPendingEntries?: number;
  maxPendingBytes?: number;
}): RuntimeAuditAppendQueue {
  const keysByOwner = new Map<string, string>();

  const maxPendingEntries =
    args.maxPendingEntries ?? RUNTIME_AUDIT_MAX_PENDING_ENTRIES;
  const maxPendingBytes =
    args.maxPendingBytes ?? RUNTIME_AUDIT_MAX_PENDING_BYTES;

  function keysForOwner(owner?: string) {
    return Array.from(keysByOwner.entries())
      .filter(
        ([, entryOwner]) =>
          typeof owner === "undefined" || entryOwner === owner,
      )
      .map(([key]) => key);
  }

  function trackKey(track: {
    key: string;
    owner: string;
    coordinatorOwner: string;
    path: string;
    requestId?: string;
  }) {
    keysByOwner.set(track.key, track.owner);
    return {
      key: track.key,
      owner: track.coordinatorOwner,
      performanceProfileRequestId: track.requestId,
      performanceChannel: "audit" as const,
      hardPendingLimit: {
        maxEntries: maxPendingEntries,
        maxBytes: maxPendingBytes,
        overflow: "drop-oldest" as const,
        onOverflow: (event: {
          droppedEntries: number;
          droppedBytes: number;
          overflowEpisode: number;
        }) => {
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
      sink: async (lines: string[]) => {
        try {
          await args.sink({ owner: track.owner, path: track.path, lines });
        } catch (error) {
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
    async barrier<T>(owner: string | undefined, capture: () => Promise<T> | T) {
      return captureBufferedWriteKeys(keysForOwner(owner), capture);
    },
    async flush(owner?: string) {
      await Promise.all(
        keysForOwner(owner).map((key) => flushBufferedWriteKey(key)),
      );
    },
    async release(owner?: string) {
      const keys = keysForOwner(owner);
      await Promise.allSettled(keys.map((key) => flushBufferedWriteKey(key)));
      for (const key of keys) {
        discardBufferedWriteKey(key);
        keysByOwner.delete(key);
      }
    },
    async discardAndWait(owner: string) {
      const keys = keysForOwner(owner);
      await Promise.allSettled(
        keys.map((key) => discardBufferedWriteKeyAndWait(key)),
      );
      for (const key of keys) {
        keysByOwner.delete(key);
      }
    },
    async flushAndDiscardAll() {
      await Promise.allSettled(
        Array.from(keysByOwner.keys()).map((key) => flushBufferedWriteKey(key)),
      );
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
