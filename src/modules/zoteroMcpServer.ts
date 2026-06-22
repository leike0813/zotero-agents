import type { AcpHostContext, AcpMcpHealthSnapshot } from "./acpTypes";
import {
  getHostBridgeToken,
  isHostBridgeAuthorizationValid,
  redactHostBridgeToken,
} from "./hostBridgeAuth";
import {
  ensureHostBridgeServer,
  getHostBridgeServerStatus,
} from "./hostBridgeServer";
import type { HostBridgeStatusSnapshot } from "./hostBridgeProtocol";
import {
  appendRuntimeLog,
  listRuntimeLogs,
  type RuntimeLogLevel,
} from "./runtimeLogManager";
import { getPref, setPref } from "../utils/prefs";
import {
  handleZoteroMcpJsonRpc,
  ZOTERO_MCP_TOOL_GET_MCP_STATUS,
  ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
  ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
  ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
  ZOTERO_MCP_TOOL_TOPICS_LIST,
  type ZoteroMcpHandlerOptions,
  type ZoteroMcpJsonRpcId,
  type ZoteroMcpToolPermissionDecision,
  type ZoteroMcpToolPermissionRequest,
} from "./zoteroMcpProtocol";

export type ZoteroMcpServerStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";

export type ZoteroMcpServerStatusSnapshot = {
  status: ZoteroMcpServerStatus;
  host: string;
  port: number;
  endpoint: string;
  tokenMasked: string;
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  toolCallCount: number;
  queuePolicy: ZoteroMcpQueuePolicy;
  queueState: ZoteroMcpQueueState;
  guardState: ZoteroMcpGuardState;
  recentRuntimeLogs: ZoteroMcpRuntimeLogSummary[];
  recentRequests: ZoteroMcpRequestLogEntry[];
  updatedAt: string;
};

export type ZoteroMcpQueuePolicy = {
  runningLimit: 1;
  pendingLimit: number;
  queueTimeoutMs: number;
  runningTimeoutMs: number;
};

export type ZoteroMcpQueueState = {
  running: number;
  pending: number;
};

export type ZoteroMcpCircuitBreakerSnapshot = {
  toolName: string;
  state: "closed" | "open";
  failureCount: number;
  openedAt: string;
  openUntil: string;
  retryAfterMs: number;
  lastError: string;
};

export type ZoteroMcpGuardState = {
  restartCount: number;
  lastRestartAt: string;
  lastFatalError: string;
  descriptorStale: boolean;
  activeTool: string;
  runningStartedAt: string;
  runningTimeoutMs: number;
  timedOutButStillRunning: boolean;
  runningTimedOutAt: string;
  retryGuidance: string;
  circuitBreakers: ZoteroMcpCircuitBreakerSnapshot[];
};

export type ZoteroMcpRequestLogEntry = {
  ts: string;
  method: string;
  path: string;
  status: number;
  authorized: boolean;
  accept: string;
  contentType: string;
  jsonrpcMethod: string;
  jsonrpcId: string;
  jsonrpcToolName: string;
  protocolVersion: string;
  transportMode: "streamable-http";
  responseContentType: string;
  responseBodyLength: number;
  responseJsonrpc: string;
  responseJsonrpcId: string;
  responseProtocolVersion: string;
  responseToolCount: number;
  responseError: string;
  queuePolicy: ZoteroMcpQueuePolicy;
  queueDepthAtAccept: number;
  queuePosition: number;
  queueWaitMs: number;
  durationMs: number;
  limitReason: string;
  toolOutcome: "" | "success" | "error" | "notification";
  toolErrorName: string;
  error: string;
};

export type ZoteroMcpRuntimeLogSummary = {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  requestId: string;
  stage: string;
  phase: string;
  operation: string;
  message: string;
  method: string;
  path: string;
  status: number;
  jsonrpcMethod: string;
  jsonrpcId: string;
  toolName: string;
  durationMs: number;
  responseBytes: number;
  errorName: string;
  errorMessage: string;
};

export type ZoteroMcpDiagnosticEvent = {
  kind:
    | "zotero_mcp_starting"
    | "zotero_mcp_started"
    | "zotero_mcp_request"
    | "zotero_mcp_response"
    | "zotero_mcp_tool_call"
    | "zotero_mcp_error"
    | "zotero_mcp_unavailable"
    | "mcp_server_injected";
  level?: "info" | "warn" | "error";
  message: string;
  detail?: string;
  raw?: unknown;
};

export type ZoteroMcpServerDescriptor = {
  name: string;
  type: "http";
  url: string;
  headers: Array<{
    name: string;
    value: string;
  }>;
  enabled: true;
};

type ServerState = {
  status: ZoteroMcpServerStatus;
  host: string;
  port: number;
  endpoint: string;
  token: string;
  serverSocket: any;
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  toolCallCount: number;
  recentRequests: ZoteroMcpRequestLogEntry[];
  updatedAt: string;
  resolveHostContext?: () => AcpHostContext;
  requestToolPermission?: (
    request: ZoteroMcpToolPermissionRequest,
  ) =>
    | Promise<ZoteroMcpToolPermissionDecision>
    | ZoteroMcpToolPermissionDecision;
  beforeToolCallForTests?: () => Promise<void> | void;
  listeners: Set<(event: ZoteroMcpDiagnosticEvent) => void | Promise<void>>;
};

type HttpRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  bodyByteLength: number;
  parseError?: string;
};

const HOST = "127.0.0.1";
const PORT_MIN = 26370;
const PORT_SPAN = 200;
const MAX_RECENT_REQUESTS = 16;
const DEFAULT_TOOL_QUEUE_PENDING_LIMIT = 8;
const DEFAULT_TOOL_QUEUE_TIMEOUT_MS = 30000;
const DEFAULT_TOOL_RUNNING_TIMEOUT_MS = 45000;
const MAX_MCP_REQUEST_BODY_BYTES = 1024 * 1024;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_FAILURE_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_OPEN_MS = 60 * 1000;
const MCP_RUNTIME_LOG_COMPONENT = "zotero-mcp";
const MAX_RECENT_RUNTIME_LOGS = 12;

type ZoteroMcpQueueAcceptedResult<T> = {
  kind: "ok";
  value: T;
  queueDepthAtAccept: number;
  queuePosition: number;
  queueWaitMs: number;
  limitReason: "";
};

type ZoteroMcpQueueRejectedResult = {
  kind: "queue_full" | "queue_timeout" | "tool_timeout";
  queueDepthAtAccept: number;
  queuePosition: number;
  queueWaitMs: number;
  limitReason: "queue_full" | "queue_timeout" | "tool_timeout";
};

type ZoteroMcpQueueResult<T> =
  | ZoteroMcpQueueAcceptedResult<T>
  | ZoteroMcpQueueRejectedResult;

type ZoteroMcpQueueItem<T> = {
  toolName: string;
  run: () => Promise<T>;
  queuedAt: number;
  queueDepthAtAccept: number;
  queuePosition: number;
  timeout?: ReturnType<typeof setTimeout>;
  resolve: (result: ZoteroMcpQueueResult<T>) => void;
  reject: (error: unknown) => void;
};

class ZoteroMcpToolTimeoutError extends Error {
  constructor(
    readonly toolName: string,
    readonly timeoutMs: number,
  ) {
    super(
      `Zotero MCP tool "${toolName || "unknown"}" timed out after ${timeoutMs}ms`,
    );
    this.name = "ZoteroMcpToolTimeoutError";
  }
}

type CircuitBreakerRecord = {
  toolName: string;
  failures: Array<{
    ts: number;
    error: string;
  }>;
  openedAt: number;
  openUntil: number;
  lastError: string;
};

const circuitBreakers = new Map<string, CircuitBreakerRecord>();
let restartCount = 0;
let lastRestartAt = "";
let lastFatalError = "";
let descriptorStale = false;
let descriptorInjected = false;
let descriptorInjectedAt = "";
let activeTool = "";
let runningStartedAt = "";
let activeToolTimedOut = false;
let runningTimedOutAt = "";
let intentionalShutdown = false;
let mcpRequestSequence = 0;

class ZoteroMcpToolCallQueue {
  private policy: ZoteroMcpQueuePolicy = {
    runningLimit: 1,
    pendingLimit: DEFAULT_TOOL_QUEUE_PENDING_LIMIT,
    queueTimeoutMs: DEFAULT_TOOL_QUEUE_TIMEOUT_MS,
    runningTimeoutMs: DEFAULT_TOOL_RUNNING_TIMEOUT_MS,
  };

  private running = 0;
  private pending: ZoteroMcpQueueItem<unknown>[] = [];

  configure(policy: Partial<Omit<ZoteroMcpQueuePolicy, "runningLimit">> = {}) {
    this.policy = {
      runningLimit: 1,
      pendingLimit:
        Number.isFinite(Number(policy.pendingLimit)) &&
        Number(policy.pendingLimit) >= 0
          ? Math.floor(Number(policy.pendingLimit))
          : DEFAULT_TOOL_QUEUE_PENDING_LIMIT,
      queueTimeoutMs:
        Number.isFinite(Number(policy.queueTimeoutMs)) &&
        Number(policy.queueTimeoutMs) >= 0
          ? Math.floor(Number(policy.queueTimeoutMs))
          : DEFAULT_TOOL_QUEUE_TIMEOUT_MS,
      runningTimeoutMs:
        Number.isFinite(Number(policy.runningTimeoutMs)) &&
        Number(policy.runningTimeoutMs) >= 0
          ? Math.floor(Number(policy.runningTimeoutMs))
          : DEFAULT_TOOL_RUNNING_TIMEOUT_MS,
    };
  }

  snapshot(): ZoteroMcpQueueState {
    return {
      running: this.running,
      pending: this.pending.length,
    };
  }

