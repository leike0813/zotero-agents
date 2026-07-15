import { AcpClientConnection } from "../../src/modules/acpClientConnection";
import {
  finishAcpRuntimeProfile,
  configureAcpRuntimePerformanceProfilerForTests,
  enableAcpRuntimePerformanceProfiler,
  resetAcpRuntimePerformanceProfilerForTests,
  snapshotAcpRuntimeProfiles,
  startAcpRuntimeProfile,
  type AcpRuntimePerformanceSnapshot,
} from "../../src/modules/acpRuntimePerformanceProfiler";
import {
  buildAcpRuntimeGovernanceBaselineRecord,
  type AcpRuntimeGovernanceBaselineRecord,
} from "../../src/modules/acpRuntimePerformanceBaseline";
import {
  resetAcpSkillRunsForTests,
  selectAcpSkillRun,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import { postAcpSkillRunSnapshotForPerformanceTests } from "../../src/modules/assistantWorkspaceSidebar";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  hostBridgeServerInternalsForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridgeServer";
import {
  enqueueBufferedWrite,
  flushBufferedWriteKey,
  resetBufferedWriteCoordinatorForTests,
} from "../../src/modules/bufferedWriteCoordinator";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  ACP_CLIENT_METHODS,
  type JsonRpcMessage,
} from "../../src/modules/acpProtocol";

export type AcpSilentRuntimeBaseline = {
  requestId: string;
  updateCount: number;
  surfaceState: AcpRuntimeBaselineSurfaceState;
  snapshot: AcpRuntimePerformanceSnapshot;
  record: AcpRuntimeGovernanceBaselineRecord;
};

export const ACP_RUNTIME_BASELINE_SURFACE_STATES = [
  "closed",
  "open-inactive",
  "acp-active",
] as const;

export type AcpRuntimeBaselineSurfaceState =
  (typeof ACP_RUNTIME_BASELINE_SURFACE_STATES)[number];

function createMessageHarness() {
  const inbound: JsonRpcMessage[] = [];
  const waiting: Array<
    (result: { done: boolean; value?: JsonRpcMessage }) => void
  > = [];
  let closed = false;

  const flush = () => {
    while (waiting.length > 0 && (inbound.length > 0 || closed)) {
      const resolve = waiting.shift();
      if (inbound.length > 0) {
        resolve?.({ done: false, value: inbound.shift() });
      } else {
        resolve?.({ done: true });
      }
    }
  };

  return {
    stream: {
      readable: {
        getReader() {
          return {
            async read() {
              if (inbound.length > 0) {
                return { done: false, value: inbound.shift() };
              }
              if (closed) {
                return { done: true, value: undefined };
              }
              return new Promise<{ done: boolean; value?: JsonRpcMessage }>(
                (resolve) => waiting.push(resolve),
              );
            },
            releaseLock() {},
          };
        },
      },
      writable: {
        getWriter() {
          return {
            async write() {},
            async close() {},
            releaseLock() {},
          };
        },
      },
    },
    push(message: JsonRpcMessage) {
      inbound.push(message);
      flush();
    },
    close() {
      closed = true;
      flush();
    },
  };
}

async function exerciseR1ProductionSeams(
  requestId: string,
  updateCount: number,
) {
  upsertAcpSkillRun({
    requestId,
    backendId: "fixture-acp",
    backendType: "acp",
    status: "running",
    taskName: "Deterministic ACP fixture",
  });
  const harness = createMessageHarness();
  const connection = new AcpClientConnection(
    () => ({
      async requestPermission() {
        return { outcome: { outcome: "cancelled" as const } };
      },
      async sessionUpdate() {},
    }),
    harness.stream,
    { performanceProfileRequestId: requestId },
  );
  for (let index = 0; index < updateCount; index += 1) {
    harness.push({
      jsonrpc: "2.0",
      method: ACP_CLIENT_METHODS.session_update,
      params: {
        sessionId: "fixture-session",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "x" },
        },
      },
    });
    if (index % 20 === 19) {
      upsertAcpSkillRun({
        requestId,
        event: {
          stage: "fixture-diagnostic",
          message: "Deterministic fixture event",
          level: "info",
        },
      });
    }
  }
  harness.close();
  await connection.closed;
  await connection.close();
}

function installFragmentedBinaryInput(raw: Uint8Array) {
  const midpoint = Math.max(1, Math.floor(raw.byteLength / 2));
  const chunks = [raw.slice(0, midpoint), raw.slice(midpoint)];
  const binaryStream = {
    setInputStream() {},
    available() {
      return chunks[0]?.byteLength || 0;
    },
    readByteArray() {
      return Array.from(chunks.shift() || []);
    },
    close() {},
  };
  const runtime = globalThis as typeof globalThis & { Components?: unknown };
  const previous = Object.getOwnPropertyDescriptor(runtime, "Components");
  Object.defineProperty(runtime, "Components", {
    configurable: true,
    value: {
      classes: {
        "@mozilla.org/binaryinputstream;1": {
          createInstance: () => binaryStream,
        },
      },
      interfaces: { nsIBinaryInputStream: {} },
    },
  });
  return () => {
    if (previous) {
      Object.defineProperty(runtime, "Components", previous);
    } else {
      delete runtime.Components;
    }
  };
}

