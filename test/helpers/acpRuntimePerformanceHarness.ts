import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  configureAcpRuntimePerformanceProfilerForTests,
  enableAcpRuntimePerformanceProfiler,
  finishAcpRuntimeProfile,
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  observeAcpRuntimeGauge,
  resetAcpRuntimePerformanceProfilerForTests,
  snapshotAcpRuntimeProfiles,
  startAcpRuntimeProfile,
  type AcpRuntimePerformanceSnapshot,
} from "../../src/modules/acpRuntimePerformanceProfiler";

export type AcpSilentRuntimeBaseline = {
  requestId: string;
  updateCount: number;
  snapshot: AcpRuntimePerformanceSnapshot;
};

export function runAcpSilentRuntimeBaseline(
  updateCount = 1_000,
): AcpSilentRuntimeBaseline {
  const requestId = "fixture-silent-run";
  let now = 1_000;
  setDebugModeOverrideForTests(true);
  configureAcpRuntimePerformanceProfilerForTests({
    now: () => now,
    setTimer: () => 1,
    clearTimer: () => undefined,
  });
  enableAcpRuntimePerformanceProfiler();
  startAcpRuntimeProfile({
    requestId,
    displayMode: "silent",
    transport: "stdio",
    zoteroMajor: 9,
  });

  for (let index = 0; index < updateCount; index += 1) {
    incrementAcpRuntimeMetric(requestId, "jsonrpc_message", {
      updateClass: "notification",
    });
    incrementAcpRuntimeMetric(requestId, "session_update", {
      updateClass: "assistant-message",
    });
    incrementAcpRuntimeMetric(requestId, "change_requested", {
      changeKind: "transcript",
      surfaceState: "closed",
    });
    if (index % 20 === 19) {
      incrementAcpRuntimeMetric(requestId, "run_persist", {
        persistenceChannel: "run",
      });
      observeAcpRuntimeDuration(
        requestId,
        "run_persist_duration",
        { persistenceChannel: "run" },
        4,
      );
    }
    observeAcpRuntimeGauge(
      requestId,
      "transport_queue_entries",
      { operationClass: "other" },
      index % 8,
    );
    now += 0.25;
  }
  finishAcpRuntimeProfile(requestId);
  const snapshot = snapshotAcpRuntimeProfiles();
  if (!snapshot) {
    throw new Error(
      "ACP runtime performance fixture did not produce a snapshot",
    );
  }
  return { requestId, updateCount, snapshot };
}

export function resetAcpSilentRuntimeBaseline() {
  resetAcpRuntimePerformanceProfilerForTests();
  setDebugModeOverrideForTests();
}