  getPolicy(): ZoteroMcpQueuePolicy {
    return { ...this.policy };
  }

  reset() {
    for (const item of this.pending) {
      if (item.timeout) {
        clearTimeout(item.timeout);
      }
      item.resolve({
        kind: "queue_timeout",
        queueDepthAtAccept: item.queueDepthAtAccept,
        queuePosition: item.queuePosition,
        queueWaitMs: Date.now() - item.queuedAt,
        limitReason: "queue_timeout",
      });
    }
    this.pending = [];
    this.running = 0;
    this.configure();
  }

  enqueue<T>(
    toolName: string,
    run: () => Promise<T>,
  ): Promise<ZoteroMcpQueueResult<T>> {
    const queueDepthAtAccept = this.running + this.pending.length;
    if (
      queueDepthAtAccept >=
      this.policy.runningLimit + this.policy.pendingLimit
    ) {
      return Promise.resolve({
        kind: "queue_full",
        queueDepthAtAccept,
        queuePosition: 0,
        queueWaitMs: 0,
        limitReason: "queue_full",
      });
    }

    return new Promise<ZoteroMcpQueueResult<T>>((resolve, reject) => {
      const item: ZoteroMcpQueueItem<T> = {
        toolName,
        run,
        queuedAt: Date.now(),
        queueDepthAtAccept,
        queuePosition: this.pending.length + (this.running > 0 ? 1 : 0) + 1,
        resolve,
        reject,
      };
      if (this.running === 0 && this.pending.length === 0) {
        this.startItem(item);
        return;
      }
      if (this.policy.queueTimeoutMs >= 0) {
        item.timeout = setTimeout(() => {
          const index = this.pending.indexOf(
            item as ZoteroMcpQueueItem<unknown>,
          );
          if (index < 0) {
            return;
          }
          this.pending.splice(index, 1);
          resolve({
            kind: "queue_timeout",
            queueDepthAtAccept,
            queuePosition: item.queuePosition,
            queueWaitMs: Date.now() - item.queuedAt,
            limitReason: "queue_timeout",
          });
        }, this.policy.queueTimeoutMs);
      }
      this.pending.push(item as ZoteroMcpQueueItem<unknown>);
    });
  }

  private startItem<T>(item: ZoteroMcpQueueItem<T>) {
    if (item.timeout) {
      clearTimeout(item.timeout);
    }
    this.running = 1;
    const queueWaitMs = Date.now() - item.queuedAt;
    activeTool = item.toolName;
    runningStartedAt = nowIso();
    activeToolTimedOut = false;
    runningTimedOutAt = "";
    const timeoutMs = this.policy.runningTimeoutMs;
    let runningTimeout: ReturnType<typeof setTimeout> | undefined;
    let returnedTimeout = false;
    const runPromise = Promise.resolve().then(() => item.run());
    runPromise.catch(() => {
      // The queue may already have returned a timeout; suppress late rejections.
    });
    if (timeoutMs >= 0) {
      runningTimeout = setTimeout(() => {
        returnedTimeout = true;
        activeToolTimedOut = true;
        runningTimedOutAt = nowIso();
        item.resolve({
          kind: "tool_timeout",
          queueDepthAtAccept: item.queueDepthAtAccept,
          queuePosition: item.queuePosition,
          queueWaitMs,
          limitReason: "tool_timeout",
        });
      }, timeoutMs);
    }
    void runPromise
      .then((value) => {
        if (returnedTimeout) {
          return;
        }
        item.resolve({
          kind: "ok",
          value,
          queueDepthAtAccept: item.queueDepthAtAccept,
          queuePosition: item.queuePosition,
          queueWaitMs,
          limitReason: "",
        });
      })
      .catch((error) => {
        if (returnedTimeout) {
          return;
        }
        item.reject(error);
      })
      .finally(() => {
        if (runningTimeout) {
          clearTimeout(runningTimeout);
        }
        this.running = 0;
        activeTool = "";
        runningStartedAt = "";
        activeToolTimedOut = false;
        runningTimedOutAt = "";
        this.startNext();
      });
  }

  private startNext() {
    const next = this.pending.shift();
    if (next) {
      this.startItem(next);
    }
  }
}

let state: ServerState = createEmptyState("idle");
let startingPromise: Promise<ZoteroMcpServerDescriptor> | null = null;
let toolCallQueue = new ZoteroMcpToolCallQueue();

function nowIso() {
  return new Date().toISOString();
}

function isoFromEpoch(value: number) {
  return value > 0 ? new Date(value).toISOString() : "";
}

function compactMcpError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

export function isZoteroMcpServerEnabled() {
  return getPref("mcpServer.enabled") !== false;
}

function snapshotCircuitBreakers(): ZoteroMcpCircuitBreakerSnapshot[] {
  const now = Date.now();
  return [...circuitBreakers.values()]
    .filter((entry) => entry.failures.length > 0 || entry.openUntil > now)
    .map((entry) => ({
      toolName: entry.toolName,
      state: entry.openUntil > now ? "open" : "closed",
      failureCount: entry.failures.length,
      openedAt: isoFromEpoch(entry.openedAt),
      openUntil: isoFromEpoch(entry.openUntil),
      retryAfterMs: Math.max(0, entry.openUntil - now),
      lastError: entry.lastError,
    }));
}

function getGuardStateSnapshot(): ZoteroMcpGuardState {
  return {
    restartCount,
    lastRestartAt,
    lastFatalError,
    descriptorStale,
    activeTool,
    runningStartedAt,
    runningTimeoutMs: toolCallQueue.getPolicy().runningTimeoutMs,
    timedOutButStillRunning: activeToolTimedOut,
    runningTimedOutAt,
    retryGuidance: activeToolTimedOut
      ? "The timed-out Zotero MCP tool may still be running. Please wait before retrying or call get_mcp_status again."
      : "",
    circuitBreakers: snapshotCircuitBreakers(),
  };
}

function createEmptyState(status: ZoteroMcpServerStatus): ServerState {
  return {
    status,
    host: HOST,
    port: 0,
    endpoint: "",
    token: "",
    serverSocket: null,
    lastRequestMethod: "",
    lastResponseStatus: 0,
    lastError: "",
    requestCount: 0,
    toolCallCount: 0,
    recentRequests: [],
    updatedAt: nowIso(),
    requestToolPermission: undefined,
    listeners: new Set(),
  };
}

function updateState(partial: Partial<ServerState>) {
  state = {
    ...state,
    ...partial,
    updatedAt: nowIso(),
  };
}

function maskToken(token: string) {
  const value = String(token || "").trim();
  if (!value) {
    return "";
  }
  return redactHostBridgeToken(value);
}

function requestHasFailure(entry: ZoteroMcpRequestLogEntry) {
  return (
    Number(entry.status || 0) >= 400 ||
    String(entry.error || "").trim() !== "" ||
    String(entry.responseError || "").trim() !== "" ||
    String(entry.toolOutcome || "") === "error" ||
    String(entry.limitReason || "").trim() !== ""
  );
}

function findLatestMcpRequest(
  predicate: (entry: ZoteroMcpRequestLogEntry) => boolean,
) {
  return [...state.recentRequests].reverse().find(predicate);
}

function healthSummaryForState(stateName: AcpMcpHealthSnapshot["state"]) {
  switch (stateName) {
    case "starting":
      return "MCP server starting";
    case "listening":
      return "MCP server listening";
    case "injected":
      return "MCP descriptor injected";
    case "handshake_seen":
      return "MCP client handshake seen";
    case "tools_seen":
      return "MCP tools discovered";
    case "active":
      return "MCP server running";
    case "degraded":
      return "MCP degraded";
    case "circuit_open":
      return "MCP circuit open";
    case "descriptor_stale":
      return "MCP descriptor stale";
    case "error":
      return "MCP error";
    case "unavailable":
    default:
      return "MCP unavailable";
  }
}

function healthSeverityForState(
  stateName: AcpMcpHealthSnapshot["state"],
): AcpMcpHealthSnapshot["severity"] {
  switch (stateName) {
    case "active":
      return "active";
    case "listening":
    case "injected":
    case "handshake_seen":
    case "tools_seen":
      return "ok";
    case "degraded":
    case "circuit_open":
    case "descriptor_stale":
      return "warning";
    case "error":
      return "error";
    case "starting":
      return "neutral";
    case "unavailable":
    default:
      return descriptorInjected ? "warning" : "neutral";
  }
}

export function markZoteroMcpServerDescriptorInjected() {
  descriptorInjected = true;
  descriptorInjectedAt = nowIso();
}

