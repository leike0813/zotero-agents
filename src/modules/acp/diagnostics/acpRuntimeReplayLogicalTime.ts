export const ACP_RUNTIME_LOGICAL_TIME_V1 =
  "ACP_RUNTIME_LOGICAL_TIME_V1" as const;

export type AcpRuntimeReplayLogicalTimerDomain =
  | "acp-skill-run-change"
  | "acp-skill-run-soft-persist"
  | "acp-chat-workspace-change"
  | "acp-chat-persist"
  | "assistant-workspace-post-snapshot";

export type AcpRuntimeReplayLogicalTimerDescriptor = {
  domain: AcpRuntimeReplayLogicalTimerDomain;
  ownerKey: string;
  delayMs: number;
  nativeToken: ReturnType<typeof setTimeout>;
  detachNative: () => boolean;
  fireIfCurrent: () => boolean | Promise<boolean>;
  resumeNative: (remainingMs: number) => boolean;
  fallbackFlush?: () => boolean | Promise<boolean>;
};

export type AcpRuntimeReplayLogicalTimerInspection = {
  timers: AcpRuntimeReplayLogicalTimerDescriptor[];
  warnings: string[];
};

export type AcpRuntimeReplayLogicalTimePort = {
  advanceTo: (offsetMs: number) => Promise<void>;
  captureAt: (offsetMs: number) => Promise<void>;
  releaseToNative: (
    finalOffsetMs: number,
  ) => Promise<{ ok: boolean; warnings: string[] }>;
  flushWriteBearing: () => Promise<{ ok: boolean; warnings: string[] }>;
  dispose: () => void;
  pendingCount: () => number;
  warnings: () => string[];
};

type PendingLogicalTimer = {
  descriptor: AcpRuntimeReplayLogicalTimerDescriptor;
  deadlineMs: number;
  registrationSequence: number;
};

function defaultMacrotaskYield() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function createAcpRuntimeReplayLogicalTime(args: {
  inspect: () =>
    | AcpRuntimeReplayLogicalTimerInspection
    | Promise<AcpRuntimeReplayLogicalTimerInspection>;
  signal?: { readonly aborted: boolean };
  yieldToMacrotask?: () => Promise<void>;
}): AcpRuntimeReplayLogicalTimePort {
  const pending = new Map<ReturnType<typeof setTimeout>, PendingLogicalTimer>();
  const warningSet = new Set<string>();
  const yieldToMacrotask = args.yieldToMacrotask || defaultMacrotaskYield;
  let currentOffsetMs = 0;
  let registrationSequence = 0;
  let disposed = false;
  const releasedWriteBearing: AcpRuntimeReplayLogicalTimerDescriptor[] = [];

  const captureAt = async (offsetMs: number) => {
    if (disposed) return;
    currentOffsetMs = Math.max(currentOffsetMs, offsetMs);
    const inspection = await args.inspect();
    for (const warning of inspection.warnings) warningSet.add(warning);
    for (const descriptor of inspection.timers) {
      if (pending.has(descriptor.nativeToken)) continue;
      if (!descriptor.detachNative()) continue;
      registrationSequence += 1;
      pending.set(descriptor.nativeToken, {
        descriptor,
        deadlineMs: currentOffsetMs + Math.max(0, descriptor.delayMs),
        registrationSequence,
      });
    }
  };

  const advanceTo = async (offsetMs: number) => {
    if (disposed) return;
    const targetOffsetMs = Math.max(currentOffsetMs, offsetMs);
    while (!args.signal?.aborted) {
      const due = [...pending.values()]
        .filter((entry) => entry.deadlineMs <= targetOffsetMs)
        .sort(
          (left, right) =>
            left.deadlineMs - right.deadlineMs ||
            left.registrationSequence - right.registrationSequence,
        );
      if (due.length === 0) break;
      const batchDeadline = due[0].deadlineMs;
      const batch = due.filter((entry) => entry.deadlineMs === batchDeadline);
      currentOffsetMs = Math.max(currentOffsetMs, batchDeadline);
      for (const entry of batch) {
        if (args.signal?.aborted) break;
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
      const future = [...pending.values()].sort(
        (left, right) =>
          left.deadlineMs - right.deadlineMs ||
          left.registrationSequence - right.registrationSequence,
      );
      for (const entry of future) {
        const resumed = entry.descriptor.resumeNative(
          Math.max(0, entry.deadlineMs - currentOffsetMs),
        );
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
          if (!(await descriptor.fallbackFlush?.())) ok = false;
        } catch (error) {
          ok = false;
          warningSet.add(
            `logical-write-fallback-failed:${descriptor.domain}:${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      if (!ok) warningSet.add("logical-write-fallback-incomplete");
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
