import {
  discardBufferedWriteKey,
  discardBufferedWriteKeyAndWait,
  enqueueBufferedWrite,
  flushBufferedWriteKey,
} from "./bufferedWriteCoordinator";
import { appendRuntimeTextFile } from "./runtimePersistence";

const AUDIT_MAX_PENDING_ENTRIES = 2048;
const AUDIT_MAX_PENDING_BYTES = 2 * 1024 * 1024;

export type AcpAuditAppendLogEvent =
  | {
      kind: "overflow";
      owner: string;
      path: string;
      requestId?: string;
      droppedEntries: number;
      droppedBytes: number;
      overflowEpisode: number;
    }
  | {
      kind: "append-failed";
      owner: string;
      path: string;
      requestId?: string;
      error: unknown;
    };

export type AcpAuditAppendCore = {
  append(args: {
    key: string;
    coordinatorOwner: string;
    owner: string;
    path: string;
    requestId?: string;
    line: string;
  }): void;
  keysForOwner(owner?: string): string[];
  flush(owner?: string): Promise<void>;
  release(owner?: string): Promise<void>;
  discardAndWait(owner: string): Promise<void>;
  flushAndDiscardAll(): Promise<void>;
  discardAll(): void;
};

export function createAcpAuditAppendCore(args: {
  log: (event: AcpAuditAppendLogEvent) => void;
}): AcpAuditAppendCore {
  const keysByOwner = new Map<string, string>();

  function keysForOwner(owner?: string) {
    return Array.from(keysByOwner.entries())
      .filter(
        ([, entryOwner]) =>
          typeof owner === "undefined" || entryOwner === owner,
      )
      .map(([key]) => key);
  }

  return {
    append(appendArgs) {
      keysByOwner.set(appendArgs.key, appendArgs.owner);
      enqueueBufferedWrite({
        key: appendArgs.key,
        owner: appendArgs.coordinatorOwner,
        entry: appendArgs.line,
        bytes: new TextEncoder().encode(appendArgs.line).length,
        performanceProfileRequestId: appendArgs.requestId,
        performanceChannel: "audit",
        hardPendingLimit: {
          maxEntries: AUDIT_MAX_PENDING_ENTRIES,
          maxBytes: AUDIT_MAX_PENDING_BYTES,
          overflow: "drop-oldest",
          onOverflow: (event) => {
            args.log({
              kind: "overflow",
              owner: appendArgs.owner,
              path: appendArgs.path,
              requestId: appendArgs.requestId,
              ...event,
            });
          },
        },
        sink: async (lines) => {
          try {
            await appendRuntimeTextFile(appendArgs.path, lines.join(""));
          } catch (error) {
            args.log({
              kind: "append-failed",
              owner: appendArgs.owner,
              path: appendArgs.path,
              requestId: appendArgs.requestId,
              error,
            });
            throw error;
          }
        },
      });
    },
    keysForOwner,
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