export function getZoteroMcpHealthSnapshot(): AcpMcpHealthSnapshot {
  const queueState = toolCallQueue.snapshot();
  const guardState = getGuardStateSnapshot();
  const initializeRequest = findLatestMcpRequest(
    (entry) => entry.jsonrpcMethod === "initialize",
  );
  const toolsListRequest = findLatestMcpRequest(
    (entry) => entry.jsonrpcMethod === "tools/list",
  );
  const toolCallRequest = findLatestMcpRequest(
    (entry) => entry.jsonrpcMethod === "tools/call",
  );
  const latestFailure = findLatestMcpRequest(requestHasFailure);
  const openCircuitCount = guardState.circuitBreakers.filter(
    (entry) => entry.state === "open",
  ).length;
  const queueDepth =
    Number(queueState.running || 0) + Number(queueState.pending || 0);
  const clientHandshakeSeen = !!initializeRequest;
  const toolsListSeen = !!toolsListRequest;
  const toolCallSeen = !!toolCallRequest;
  const serverRunning = state.status === "running";
  let healthState: AcpMcpHealthSnapshot["state"] = "unavailable";
  let recommendedAction = "";
  const lastError =
    String(state.lastError || "").trim() ||
    String(guardState.lastFatalError || "").trim() ||
    (latestFailure
      ? String(
          latestFailure.responseError ||
            latestFailure.error ||
            latestFailure.limitReason,
        )
      : "");
  const latestRuntimeLog = getRecentMcpRuntimeLogs(1)[0];
  const latestRuntimeFailure = latestMcpRuntimeFailure();

  if (
    state.status === "error" ||
    String(guardState.lastFatalError || "").trim()
  ) {
    healthState = "error";
    recommendedAction =
      "Reconnect the ACP session or restart Zotero if the server does not recover.";
  } else if (serverRunning && toolsListSeen) {
    healthState = "tools_seen";
  } else if (serverRunning && clientHandshakeSeen) {
    healthState = "handshake_seen";
  } else if (serverRunning && descriptorInjected) {
    healthState = "injected";
  } else if (serverRunning) {
    healthState = "listening";
  } else if (state.status === "starting") {
    healthState = "starting";
  } else if (descriptorInjected) {
    healthState = "unavailable";
    recommendedAction =
      "The descriptor was injected earlier, but the local MCP server is not running now.";
  }

  const tooltip = [
    healthSummaryForState(healthState),
    `state=${healthState}`,
    `status=${state.status}`,
    state.endpoint ? `endpoint=${state.endpoint}` : "",
    descriptorInjected ? `descriptorInjectedAt=${descriptorInjectedAt}` : "",
    guardState.descriptorStale ? "descriptorStale=true" : "",
    `requests=${state.requestCount}`,
    `toolCalls=${state.toolCallCount}`,
    `queue=${queueState.running} running/${queueState.pending} pending`,
    guardState.activeTool ? `activeTool=${guardState.activeTool}` : "",
    openCircuitCount > 0 ? `openCircuits=${openCircuitCount}` : "",
    latestRuntimeLog ? `lastLog=${latestRuntimeLog.stage}` : "",
    latestFailure
      ? `lastRequestFailure=${latestFailure.jsonrpcMethod || latestFailure.method}`
      : "",
    latestRuntimeFailure
      ? `lastRuntimeFailure=${latestRuntimeFailure.stage}`
      : "",
    lastError ? `lastError=${lastError}` : "",
    recommendedAction ? `action=${recommendedAction}` : "",
  ].filter(Boolean);

  return {
    state: healthState,
    severity: healthSeverityForState(healthState),
    summary: healthSummaryForState(healthState),
    tooltip,
    endpoint: state.endpoint,
    descriptorInjected,
    descriptorStale: guardState.descriptorStale,
    clientHandshakeSeen,
    toolsListSeen,
    toolCallSeen,
    queueDepth,
    activeTool: guardState.activeTool,
    openCircuitCount,
    lastError: lastError || latestRuntimeFailure?.errorMessage || "",
    lastLogStage: latestRuntimeLog?.stage || "",
    lastLogErrorName: latestRuntimeFailure?.errorName || "",
    lastRequestId: latestRuntimeLog?.requestId || "",
    lastWriteFailure: latestRuntimeFailure?.stage === "response.write.failed",
    recommendedAction,
    updatedAt: state.updatedAt,
  };
}

export function getZoteroMcpServerStatus(): ZoteroMcpServerStatusSnapshot {
  syncMcpRouteStateFromHostBridge();
  return {
    status: state.status,
    host: state.host,
    port: state.port,
    endpoint: state.endpoint,
    tokenMasked: maskToken(state.token),
    lastRequestMethod: state.lastRequestMethod,
    lastResponseStatus: state.lastResponseStatus,
    lastError: state.lastError,
    requestCount: state.requestCount,
    toolCallCount: state.toolCallCount,
    queuePolicy: toolCallQueue.getPolicy(),
    queueState: toolCallQueue.snapshot(),
    guardState: getGuardStateSnapshot(),
    recentRuntimeLogs: getRecentMcpRuntimeLogs(),
    recentRequests: state.recentRequests,
    updatedAt: state.updatedAt,
  };
}

export function redactZoteroMcpServerDescriptor(
  descriptor: ZoteroMcpServerDescriptor,
) {
  return {
    ...descriptor,
    headers: descriptor.headers.map((entry) => ({
      ...entry,
      value:
        entry.name.toLowerCase() === "authorization"
          ? "Bearer <redacted>"
          : "<redacted>",
    })),
  };
}

function emit(event: ZoteroMcpDiagnosticEvent) {
  for (const listener of state.listeners) {
    void listener(event);
  }
}

function addListener(
  listener?: (event: ZoteroMcpDiagnosticEvent) => void | Promise<void>,
) {
  if (!listener) {
    return () => undefined;
  }
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function subscribeZoteroMcpDiagnostics(
  listener: (event: ZoteroMcpDiagnosticEvent) => void | Promise<void>,
) {
  return addListener(listener);
}

function getComponents() {
  return (
    (globalThis as any).Components ||
    (globalThis as any).ChromeUtils?.importESModule?.(
      "resource://gre/modules/Services.sys.mjs",
    )?.Components
  );
}

function createServerSocket(port: number) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const factory = classes?.["@mozilla.org/network/server-socket;1"];
  const nsIServerSocket = interfaces?.nsIServerSocket;
  if (!factory || !nsIServerSocket) {
    throw new Error("Zotero nsIServerSocket is unavailable");
  }
  const socket = factory.createInstance(nsIServerSocket);
  socket.init(port, true, -1);
  return socket;
}

function pickStartPort() {
  return PORT_MIN + Math.floor(Math.random() * PORT_SPAN);
}

function readInputStream(
  inputStream: any,
  args: {
    close?: boolean;
  } = {},
) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const binaryFactory = classes?.["@mozilla.org/binaryinputstream;1"];
  const nsIBinaryInputStream = interfaces?.nsIBinaryInputStream;
  const factory = classes?.["@mozilla.org/scriptableinputstream;1"];
  const nsIScriptableInputStream = interfaces?.nsIScriptableInputStream;
  if (!binaryFactory && !factory) {
    throw new Error("Zotero scriptable input stream is unavailable");
  }
  const stream =
    binaryFactory && nsIBinaryInputStream
      ? binaryFactory.createInstance(nsIBinaryInputStream)
      : factory.createInstance(nsIScriptableInputStream);
  if (binaryFactory && nsIBinaryInputStream) {
    stream.setInputStream(inputStream);
  } else {
    stream.init(inputStream);
  }
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 500) {
    let available = 0;
    try {
      available = Number(
        stream.available?.() || inputStream.available?.() || 0,
      );
    } catch (error) {
      if (isClosedStreamError(error)) {
        break;
      }
      throw error;
    }
    if (available <= 0) {
      const current = concatBytes(chunks, totalLength);
      if (findHeaderSeparator(current) >= 0) {
        const parsed = tryParseHeaders(current);
        if (parsed && parsed.bodyByteLength >= parsed.contentLength) {
          break;
        }
      }
      continue;
    }
    const chunk =
      binaryFactory && nsIBinaryInputStream
        ? Uint8Array.from(stream.readByteArray(available) || [])
        : binaryStringToBytes(stream.read(available));
    chunks.push(chunk);
    totalLength += chunk.length;
    const current = concatBytes(chunks, totalLength);
    const parsed = tryParseHeaders(current);
    if (parsed && parsed.bodyByteLength >= parsed.contentLength) {
      break;
    }
  }
  if (args.close !== false) {
    stream.close?.();
  }
  return concatBytes(chunks, totalLength);
}

function isClosedStreamError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("NS_BASE_STREAM_CLOSED") || message.includes("0x80470002")
  );
}

function bytesToLatin1String(bytes: Uint8Array) {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.slice(offset, offset + chunkSize)),
    );
  }
  return chunks.join("");
}