async function exerciseR2ProductionSeams(requestId: string) {
  const scope = JSON.stringify({ kind: "acp-skill-run", requestId });
  const raw = new TextEncoder().encode(
    [
      "GET /bridge/v1/health HTTP/1.1",
      "Host: 127.0.0.1",
      `X-Zotero-Bridge-Scope: ${scope}`,
      "Content-Length: 0",
      "",
      "",
    ].join("\r\n"),
  );
  const restore = installFragmentedBinaryInput(raw);
  try {
    hostBridgeServerInternalsForTests.readProfiledHostBridgeRequest({});
  } finally {
    restore();
  }
  configureHostBridgeServerForTests({ token: "fixture-host-bridge-token" });
  await handleHostBridgeHttpRequestForTests({
    method: "GET",
    path: "/bridge/v1/health",
    headers: { "X-Zotero-Bridge-Scope": scope },
  });
}

async function exerciseR3ProductionSeam(
  requestId: string,
  surfaceState: Exclude<AcpRuntimeBaselineSurfaceState, "closed">,
) {
  await selectAcpSkillRun(requestId);
  const frameWindow = { postMessage() {} };
  const host = {
    activeTarget: null,
    activeTab: surfaceState === "acp-active" ? "acp-skills" : "acp-chat",
    scopeKey: "fixture-scope",
    snapshotRevision: 0,
    acpChatSnapshotBuildSeq: 0,
    acpSkillRunSnapshotBuildSeq: 0,
    publicationSeq: 0,
    publicationLifecycles: new Map(),
    acpChatBackendRefreshInFlight: false,
    acpChatBackendRefreshRepostQueued: false,
    shell: {
      frame: { contentWindow: frameWindow },
      frameWindow,
      loaded: true,
      ready: true,
    },
    readyTabs: new Set(["acp-skills"]),
    publishedChildInitScopeKeys: new Set<string>(),
    lastAcpSkillRunSnapshotSignature: null,
  };
  await postAcpSkillRunSnapshotForPerformanceTests(host);
  await postAcpSkillRunSnapshotForPerformanceTests(host);
}

async function exerciseBufferedWriteProductionSeam(requestId: string) {
  const key = `acp-runtime-baseline:${requestId}`;
  for (let index = 0; index < 4; index += 1) {
    enqueueBufferedWrite({
      key,
      owner: requestId,
      entry: index,
      bytes: 16,
      sink: async () => undefined,
      performanceProfileRequestId: requestId,
      performanceChannel: "transcript",
    });
  }
  await flushBufferedWriteKey(key);
}

export async function runAcpSilentRuntimeBaseline(
  options: {
    updateCount?: number;
    surfaceState?: AcpRuntimeBaselineSurfaceState;
  } = {},
): Promise<AcpSilentRuntimeBaseline> {
  const updateCount = options.updateCount ?? 1_000;
  const surfaceState = options.surfaceState || "acp-active";
  const requestId = "fixture-silent-run";
  let now = 1_000;
  setDebugModeOverrideForTests(true);
  configureAcpRuntimePerformanceProfilerForTests({
    now: () => now++,
    setTimer: () => 1,
    clearTimer: () => undefined,
  });
  if (!enableAcpRuntimePerformanceProfiler()) {
    throw new Error("ACP runtime performance fixture could not start profiler");
  }
  startAcpRuntimeProfile({
    requestId,
    displayMode: "silent",
    transport: "stdio",
    zoteroMajor: 9,
  });

  await exerciseR1ProductionSeams(requestId, updateCount);
  await exerciseR2ProductionSeams(requestId);
  if (surfaceState !== "closed") {
    await exerciseR3ProductionSeam(requestId, surfaceState);
  }
  await exerciseBufferedWriteProductionSeam(requestId);
  finishAcpRuntimeProfile(requestId);

  const snapshot = snapshotAcpRuntimeProfiles();
  if (!snapshot) {
    throw new Error(
      "ACP runtime performance fixture did not produce a snapshot",
    );
  }
  const record = buildAcpRuntimeGovernanceBaselineRecord({
    kind: "automated",
    phase: "before-governance",
    metadata: {
      scenarioId: `silent-${updateCount}-production-seams-${surfaceState}`,
      surfaceState,
      runIndex: 1,
      warmup: false,
    },
    environment: {
      pluginVersion: "0.6.1",
      zoteroVersion: "mock",
      zoteroMajor: 9,
      platform: "node-mock",
    },
    snapshot,
    completion: "complete",
  });
  return { requestId, updateCount, surfaceState, snapshot, record };
}

export async function resetAcpSilentRuntimeBaseline() {
  await resetBufferedWriteCoordinatorForTests();
  resetHostBridgeServerForTests();
  resetAcpSkillRunsForTests();
  resetAcpRuntimePerformanceProfilerForTests();
  setDebugModeOverrideForTests();
}

export async function runAcpSilentRuntimeBaselineMatrix(updateCount = 1_000) {
  const baselines: AcpSilentRuntimeBaseline[] = [];
  for (const surfaceState of ACP_RUNTIME_BASELINE_SURFACE_STATES) {
    try {
      baselines.push(
        await runAcpSilentRuntimeBaseline({ updateCount, surfaceState }),
      );
    } finally {
      await resetAcpSilentRuntimeBaseline();
    }
  }
  return baselines;
}