function binaryStringToBytes(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function findHeaderSeparator(bytes: Uint8Array) {
  for (let index = 0; index <= bytes.length - 4; index += 1) {
    if (
      bytes[index] === 13 &&
      bytes[index + 1] === 10 &&
      bytes[index + 2] === 13 &&
      bytes[index + 3] === 10
    ) {
      return index;
    }
  }
  return -1;
}

function decodeUtf8Body(bytes: Uint8Array) {
  try {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    return decodeURIComponent(escape(bytesToLatin1String(bytes)));
  } catch {
    return null;
  }
}

function parseHttpHeaders(headerText: string) {
  const headers: Record<string, string> = {};
  for (const line of headerText.split("\r\n").slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return headers;
}

function tryParseHeaders(bytes: Uint8Array) {
  const splitIndex = findHeaderSeparator(bytes);
  if (splitIndex < 0) {
    return null;
  }
  const headerText = bytesToLatin1String(bytes.slice(0, splitIndex));
  const headers = parseHttpHeaders(headerText);
  return {
    bodyByteLength: Math.max(0, bytes.length - splitIndex - 4),
    contentLength: Number(headers["content-length"] || 0),
  };
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseHttpRequestBytes(raw: Uint8Array): HttpRequest {
  const splitIndex = findHeaderSeparator(raw);
  const head =
    splitIndex >= 0
      ? bytesToLatin1String(raw.slice(0, splitIndex))
      : bytesToLatin1String(raw);
  const bodyBytes =
    splitIndex >= 0 ? raw.slice(splitIndex + 4) : new Uint8Array();
  const lines = head.split("\r\n");
  const [method = "", rawPath = ""] = String(lines[0] || "").split(/\s+/);
  const query: Record<string, string> = {};
  const queryIndex = rawPath.indexOf("?");
  const path = queryIndex >= 0 ? rawPath.slice(0, queryIndex) : rawPath;
  const queryText = queryIndex >= 0 ? rawPath.slice(queryIndex + 1) : "";
  let parseError = "";
  for (const part of queryText.split("&")) {
    if (!part) {
      continue;
    }
    const separator = part.indexOf("=");
    const name = separator >= 0 ? part.slice(0, separator) : part;
    const value = separator >= 0 ? part.slice(separator + 1) : "";
    const decodedName = safeDecodeURIComponent(name);
    const decodedValue = safeDecodeURIComponent(value);
    if (decodedName === null || decodedValue === null) {
      parseError = "malformed_query_encoding";
      continue;
    }
    query[decodedName] = decodedValue;
  }
  const headers = parseHttpHeaders(head);
  const contentLength = Math.max(
    0,
    Number(headers["content-length"] || bodyBytes.length),
  );
  const boundedBodyBytes =
    contentLength > 0 ? bodyBytes.slice(0, contentLength) : new Uint8Array();
  const body = decodeUtf8Body(boundedBodyBytes);
  return {
    method: method.toUpperCase(),
    path: path || "/",
    query,
    headers,
    body: body || "",
    bodyByteLength: boundedBodyBytes.byteLength,
    parseError: parseError || (body === null ? "invalid_utf8_body" : ""),
  };
}

function parseHttpRequest(raw: string): HttpRequest {
  return parseHttpRequestBytes(binaryStringToBytes(raw));
}

function utf8ByteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

function writeOutputStream(outputStream: any, response: string) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const converterFactory =
    classes?.["@mozilla.org/intl/converter-output-stream;1"];
  const nsIConverterOutputStream = interfaces?.nsIConverterOutputStream;
  if (converterFactory && nsIConverterOutputStream) {
    const converter = converterFactory.createInstance(nsIConverterOutputStream);
    converter.init(outputStream, "UTF-8");
    converter.writeString(response);
    converter.close();
    return "converter-output-stream";
  }
  outputStream.write(response, response.length);
  outputStream.close?.();
  return "raw-output-stream";
}

function buildHttpResponse(args: {
  status: number;
  reason: string;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}) {
  const bodyText =
    typeof args.body === "string" ? args.body : JSON.stringify(args.body);
  const bodyLength = utf8ByteLength(bodyText);
  return [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    `Content-Type: ${args.contentType || "application/json"}; charset=utf-8`,
    `Content-Length: ${bodyLength}`,
    ...Object.entries(args.headers || {}).map(
      ([name, value]) => `${name}: ${value}`,
    ),
    "Connection: close",
    "",
    bodyText,
  ].join("\r\n");
}

function buildNoContentResponse(args: { status: number; reason: string }) {
  return [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    "Content-Length: 0",
    "Connection: close",
    "",
    "",
  ].join("\r\n");
}

async function isAuthorized(request: HttpRequest) {
  return isHostBridgeAuthorizationValid(request.headers, getHostBridgeToken());
}

function isOriginAllowed(request: HttpRequest) {
  const origin = String(request.headers.origin || "").trim();
  if (!origin) {
    return true;
  }
  try {
    const parsed = new URL(origin);
    if (getHostBridgeServerStatus().lanEnabled === true) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      ["127.0.0.1", "localhost", "[::1]", "::1"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function bodyByteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

function stringifyJsonRpcId(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

function summarizeJsonRpcPayload(body: string) {
  if (!body.trim()) {
    return {
      method: "",
      id: "",
      toolName: "",
      protocolVersion: "",
    };
  }
  try {
    const payload = JSON.parse(body);
    const entries = Array.isArray(payload) ? payload : [payload];
    const methods: string[] = [];
    const ids: string[] = [];
    const toolNames: string[] = [];
    const protocolVersions: string[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const request = entry as {
        method?: unknown;
        id?: unknown;
        params?: {
          protocolVersion?: unknown;
          name?: unknown;
          tool?: unknown;
          toolName?: unknown;
        };
      };
      if (request.method) {
        methods.push(String(request.method));
      }
      if (request.method === "tools/call") {
        const toolName = String(
          request.params?.name ||
            request.params?.toolName ||
            request.params?.tool ||
            "",
        ).trim();
        if (toolName) {
          toolNames.push(toolName);
        }
      }
      const protocolVersion = String(
        request.params?.protocolVersion || "",
      ).trim();
      if (protocolVersion) {
        protocolVersions.push(protocolVersion);
      }
      const id = stringifyJsonRpcId(request.id);
      if (id) {
        ids.push(id);
      }
    }
    return {
      method: methods.join(","),
      id: ids.join(","),
      toolName: toolNames.join(","),
      protocolVersion: protocolVersions.join(","),
    };
  } catch {
    return {
      method: "",
      id: "",
      toolName: "",
      protocolVersion: "",
    };
  }
}

function summarizeJsonRpcPayloadValue(payload: unknown) {
  return summarizeJsonRpcPayload(JSON.stringify(payload || ""));
}

function payloadSummaryMethod(payload: unknown) {
  return summarizeJsonRpcPayloadValue(payload).method;
}

function summarizeJsonRpcResponse(body: unknown) {
  if (body === undefined || body === null) {
    return {
      contentType: "",
      bodyLength: 0,
      jsonrpc: "",
      id: "",
      protocolVersion: "",
      toolCount: 0,
      error: "",
    };
  }
  const bodyText = typeof body === "string" ? body : JSON.stringify(body);
  let parsed: unknown = body;
  if (typeof body === "string" && body.trim()) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }
  }
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry !== "object") {
    return {
      contentType: "",
      bodyLength: bodyText.length,
      jsonrpc: "",
      id: "",
      protocolVersion: "",
      toolCount: 0,
      error: "",
    };
  }
  const response = entry as {
    jsonrpc?: unknown;
    id?: unknown;
    result?: {
      protocolVersion?: unknown;
      tools?: unknown[];
    };
    error?: {
      message?: unknown;
    };
  };
  return {
    contentType: "application/json; charset=utf-8",
    bodyLength:
      typeof TextEncoder === "function"
        ? new TextEncoder().encode(bodyText).length
        : bodyText.length,
    jsonrpc: String(response.jsonrpc || ""),
    id: stringifyJsonRpcId(response.id),
    protocolVersion: String(response.result?.protocolVersion || ""),
    toolCount: Array.isArray(response.result?.tools)
      ? response.result.tools.length
      : 0,
    error: String(response.error?.message || ""),
  };
}

function isMcpPath(request: HttpRequest) {
  return request.path === "/mcp" || request.path === "/mcp/";
}

function sanitizePathForDiagnostics(request: HttpRequest) {
  if (!request.query.token) {
    return request.path;
  }
  return `${request.path}?token=<redacted>`;
}

function createMcpRequestId() {
  mcpRequestSequence += 1;
  return `zotero-mcp-${Date.now().toString(36)}-${mcpRequestSequence}`;
}

function safeRuntimeLogError(error: unknown) {
  if (!error) {
    return undefined;
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

const REQUIRED_SYNTHESIS_SMOKE_TOOLS = [
  ZOTERO_MCP_TOOL_TOPICS_LIST,
  ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
  ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
  ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
];

function requestHeaderFacts(request?: HttpRequest) {
  if (!request) {
    return {};
  }
  const userAgent = String(request.headers["user-agent"] || "").trim();
  return {
    accept: String(request.headers.accept || "").trim(),
    contentType: String(request.headers["content-type"] || "").trim(),
    userAgentFamily: userAgent.split(/[\/\s]/)[0] || "",
    hasMcpSessionId: !!String(request.headers["mcp-session-id"] || "").trim(),
    hasMcpProtocolVersion: !!String(
      request.headers["mcp-protocol-version"] || "",
    ).trim(),
    hasAuthorization: !!String(request.headers.authorization || "").trim(),
  };
}

function responseFacts(response: string) {
  const splitIndex = response.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? response.slice(0, splitIndex) : response;
  const contentLengthLine = head
    .split("\r\n")
    .find((line) => /^content-length\s*:/i.test(line));
  const contentLength = Number(
    contentLengthLine?.slice(contentLengthLine.indexOf(":") + 1).trim() || 0,
  );
  return {
    responseChars: response.length,
    responseBytes: utf8ByteLength(response),
    contentLength,
  };
}

function toolsListFacts(response: unknown) {
  const entry = Array.isArray(response) ? response[0] : response;
  const tools =
    entry && typeof entry === "object"
      ? (entry as { result?: { tools?: unknown[] } }).result?.tools || []
      : [];
  const names = Array.isArray(tools)
    ? tools
        .map((tool) =>
          tool && typeof tool === "object"
            ? String((tool as { name?: unknown }).name || "").trim()
            : "",
        )
        .filter(Boolean)
    : [];
  return {
    toolCount: names.length,
    requiredSynthesisToolsPresent: REQUIRED_SYNTHESIS_SMOKE_TOOLS.every(
      (tool) => names.includes(tool),
    ),
    requiredSynthesisTools: REQUIRED_SYNTHESIS_SMOKE_TOOLS,
  };
}

function appendMcpRuntimeLog(args: {
  requestId: string;
  stage: string;
  phase: "request" | "tool" | "queue" | "response" | "socket";
  level?: RuntimeLogLevel;
  request?: HttpRequest;
  payload?: unknown;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  responseBytes?: number;
  details?: Record<string, unknown>;
  error?: unknown;
}) {
  const payloadSummary = args.payload
    ? summarizeJsonRpcPayloadValue(args.payload)
    : args.request
      ? summarizeJsonRpcPayload(args.request.body)
      : {
          id: "",
          method: "",
          toolName: "",
          protocolVersion: "",
        };
  const error = safeRuntimeLogError(args.error);
  const level =
    args.level ||
    (error
      ? "error"
      : args.stage.endsWith(".failed") || Number(args.status || 0) >= 400
        ? "warn"
        : "info");
  appendRuntimeLog({
    level,
    scope: "system",
    component: MCP_RUNTIME_LOG_COMPONENT,
    operation: args.stage,
    requestId: args.requestId,
    phase: args.phase,
    stage: args.stage,
    message: `Zotero MCP ${args.stage}`,
    transport: {
      method: args.method || args.request?.method,
      path:
        args.path ||
        (args.request ? sanitizePathForDiagnostics(args.request) : ""),
      status: args.status,
      duration: args.durationMs,
      size: args.responseBytes,
    },
    details: {
      jsonrpcMethod: payloadSummary.method,
      jsonrpcId: payloadSummary.id,
      toolName: payloadSummary.toolName,
      protocolVersion: payloadSummary.protocolVersion,
      requestHeaders: requestHeaderFacts(args.request),
      ...args.details,
    },
    error,
  });
}

function getRecentMcpRuntimeLogs(
  limit = MAX_RECENT_RUNTIME_LOGS,
): ZoteroMcpRuntimeLogSummary[] {
  return listRuntimeLogs({
    scopes: ["system"],
    component: MCP_RUNTIME_LOG_COMPONENT,
    levels: ["debug", "info", "warn", "error"],
    order: "desc",
  })
    .slice(0, limit)
    .map((entry) => {
      const details =
        entry.details && typeof entry.details === "object"
          ? (entry.details as Record<string, unknown>)
          : {};
      return {
        ts: entry.ts,
        level: entry.level,
        requestId: entry.requestId || "",
        stage: entry.stage,
        phase: entry.phase || "",
        operation: entry.operation || "",
        message: entry.message,
        method: entry.transport?.method || "",
        path: entry.transport?.path || "",
        status: Number(entry.transport?.status || 0),
        jsonrpcMethod: String(details.jsonrpcMethod || ""),
        jsonrpcId: String(details.jsonrpcId || ""),
        toolName: String(details.toolName || ""),
        durationMs: Number(entry.transport?.duration || 0),
        responseBytes: Number(entry.transport?.size || 0),
        errorName: entry.error?.name || "",
        errorMessage: entry.error?.message || "",
      };
    });
}

function latestMcpRuntimeFailure() {
  return getRecentMcpRuntimeLogs(20).find(
    (entry) => entry.level === "warn" || entry.level === "error",
  );
}

function recordMcpRequest(args: {
  request: HttpRequest;
  status: number;
  authorized: boolean;
  responseBody?: unknown;
  responseContentType?: string;
  queueDepthAtAccept?: number;
  queuePosition?: number;
  queueWaitMs?: number;
  durationMs?: number;
  limitReason?: string;
  toolOutcome?: "" | "success" | "error" | "notification";
  toolErrorName?: string;
  error?: string;
}) {
  const summary = summarizeJsonRpcPayload(args.request.body);
  const responseSummary = summarizeJsonRpcResponse(args.responseBody);
  const entry: ZoteroMcpRequestLogEntry = {
    ts: nowIso(),
    method: args.request.method,
    path: sanitizePathForDiagnostics(args.request),
    status: args.status,
    authorized: args.authorized,
    accept: args.request.headers.accept || "",
    contentType: args.request.headers["content-type"] || "",
    jsonrpcMethod: summary.method,
    jsonrpcId: summary.id,
    jsonrpcToolName: summary.toolName,
    protocolVersion: summary.protocolVersion,
    transportMode: "streamable-http",
    responseContentType:
      args.responseContentType || responseSummary.contentType || "",
    responseBodyLength: responseSummary.bodyLength,
    responseJsonrpc: responseSummary.jsonrpc,
    responseJsonrpcId: responseSummary.id,
    responseProtocolVersion: responseSummary.protocolVersion,
    responseToolCount: responseSummary.toolCount,
    responseError: responseSummary.error,
    queuePolicy: toolCallQueue.getPolicy(),
    queueDepthAtAccept: args.queueDepthAtAccept || 0,
    queuePosition: args.queuePosition || 0,
    queueWaitMs: args.queueWaitMs || 0,
    durationMs: args.durationMs || 0,
    limitReason: args.limitReason || "",
    toolOutcome: args.toolOutcome || "",
    toolErrorName: args.toolErrorName || "",
    error: args.error || "",
  };
  updateState({
    lastResponseStatus: args.status,
    recentRequests: [...state.recentRequests, entry].slice(
      -MAX_RECENT_REQUESTS,
    ),
  });
  emit({
    kind: "zotero_mcp_response",
    level: args.status >= 400 ? "warn" : "info",
    message: `Zotero MCP response ${args.request.method} ${entry.path} ${args.status}`,
    detail: JSON.stringify(entry),
    raw: entry,
  });
}

function payloadContainsToolCall(payload: unknown): boolean {
  const entries = Array.isArray(payload) ? payload : [payload];
  return entries.some(
    (entry) =>
      !!entry &&
      typeof entry === "object" &&
      (entry as { method?: unknown }).method === "tools/call",
  );
}

function firstToolName(payload: unknown): string {
  return (
    summarizeJsonRpcPayloadValue(payload).toolName.split(",")[0]?.trim() || ""
  );
}

function payloadContainsQueuedToolCall(payload: unknown): boolean {
  const entries = Array.isArray(payload) ? payload : [payload];
  return entries.some((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      (entry as { method?: unknown }).method !== "tools/call"
    ) {
      return false;
    }
    const params = (
      entry as {
        params?: { name?: unknown; toolName?: unknown; tool?: unknown };
      }
    ).params;
    const toolName = String(
      params?.name || params?.toolName || params?.tool || "",
    ).trim();
    return toolName !== ZOTERO_MCP_TOOL_GET_MCP_STATUS;
  });
}

function responseContainsError(response: unknown): boolean {
  const entries = Array.isArray(response) ? response : [response];
  return entries.some(
    (entry) => !!entry && typeof entry === "object" && "error" in entry,
  );
}

function responseToolErrorName(response: unknown): string {
  const entries = Array.isArray(response) ? response : [response];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const error = (entry as { error?: { data?: { errorName?: unknown } } })
      .error;
    const errorName = String(error?.data?.errorName || "").trim();
    if (errorName) {
      return errorName;
    }
  }
  return "";
}

function isCircuitCountingErrorName(errorName: string) {
  const normalized = String(errorName || "").trim();
  if (!normalized) {
    return false;
  }
  return ![
    "ZoteroMcpToolInputError",
    "ZoteroMcpQueueFullError",
    "ZoteroMcpQueueTimeoutError",
    "ZoteroMcpToolCircuitOpenError",
    "ZoteroItemNotFoundError",
    "ZoteroMcpPermissionDeniedError",
  ].includes(normalized);
}

function pruneCircuitFailures(record: CircuitBreakerRecord, now = Date.now()) {
  record.failures = record.failures.filter(
    (entry) => now - entry.ts <= CIRCUIT_FAILURE_WINDOW_MS,
  );
}

function resolveCircuitState(toolName: string) {
  const name = String(toolName || "").trim();
  if (!name) {
    return null;
  }
  const record = circuitBreakers.get(name);
  if (!record) {
    return null;
  }
  const now = Date.now();
  if (record.openUntil <= now && record.openUntil > 0) {
    record.openUntil = 0;
    record.openedAt = 0;
  }
  pruneCircuitFailures(record, now);
  if (record.openUntil > now) {
    return {
      open: true,
      retryAfterMs: record.openUntil - now,
      failureCount: record.failures.length,
      lastError: record.lastError,
    };
  }
  return null;
}

function recordCircuitSuccess(toolName: string) {
  const name = String(toolName || "").trim();
  if (!name) {
    return;
  }
  circuitBreakers.delete(name);
}

function recordCircuitFailure(
  toolName: string,
  errorName: string,
  message: string,
) {
  const name = String(toolName || "").trim();
  if (!name || !isCircuitCountingErrorName(errorName)) {
    return;
  }
  const now = Date.now();
  const record =
    circuitBreakers.get(name) ||
    ({
      toolName: name,
      failures: [],
      openedAt: 0,
      openUntil: 0,
      lastError: "",
    } satisfies CircuitBreakerRecord);
  record.failures.push({
    ts: now,
    error: message || errorName,
  });
  record.lastError = message || errorName;
  pruneCircuitFailures(record, now);
  if (record.failures.length >= CIRCUIT_FAILURE_THRESHOLD) {
    record.openedAt = now;
    record.openUntil = now + CIRCUIT_OPEN_MS;
  }
  circuitBreakers.set(name, record);
}

function jsonRpcInternalError(id: ZoteroMcpJsonRpcId, error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "Internal error");
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: -32603,
      message,
      data: {
        errorName: error instanceof Error ? error.name : "Error",
      },
    },
  };
}

function jsonRpcToolTimeoutError(id: ZoteroMcpJsonRpcId, toolName: string) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: -32003,
      message: `Zotero MCP tool "${toolName || "unknown"}" timed out`,
      data: {
        code: "zotero_mcp_tool_timeout",
        errorName: "ZoteroMcpToolTimeoutError",
        toolName,
        runningTimeoutMs: toolCallQueue.getPolicy().runningTimeoutMs,
      },
    },
  };
}

function jsonRpcCircuitOpenError(
  id: ZoteroMcpJsonRpcId,
  toolName: string,
  circuit: {
    retryAfterMs: number;
    failureCount: number;
    lastError: string;
  },
) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: -32010,
      message: `Zotero MCP tool "${toolName}" is temporarily disabled after repeated failures`,
      data: {
        code: "zotero_mcp_tool_circuit_open",
        errorName: "ZoteroMcpToolCircuitOpenError",
        toolName,
        failureCount: circuit.failureCount,
        retryAfterMs: circuit.retryAfterMs,
        lastError: circuit.lastError,
      },
    },
  };
}

function jsonRpcQueueError(
  id: ZoteroMcpJsonRpcId,
  kind: "queue_full" | "queue_timeout",
) {
  const full = kind === "queue_full";
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: full ? -32001 : -32002,
      message: full
        ? "Zotero MCP tool queue is full"
        : "Zotero MCP tool queue wait timed out",
      data: {
        code: full ? "zotero_mcp_queue_full" : "zotero_mcp_queue_timeout",
        errorName: full
          ? "ZoteroMcpQueueFullError"
          : "ZoteroMcpQueueTimeoutError",
      },
    },
  };
}

function firstJsonRpcId(payload: unknown): ZoteroMcpJsonRpcId {
  const entry = Array.isArray(payload) ? payload[0] : payload;
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const id = (entry as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" || id === null
    ? id
    : null;
}

function firstJsonRpcIdFromRaw(rawRequest: string): ZoteroMcpJsonRpcId {
  const splitIndex = rawRequest.indexOf("\r\n\r\n");
  const body = splitIndex >= 0 ? rawRequest.slice(splitIndex + 4) : "";
  try {
    return firstJsonRpcId(JSON.parse(body || "{}"));
  } catch {
    return null;
  }
}

async function runMcpJsonRpcWithMetrics(
  payload: unknown,
  requestId = "",
): Promise<{
  response: unknown;
  queueDepthAtAccept: number;
  queuePosition: number;
  queueWaitMs: number;
  durationMs: number;
  limitReason: string;
  toolOutcome: "" | "success" | "error" | "notification";
  toolErrorName: string;
}> {
  const shouldQueue = payloadContainsQueuedToolCall(payload);
  const toolName = firstToolName(payload);
  if (payloadContainsToolCall(payload)) {
    appendMcpRuntimeLog({
      requestId,
      stage: "tool.resolved",
      phase: "tool",
      payload,
      details: {
        queued: shouldQueue,
      },
    });
  }
  if (shouldQueue) {
    const circuit = resolveCircuitState(toolName);
    if (circuit?.open) {
      return {
        response: jsonRpcCircuitOpenError(
          firstJsonRpcId(payload),
          toolName,
          circuit,
        ),
        queueDepthAtAccept: 0,
        queuePosition: 0,
        queueWaitMs: 0,
        durationMs: 0,
        limitReason: "tool_circuit_open",
        toolOutcome: "error",
        toolErrorName: "ZoteroMcpToolCircuitOpenError",
      };
    }
  }
  const run = async () => {
    const startedAt = Date.now();
    try {
      if (shouldQueue) {
        await state.beforeToolCallForTests?.();
      }
      if (payloadContainsToolCall(payload)) {
        appendMcpRuntimeLog({
          requestId,
          stage: "tool.started",
          phase: "tool",
          payload,
          details: {
            toolName,
          },
        });
      }
      const response = await handleZoteroMcpJsonRpc(payload, {
        resolveHostContext: state.resolveHostContext,
        resolveMcpStatus: () =>
          getZoteroMcpServerStatus() as unknown as Record<string, unknown>,
        resolveHostBridgeStatus: getHostBridgeServerStatus,
        requestToolPermission: state.requestToolPermission,
        onToolCall: async (event) => {
          updateState({
            toolCallCount: state.toolCallCount + 1,
          });
          emit({
            kind: "zotero_mcp_tool_call",
            level: event.error ? "error" : "info",
            message: event.error
              ? `Zotero MCP tool call failed ${event.toolName}`
              : `Zotero MCP tool call ${event.toolName}`,
            detail: event.error
              ? JSON.stringify(event.error)
              : JSON.stringify(event.result || event.hostContext || {}),
            raw: event.error || event.result || event.hostContext,
          });
        },
      } satisfies ZoteroMcpHandlerOptions);
      const toolOutcome = shouldQueue
        ? responseContainsError(response)
          ? "error"
          : "success"
        : response
          ? ""
          : "notification";
      const toolErrorName = responseToolErrorName(response);
      if (shouldQueue && toolOutcome === "success") {
        recordCircuitSuccess(toolName);
      } else if (shouldQueue && toolOutcome === "error") {
        recordCircuitFailure(
          toolName,
          toolErrorName,
          summarizeJsonRpcResponse(response).error,
        );
      }
      if (payloadContainsToolCall(payload)) {
        appendMcpRuntimeLog({
          requestId,
          stage: toolOutcome === "error" ? "tool.failed" : "tool.finished",
          phase: "tool",
          level: toolOutcome === "error" ? "warn" : "info",
          payload,
          durationMs: Date.now() - startedAt,
          details: {
            toolOutcome,
            toolErrorName,
          },
        });
      }
      return {
        response,
        durationMs: Date.now() - startedAt,
        toolOutcome: toolOutcome as "" | "success" | "error" | "notification",
        toolErrorName,
      };
    } catch (error) {
      const response = jsonRpcInternalError(firstJsonRpcId(payload), error);
      if (shouldQueue) {
        recordCircuitFailure(
          toolName,
          error instanceof Error ? error.name : "Error",
          compactMcpError(error),
        );
      }
      emit({
        kind: "zotero_mcp_tool_call",
        level: "error",
        message: "Zotero MCP tool call failed",
        detail: error instanceof Error ? error.message : String(error || ""),
        raw: response,
      });
      appendMcpRuntimeLog({
        requestId,
        stage: "tool.failed",
        phase: "tool",
        level: "error",
        payload,
        durationMs: Date.now() - startedAt,
        error,
      });
      return {
        response,
        durationMs: Date.now() - startedAt,
        toolOutcome: shouldQueue ? ("error" as const) : ("" as const),
        toolErrorName: error instanceof Error ? error.name : "Error",
      };
    }
  };

  if (!shouldQueue) {
    const result = await run();
    return {
      ...result,
      queueDepthAtAccept: 0,
      queuePosition: 0,
      queueWaitMs: 0,
      limitReason: "",
    };
  }

  try {
    appendMcpRuntimeLog({
      requestId,
      stage: "queue.accepted",
      phase: "queue",
      payload,
      details: {
        toolName,
      },
    });
    const queueResult = await toolCallQueue.enqueue(toolName, run);
    if (queueResult.kind !== "ok") {
      const response =
        queueResult.kind === "tool_timeout"
          ? jsonRpcToolTimeoutError(firstJsonRpcId(payload), toolName)
          : jsonRpcQueueError(firstJsonRpcId(payload), queueResult.kind);
      if (queueResult.kind === "tool_timeout") {
        recordCircuitFailure(
          toolName,
          "ZoteroMcpToolTimeoutError",
          `Timed out after ${toolCallQueue.getPolicy().runningTimeoutMs}ms`,
        );
      }
      return {
        response,
        queueDepthAtAccept: queueResult.queueDepthAtAccept,
        queuePosition: queueResult.queuePosition,
        queueWaitMs: queueResult.queueWaitMs,
        durationMs: 0,
        limitReason: queueResult.limitReason,
        toolOutcome: "error",
        toolErrorName:
          queueResult.kind === "tool_timeout"
            ? "ZoteroMcpToolTimeoutError"
            : queueResult.kind === "queue_full"
              ? "ZoteroMcpQueueFullError"
              : "ZoteroMcpQueueTimeoutError",
      };
    }
    return {
      ...queueResult.value,
      queueDepthAtAccept: queueResult.queueDepthAtAccept,
      queuePosition: queueResult.queuePosition,
      queueWaitMs: queueResult.queueWaitMs,
      limitReason: "",
    };
  } catch (error) {
    const response = jsonRpcInternalError(firstJsonRpcId(payload), error);
    return {
      response,
      queueDepthAtAccept: 0,
      queuePosition: 0,
      queueWaitMs: 0,
      durationMs: 0,
      limitReason: "",
      toolOutcome: "error",
      toolErrorName: error instanceof Error ? error.name : "Error",
    };
  }
}

async function handleHttpRequest(
  request: HttpRequest,
  requestId = createMcpRequestId(),
): Promise<string> {
  if (!isZoteroMcpServerEnabled()) {
    const responseBody = {
      error: "zotero_mcp_disabled",
      message: "Zotero MCP server is disabled by preference",
    };
    recordMcpRequest({
      request,
      status: 503,
      authorized: false,
      responseBody,
      error: "zotero_mcp_disabled",
    });
    return buildHttpResponse({
      status: 503,
      reason: "Service Unavailable",
      body: responseBody,
    });
  }
  const authorized = await isAuthorized(request);
  updateState({
    requestCount: state.requestCount + 1,
    lastRequestMethod: `${request.method} ${request.path}`,
  });
  appendMcpRuntimeLog({
    requestId,
    stage: "request.accepted",
    phase: "request",
    request,
    details: {
      authorized,
    },
  });
  emit({
    kind: "zotero_mcp_request",
    message: `Zotero MCP request ${request.method} ${request.path}`,
  });

  if (request.parseError) {
    const responseBody = {
      error: "bad_request",
      reason: request.parseError,
    };
    recordMcpRequest({
      request,
      status: 400,
      authorized,
      responseBody,
      error: "bad_request",
    });
    return buildHttpResponse({
      status: 400,
      reason: "Bad Request",
      body: responseBody,
    });
  }

  if (request.path === "/health" && request.method === "GET") {
    recordMcpRequest({
      request,
      status: 200,
      authorized: true,
      responseBody: {
        status: state.status,
        endpoint: state.endpoint,
      },
    });
    return buildHttpResponse({
      status: 200,
      reason: "OK",
      body: {
        status: state.status,
        endpoint: state.endpoint,
      },
    });
  }
  if (!isMcpPath(request)) {
    recordMcpRequest({
      request,
      status: 404,
      authorized,
      responseBody: {
        error: "not_found",
      },
      error: "not_found",
    });
    return buildHttpResponse({
      status: 404,
      reason: "Not Found",
      body: {
        error: "not_found",
      },
    });
  }
  if (!authorized) {
    recordMcpRequest({
      request,
      status: 401,
      authorized,
      responseBody: {
        error: "unauthorized",
      },
      error: "unauthorized",
    });
    return buildHttpResponse({
      status: 401,
      reason: "Unauthorized",
      body: {
        error: "unauthorized",
      },
    });
  }
  if (!isOriginAllowed(request)) {
    const responseBody = {
      error: "origin_not_allowed",
    };
    recordMcpRequest({
      request,
      status: 403,
      authorized,
      responseBody,
      error: "origin_not_allowed",
    });
    return buildHttpResponse({
      status: 403,
      reason: "Forbidden",
      body: responseBody,
    });
  }
  if (request.method === "GET") {
    const responseBody = {
      error: "streamable_http_get_not_supported",
    };
    recordMcpRequest({
      request,
      status: 405,
      authorized,
      responseBody,
      error: "streamable_http_get_not_supported",
    });
    return buildHttpResponse({
      status: 405,
      reason: "Method Not Allowed",
      body: responseBody,
      headers: {
        Allow: "POST",
      },
    });
  }
  if (request.method !== "POST") {
    recordMcpRequest({
      request,
      status: 405,
      authorized,
      responseBody: {
        error: "method_not_allowed",
      },
      error: "method_not_allowed",
    });
    return buildHttpResponse({
      status: 405,
      reason: "Method Not Allowed",
      body: {
        error: "method_not_allowed",
      },
    });
  }
  if ((request.bodyByteLength || 0) > MAX_MCP_REQUEST_BODY_BYTES) {
    const responseBody = {
      error: "request_body_too_large",
      maxBytes: MAX_MCP_REQUEST_BODY_BYTES,
    };
    recordMcpRequest({
      request,
      status: 413,
      authorized,
      responseBody,
      error: "request_body_too_large",
      limitReason: "request_body_too_large",
    });
    return buildHttpResponse({
      status: 413,
      reason: "Payload Too Large",
      body: responseBody,
    });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(request.body || "{}");
    appendMcpRuntimeLog({
      requestId,
      stage: "request.parsed",
      phase: "request",
      request,
      payload,
    });
  } catch {
    appendMcpRuntimeLog({
      requestId,
      stage: "request.parse.failed",
      phase: "request",
      level: "warn",
      request,
      error: new Error("Parse error"),
    });
    recordMcpRequest({
      request,
      status: 400,
      authorized,
      responseBody: {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      },
      error: "parse_error",
    });
    return buildHttpResponse({
      status: 400,
      reason: "Bad Request",
      body: {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      },
    });
  }
  const result = await runMcpJsonRpcWithMetrics(payload, requestId);
  const response = result.response;
  if (!response) {
    recordMcpRequest({
      request,
      status: 202,
      authorized,
      responseBody: "",
      responseContentType: "",
      queueDepthAtAccept: result.queueDepthAtAccept,
      queuePosition: result.queuePosition,
      queueWaitMs: result.queueWaitMs,
      durationMs: result.durationMs,
      limitReason: result.limitReason,
      toolOutcome: result.toolOutcome,
      toolErrorName: result.toolErrorName,
    });
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.started",
      phase: "response",
      request,
      payload,
      status: 202,
    });
    const noContentResponse = buildNoContentResponse({
      status: 202,
      reason: "Accepted",
    });
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.finished",
      phase: "response",
      request,
      payload,
      status: 202,
      responseBytes: noContentResponse.length,
      details: responseFacts(noContentResponse),
    });
    return noContentResponse;
  }
  try {
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.started",
      phase: "response",
      request,
      payload,
      status: 200,
    });
    const rawResponse = buildHttpResponse({
      status: 200,
      reason: "OK",
      body: response,
    });
    recordMcpRequest({
      request,
      status: 200,
      authorized,
      responseBody: response,
      queueDepthAtAccept: result.queueDepthAtAccept,
      queuePosition: result.queuePosition,
      queueWaitMs: result.queueWaitMs,
      durationMs: result.durationMs,
      limitReason: result.limitReason,
      toolOutcome: result.toolOutcome,
      toolErrorName: result.toolErrorName,
    });
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.finished",
      phase: "response",
      request,
      payload,
      status: 200,
      responseBytes: rawResponse.length,
      details: {
        ...responseFacts(rawResponse),
        ...(payloadSummaryMethod(payload) === "tools/list"
          ? toolsListFacts(response)
          : {}),
      },
    });
    return rawResponse;
  } catch (error) {
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.failed",
      phase: "response",
      level: "error",
      request,
      payload,
      status: 500,
      error,
    });
    return buildHttpResponse({
      status: 200,
      reason: "OK",
      body: jsonRpcInternalError(firstJsonRpcId(payload), error),
    });
  }
}

function scheduleWatchdogRestart(reason: string) {
  if (intentionalShutdown || state.status === "starting") {
    return;
  }
  const preferredPort = state.port;
  const listeners = state.listeners;
  restartCount += 1;
  lastRestartAt = nowIso();
  lastFatalError = reason;
  updateState({
    status: "starting",
    lastError: reason,
  });
  try {
    state.serverSocket?.close?.();
  } catch {
    // Best effort.
  }
  toolCallQueue.reset();
  activeTool = "";
  runningStartedAt = "";
  activeToolTimedOut = false;
  runningTimedOutAt = "";
  emit({
    kind: "zotero_mcp_error",
    level: "warn",
    message: "Zotero MCP watchdog restarting server",
    detail: reason,
  });
  startingPromise = startServer(preferredPort)
    .catch((error) => {
      updateState({
        status: "error",
        lastError: compactMcpError(error),
      });
      return Promise.reject(error);
    })
    .finally(() => {
      startingPromise = null;
      state.listeners = listeners;
    });
  void startingPromise.catch(() => {
    // Diagnostics already captured; keep the current ACP session alive.
  });
}

function buildRequestFailureResponse(rawRequest: string, error: unknown) {
  const message = compactMcpError(error);
  return buildHttpResponse({
    status: rawRequest ? 200 : 500,
    reason: rawRequest ? "OK" : "Internal Server Error",
    body: rawRequest
      ? jsonRpcInternalError(firstJsonRpcIdFromRaw(rawRequest), error)
      : {
          error: "zotero_mcp_request_failed",
          message,
        },
  });
}

function listen(serverSocket: any) {
  const listener = {
    onSocketAccepted(_server: unknown, transport: any) {
      void (async () => {
        let output: any;
        let rawRequest = new Uint8Array();
        try {
          const input = transport.openInputStream(0, 0, 0);
          output = transport.openOutputStream(0, 0, 0);
          rawRequest = readInputStream(input, { close: false });
          if (!rawRequest.length) {
            transport.close?.(0);
            return;
          }
          const request = parseHttpRequestBytes(rawRequest);
          const requestId = createMcpRequestId();
          const response = await handleHttpRequest(request, requestId);
          appendMcpRuntimeLog({
            requestId,
            stage: "response.write.started",
            phase: "response",
            request,
            responseBytes: response.length,
            details: responseFacts(response),
          });
          try {
            const writeStartedAt = Date.now();
            const writerType = writeOutputStream(output, response);
            appendMcpRuntimeLog({
              requestId,
              stage: "response.write.finished",
              phase: "response",
              request,
              responseBytes: response.length,
              durationMs: Date.now() - writeStartedAt,
              details: {
                ...responseFacts(response),
                writerType,
                closeOutcome: "closed",
              },
            });
          } catch (error) {
            appendMcpRuntimeLog({
              requestId,
              stage: "response.write.failed",
              phase: "response",
              level: "error",
              request,
              responseBytes: response.length,
              details: responseFacts(response),
              error,
            });
            throw error;
          }
          transport.close?.(0);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error || "");
          lastFatalError = message;
          updateState({
            status: state.status === "running" ? "running" : "error",
            lastError: message,
          });
          emit({
            kind: "zotero_mcp_error",
            level: "error",
            message: "Zotero MCP request failed",
            detail: message,
          });
          appendMcpRuntimeLog({
            requestId: "zotero-mcp-listener",
            stage: "request.fatal",
            phase: "request",
            level: "error",
            error,
          });
          try {
            if (output) {
              writeOutputStream(
                output,
                buildRequestFailureResponse(
                  bytesToLatin1String(rawRequest),
                  error,
                ),
              );
            }
          } catch {
            // Fall through to socket close.
          }
          scheduleWatchdogRestart(message);
          try {
            transport.close?.(0);
          } catch {
            // Best effort cleanup.
          }
        }
      })();
    },
    onStopListening() {
      if (state.status === "running") {
        updateState({
          status: "stopped",
        });
        scheduleWatchdogRestart("server socket stopped");
      }
    },
  };
  serverSocket.asyncListen(listener);
}

function buildDescriptor(): ZoteroMcpServerDescriptor {
  syncMcpRouteStateFromHostBridge();
  const token = getHostBridgeToken();
  if (state.token !== token) {
    updateState({ token });
  }
  return {
    name: "zotero",
    type: "http",
    url: state.endpoint,
    headers: [
      {
        name: "Authorization",
        value: `Bearer ${token}`,
      },
    ],
    enabled: true,
  };
}

function syncMcpRouteStateFromHostBridge() {
  if (!isZoteroMcpServerEnabled()) {
    if (state.status !== "stopped") {
      updateState({
        status: "stopped",
        endpoint: "",
        port: 0,
        lastError: "Zotero MCP server is disabled by preference",
      });
    }
    return;
  }
  if (state.status !== "running") {
    return;
  }
  const server = getHostBridgeServerStatus();
  if (server.status !== "running") {
    updateState({
      status: server.status === "error" ? "error" : "stopped",
      lastError: server.lastError || server.lastRecoveryReason,
    });
    return;
  }
  const endpoint = mcpEndpointFromHostBridge(server);
  const facts = endpointFacts(endpoint);
  updateState({
    status: "running",
    host: facts.host,
    port: facts.port,
    endpoint,
    token: getHostBridgeToken(),
    lastError: "",
  });
}

function mcpEndpointFromHostBridge(server: HostBridgeStatusSnapshot) {
  const bridgeEndpoint =
    server.lanEnabled === true
      ? server.remoteEndpoint || server.endpoint
      : server.endpoint;
  return String(bridgeEndpoint || "").replace(/\/bridge\/v1\/?$/, "/mcp");
}

function endpointFacts(endpoint: string) {
  try {
    const parsed = new URL(endpoint);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 80),
    };
  } catch {
    return {
      host: HOST,
      port: 0,
    };
  }
}

async function startServer(_preferredPort?: number) {
  updateState({
    status: "starting",
    lastError: "",
  });
  emit({
    kind: "zotero_mcp_starting",
    message: "Starting embedded Zotero MCP route",
  });

  const previousEndpoint = state.endpoint;
  try {
    const server = await ensureHostBridgeServer();
    const endpoint = mcpEndpointFromHostBridge(server);
    const facts = endpointFacts(endpoint);
    const token = getHostBridgeToken();
    updateState({
      status: "running",
      host: facts.host,
      port: facts.port,
      endpoint,
      token,
      serverSocket: null,
      lastError: "",
    });
    if (previousEndpoint && previousEndpoint !== endpoint) {
      descriptorStale = true;
    }
    emit({
      kind: "zotero_mcp_started",
      message: "Embedded Zotero MCP route started",
      detail: endpoint,
    });
    return buildDescriptor();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error || "Failed to start Zotero MCP route");
    updateState({
      status: "error",
      lastError: message,
    });
    emit({
      kind: "zotero_mcp_unavailable",
      level: "warn",
      message: "Embedded Zotero MCP route is unavailable",
      detail: message,
    });
    throw new Error(message);
  }
}

export async function ensureZoteroMcpServer(
  args: {
    resolveHostContext?: () => AcpHostContext;
    requestToolPermission?: (
      request: ZoteroMcpToolPermissionRequest,
    ) =>
      | Promise<ZoteroMcpToolPermissionDecision>
      | ZoteroMcpToolPermissionDecision;
    onDiagnostic?: (event: ZoteroMcpDiagnosticEvent) => void | Promise<void>;
  } = {},
) {
  addListener(args.onDiagnostic);
  if (!isZoteroMcpServerEnabled()) {
    const message = "Zotero MCP server is disabled by preference";
    updateState({
      status: state.status === "running" ? "running" : "stopped",
      lastError: message,
    });
    emit({
      kind: "zotero_mcp_unavailable",
      level: "info",
      message,
    });
    throw new Error(message);
  }
  if (args.resolveHostContext) {
    updateState({
      resolveHostContext: args.resolveHostContext,
    });
  }
  if (args.requestToolPermission) {
    updateState({
      requestToolPermission: args.requestToolPermission,
    });
  }
  if (state.status === "running" && state.endpoint && state.token) {
    return buildDescriptor();
  }
  if (!startingPromise) {
    startingPromise = startServer().finally(() => {
      startingPromise = null;
    });
  }
  await startingPromise;
  return buildDescriptor();
}

export async function shutdownZoteroMcpServer() {
  intentionalShutdown = true;
  const listeners = state.listeners;
  state = createEmptyState("stopped");
  state.listeners = listeners;
  toolCallQueue.reset();
  activeTool = "";
  runningStartedAt = "";
  activeToolTimedOut = false;
  runningTimedOutAt = "";
  descriptorInjected = false;
  descriptorInjectedAt = "";
  intentionalShutdown = false;
}

export async function handleZoteroMcpHostAccessRequest(request: HttpRequest) {
  if (isZoteroMcpServerEnabled() && state.status !== "running") {
    await ensureZoteroMcpServer();
  }
  return handleHttpRequest(request);
}

export function resetZoteroMcpServerForTests() {
  void shutdownZoteroMcpServer();
  state.listeners.clear();
  startingPromise = null;
  circuitBreakers.clear();
  restartCount = 0;
  lastRestartAt = "";
  lastFatalError = "";
  descriptorStale = false;
  descriptorInjected = false;
  descriptorInjectedAt = "";
  activeTool = "";
  runningStartedAt = "";
  activeToolTimedOut = false;
  runningTimedOutAt = "";
}

export async function handleZoteroMcpRequestForTests(
  payload: unknown,
  options?: ZoteroMcpHandlerOptions,
) {
  return await handleZoteroMcpJsonRpc(payload, options);
}

export function buildZoteroMcpRequestFailureResponseForTests(
  rawRequest: string,
  error: unknown,
) {
  return buildRequestFailureResponse(rawRequest, error);
}

export function recordZoteroMcpResponseWriteFailureForTests(error: unknown) {
  appendMcpRuntimeLog({
    requestId: createMcpRequestId(),
    stage: "response.write.failed",
    phase: "response",
    level: "error",
    error,
  });
}

export function serializeZoteroMcpResponseForTests(response: unknown) {
  const requestId = createMcpRequestId();
  const request: HttpRequest = {
    method: "POST",
    path: "/mcp",
    query: {},
    headers: {
      "content-type": "application/json",
    },
    body: "",
    bodyByteLength: 0,
  };
  try {
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.started",
      phase: "response",
      request,
      status: 200,
    });
    const raw = buildHttpResponse({
      status: 200,
      reason: "OK",
      body: response,
    });
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.finished",
      phase: "response",
      request,
      status: 200,
      responseBytes: raw.length,
    });
    return raw;
  } catch (error) {
    appendMcpRuntimeLog({
      requestId,
      stage: "response.serialize.failed",
      phase: "response",
      level: "error",
      request,
      status: 500,
      error,
    });
    return buildHttpResponse({
      status: 200,
      reason: "OK",
      body: jsonRpcInternalError(null, error),
    });
  }
}

export function configureZoteroMcpServerForTests(
  args: {
    token?: string;
    endpoint?: string;
    resolveHostContext?: () => AcpHostContext;
    requestToolPermission?: (
      request: ZoteroMcpToolPermissionRequest,
    ) =>
      | Promise<ZoteroMcpToolPermissionDecision>
      | ZoteroMcpToolPermissionDecision;
    pendingLimit?: number;
    queueTimeoutMs?: number;
    runningTimeoutMs?: number;
    beforeToolCallForTests?: () => Promise<void> | void;
  } = {},
) {
  toolCallQueue.reset();
  toolCallQueue.configure({
    pendingLimit: args.pendingLimit,
    queueTimeoutMs: args.queueTimeoutMs,
    runningTimeoutMs: args.runningTimeoutMs,
  });
  const token = args.token || "test-token";
  setPref("hostBridgeToken", token);
  updateState({
    status: "running",
    host: HOST,
    port: 0,
    endpoint: args.endpoint || "http://127.0.0.1:0/mcp",
    token,
    resolveHostContext: args.resolveHostContext,
    requestToolPermission: args.requestToolPermission,
    beforeToolCallForTests: args.beforeToolCallForTests,
    lastError: "",
  });
  return state.token;
}

function normalizeTestHeaders(headers?: Record<string, unknown>) {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers || {})) {
    if (Array.isArray(value)) {
      normalized[name.toLowerCase()] = value.join(", ");
    } else if (value !== undefined && value !== null) {
      normalized[name.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

function parseTestPath(rawPath: string) {
  const query: Record<string, string> = {};
  const queryIndex = rawPath.indexOf("?");
  const path = queryIndex >= 0 ? rawPath.slice(0, queryIndex) : rawPath;
  const queryText = queryIndex >= 0 ? rawPath.slice(queryIndex + 1) : "";
  let parseError = "";
  for (const part of queryText.split("&")) {
    if (!part) {
      continue;
    }
    const separator = part.indexOf("=");
    const name = separator >= 0 ? part.slice(0, separator) : part;
    const value = separator >= 0 ? part.slice(separator + 1) : "";
    const decodedName = safeDecodeURIComponent(name);
    const decodedValue = safeDecodeURIComponent(value);
    if (decodedName === null || decodedValue === null) {
      parseError = "malformed_query_encoding";
      continue;
    }
    query[decodedName] = decodedValue;
  }
  return {
    path: path || "/",
    query,
    parseError,
  };
}

export async function handleZoteroMcpHttpRequestForTests(args: {
  method: string;
  path: string;
  headers?: Record<string, unknown>;
  body?: string;
  rawRequestBytes?: Uint8Array;
}) {
  const requestId = createMcpRequestId();
  const parsedPath = parseTestPath(args.path || "/");
  const body = args.body || "";
  const request = args.rawRequestBytes
    ? parseHttpRequestBytes(args.rawRequestBytes)
    : {
        method: String(args.method || "GET").toUpperCase(),
        path: parsedPath.path,
        query: parsedPath.query,
        headers: normalizeTestHeaders(args.headers),
        body,
        bodyByteLength: utf8ByteLength(body),
        parseError: parsedPath.parseError,
      };
  const response = await handleHttpRequest(request, requestId);
  appendMcpRuntimeLog({
    requestId,
    stage: "response.write.started",
    phase: "response",
    request,
    responseBytes: response.length,
  });
  appendMcpRuntimeLog({
    requestId,
    stage: "response.write.finished",
    phase: "response",
    request,
    responseBytes: response.length,
  });
  return response;
}
