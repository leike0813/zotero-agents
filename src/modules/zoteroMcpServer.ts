import type { AcpMcpHealthSnapshot } from "./acpTypes";
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
  prepareEmptyHttpResponse,
  prepareJsonHttpResponse,
  prepareTextHttpResponse,
  type PreparedMemoryHttpResponse,
} from "./runtimeHttpResponse";
import {
  appendRuntimeLog,
  listRuntimeLogs,
  type RuntimeLogLevel,
} from "./runtimeLogManager";
import { getPref, setPref } from "../utils/prefs";
import {
  handleZoteroMcpJsonRpc,
  ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
  ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
  ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
  ZOTERO_MCP_TOOL_TOPICS_LIST,
  type ZoteroMcpHandlerOptions,
  type ZoteroMcpJsonRpcId,
  type ZoteroMcpToolPermissionDecision,
  type ZoteroMcpToolPermissionRequest,
} from "./zoteroMcpProtocol";
import {
  createCancellationController,
  type CancellationSignal,
} from "../utils/wait";
import type { WorkflowCallControl } from "../workflows/types";

const ZOTERO_MCP_STATUS_TOOL_NAME = "diagnostic.get_status";

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
  admissionPolicy: ZoteroMcpAdmissionPolicy;
  admissionState: ZoteroMcpAdmissionState;
  guardState: ZoteroMcpGuardState;
  recentRuntimeLogs: ZoteroMcpRuntimeLogSummary[];
  recentRequests: ZoteroMcpRequestLogEntry[];
  updatedAt: string;
};

export type ZoteroMcpAdmissionPolicy = {
  inflightLimit: 9;
  runningTimeoutMs: number;
};

export type ZoteroMcpAdmissionState = {
  inflight: number;
  limit: number;
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
  activeTools: string[];
  runningCount: number;
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
  admissionPolicy: ZoteroMcpAdmissionPolicy;
  inflightAtAccept: number;
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
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  toolCallCount: number;
  recentRequests: ZoteroMcpRequestLogEntry[];
  updatedAt: string;
  resolveZoteroHostCapabilityBroker?: ZoteroMcpHandlerOptions["resolveZoteroHostCapabilityBroker"];
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
  signal?: CancellationSignal;
  parseError?: string;
};

const HOST = "127.0.0.1";
const MAX_RECENT_REQUESTS = 16;
const DEFAULT_TOOL_INFLIGHT_LIMIT = 9;
const DEFAULT_TOOL_RUNNING_TIMEOUT_MS = 45000;
const MAX_MCP_REQUEST_BODY_BYTES = 1024 * 1024;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_FAILURE_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_OPEN_MS = 60 * 1000;
const MCP_RUNTIME_LOG_COMPONENT = "zotero-mcp";
const MAX_RECENT_RUNTIME_LOGS = 12;

type ZoteroMcpAdmissionAcceptedResult<T> = {
  kind: "ok";
  value: T;
  inflightAtAccept: number;
  limitReason: "";
};

type ZoteroMcpAdmissionRejectedResult = {
  kind: "inflight_limit" | "tool_timeout";
  inflightAtAccept: number;
  limitReason: "inflight_limit" | "tool_timeout";
};

type ZoteroMcpAdmissionResult<T> =
  | ZoteroMcpAdmissionAcceptedResult<T>
  | ZoteroMcpAdmissionRejectedResult;

type ZoteroMcpActiveTool = {
  toolName: string;
  startedAt: string;
  timedOut: boolean;
  timedOutAt: string;
};

type ZoteroMcpAdmissionCallbacks = {
  onTimeout?: () => void;
};

type ZoteroMcpAdmissionItem<T> = {
  toolName: string;
  run: () => Promise<T>;
};

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
const activeToolRuns = new Map<number, ZoteroMcpActiveTool>();
let nextActiveToolId = 0;
let mcpRequestSequence = 0;

class ZoteroMcpToolAdmission {
  private policy: ZoteroMcpAdmissionPolicy = {
    inflightLimit: DEFAULT_TOOL_INFLIGHT_LIMIT,
    runningTimeoutMs: DEFAULT_TOOL_RUNNING_TIMEOUT_MS,
  };

  private inflight = 0;
  private generation = 0;

  configure(
    policy: Partial<Pick<ZoteroMcpAdmissionPolicy, "runningTimeoutMs">> = {},
  ) {
    this.policy = {
      inflightLimit: DEFAULT_TOOL_INFLIGHT_LIMIT,
      runningTimeoutMs:
        Number.isFinite(Number(policy.runningTimeoutMs)) &&
        Number(policy.runningTimeoutMs) >= 0
          ? Math.floor(Number(policy.runningTimeoutMs))
          : DEFAULT_TOOL_RUNNING_TIMEOUT_MS,
    };
  }

  snapshot(): ZoteroMcpAdmissionState {
    return {
      inflight: this.inflight,
      limit: this.policy.inflightLimit,
    };
  }

  getPolicy(): ZoteroMcpAdmissionPolicy {
    return { ...this.policy };
  }

  reset() {
    this.generation += 1;
    this.inflight = 0;
    activeToolRuns.clear();
    this.configure();
  }

  admit<T>(
    item: ZoteroMcpAdmissionItem<T>,
    callbacks: ZoteroMcpAdmissionCallbacks = {},
  ): Promise<ZoteroMcpAdmissionResult<T>> {
    const inflightAtAccept = this.inflight;
    if (inflightAtAccept >= this.policy.inflightLimit) {
      return Promise.resolve({
        kind: "inflight_limit",
        inflightAtAccept,
        limitReason: "inflight_limit",
      });
    }

    this.inflight += 1;
    const admissionGeneration = this.generation;
    const activeToolId = ++nextActiveToolId;
    const activeTool: ZoteroMcpActiveTool = {
      toolName: item.toolName,
      startedAt: nowIso(),
      timedOut: false,
      timedOutAt: "",
    };
    activeToolRuns.set(activeToolId, activeTool);
    const timeoutMs = this.policy.runningTimeoutMs;
    let runningTimeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const runPromise = Promise.resolve().then(() => item.run());
    runPromise.catch(() => {
      // Suppress late rejections after a watchdog response has been returned.
    });

    const result = new Promise<ZoteroMcpAdmissionResult<T>>(
      (resolve, reject) => {
        if (timeoutMs >= 0) {
          runningTimeout = setTimeout(() => {
            if (settled) {
              return;
            }
            settled = true;
            activeTool.timedOut = true;
            activeTool.timedOutAt = nowIso();
            try {
              callbacks.onTimeout?.();
            } catch {
              // A watchdog must still resolve its transport response if a
              // cancellation listener throws while receiving the signal.
            }
            resolve({
              kind: "tool_timeout",
              inflightAtAccept,
              limitReason: "tool_timeout",
            });
          }, timeoutMs);
        }
        void runPromise
          .then((value) => {
            if (settled) {
              return;
            }
            settled = true;
            resolve({
              kind: "ok",
              value,
              inflightAtAccept,
              limitReason: "",
            });
          })
          .catch((error) => {
            if (settled) {
              return;
            }
            settled = true;
            reject(error);
          })
          .finally(() => {
            if (runningTimeout) {
              clearTimeout(runningTimeout);
            }
            if (this.generation !== admissionGeneration) {
              return;
            }
            this.inflight = Math.max(0, this.inflight - 1);
            activeToolRuns.delete(activeToolId);
          });
      },
    );
    return result;
  }
}

let state: ServerState = createEmptyState("idle");
let startingPromise: Promise<ZoteroMcpServerDescriptor> | null = null;
const toolCallAdmission = new ZoteroMcpToolAdmission();

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
  const activeRuns = [...activeToolRuns.values()];
  const timedOutRun = activeRuns.find((entry) => entry.timedOut);
  return {
    restartCount,
    lastRestartAt,
    lastFatalError,
    descriptorStale,
    activeTools: activeRuns.map((entry) => entry.toolName),
    runningCount: activeRuns.length,
    runningStartedAt: activeRuns[0]?.startedAt || "",
    runningTimeoutMs: toolCallAdmission.getPolicy().runningTimeoutMs,
    timedOutButStillRunning: Boolean(timedOutRun),
    runningTimedOutAt: timedOutRun?.timedOutAt || "",
    retryGuidance: timedOutRun
      ? "The timed-out Zotero MCP tool may still be running. Please wait before retrying or call diagnostic.get_status again."
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
  const admissionState = toolCallAdmission.snapshot();
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
    `inflight=${admissionState.inflight}/${admissionState.limit}`,
    guardState.activeTools.length
      ? `activeTools=${guardState.activeTools.join(",")}`
      : "",
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
    inflightCount: admissionState.inflight,
    inflightLimit: admissionState.limit,
    activeTools: guardState.activeTools,
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
    admissionPolicy: toolCallAdmission.getPolicy(),
    admissionState: toolCallAdmission.snapshot(),
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

function utf8ByteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

function buildHttpResponse(args: {
  status: number;
  reason: string;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}) {
  return typeof args.body === "string"
    ? prepareTextHttpResponse({
        status: args.status,
        reason: args.reason,
        bodyText: args.body,
        contentType: args.contentType,
        headers: args.headers,
      })
    : prepareJsonHttpResponse({
        status: args.status,
        reason: args.reason,
        body: args.body,
        contentType: args.contentType,
        headers: args.headers,
      });
}

function buildNoContentResponse(args: { status: number; reason: string }) {
  return prepareEmptyHttpResponse(args);
}

function preparedResponseToRawString(response: PreparedMemoryHttpResponse) {
  return `${response.headers}${new TextDecoder().decode(response.bodyBytes)}`;
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

function summarizeJsonRpcResponse(body: unknown, preparedBodyLength?: number) {
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
      bodyLength: Math.max(0, Number(preparedBodyLength || 0) || 0),
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
    bodyLength: Math.max(0, Number(preparedBodyLength || 0) || 0),
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
    userAgentFamily: userAgent.split(/[/\s]/)[0] || "",
    hasMcpSessionId: !!String(request.headers["mcp-session-id"] || "").trim(),
    hasMcpProtocolVersion: !!String(
      request.headers["mcp-protocol-version"] || "",
    ).trim(),
    hasAuthorization: !!String(request.headers.authorization || "").trim(),
  };
}

function responseFacts(response: PreparedMemoryHttpResponse) {
  return {
    responseChars: response.headers.length + response.bodyCharLength,
    responseBytes: response.wireByteLength,
    contentLength: response.bodyByteLength,
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
  phase: "request" | "tool" | "admission" | "response" | "socket";
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
  responseBodyLength?: number;
  responseContentType?: string;
  inflightAtAccept?: number;
  durationMs?: number;
  limitReason?: string;
  toolOutcome?: "" | "success" | "error" | "notification";
  toolErrorName?: string;
  error?: string;
}) {
  const summary = summarizeJsonRpcPayload(args.request.body);
  const responseSummary = summarizeJsonRpcResponse(
    args.responseBody,
    args.responseBodyLength,
  );
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
    admissionPolicy: toolCallAdmission.getPolicy(),
    inflightAtAccept: args.inflightAtAccept || 0,
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

function prepareAndRecordMcpResponse(args: {
  request: HttpRequest;
  status: number;
  reason: string;
  authorized: boolean;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
  error?: string;
  limitReason?: string;
}) {
  const response = buildHttpResponse({
    status: args.status,
    reason: args.reason,
    body: args.body,
    contentType: args.contentType,
    headers: args.headers,
  });
  recordMcpRequest({
    request: args.request,
    status: args.status,
    authorized: args.authorized,
    responseBody: args.body,
    responseBodyLength: response.bodyByteLength,
    responseContentType: response.contentType,
    error: args.error,
    limitReason: args.limitReason,
  });
  return response;
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

function payloadContainsAdmittedToolCall(payload: unknown): boolean {
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
    return toolName !== ZOTERO_MCP_STATUS_TOOL_NAME;
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
    "ZoteroMcpInflightLimitError",
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
        runningTimeoutMs: toolCallAdmission.getPolicy().runningTimeoutMs,
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

function jsonRpcInflightLimitError(
  id: ZoteroMcpJsonRpcId,
  toolName: string,
  inflightAtAccept: number,
) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: -32001,
      message: "Zotero MCP tool inflight admission limit reached",
      data: {
        code: "zotero_mcp_inflight_limit",
        errorName: "ZoteroMcpInflightLimitError",
        toolName,
        inflightAtAccept,
        inflightLimit: toolCallAdmission.getPolicy().inflightLimit,
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

function createMcpRequestControl(externalSignal?: CancellationSignal) {
  const controller = createCancellationController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    if (externalSignal.aborted) {
      controller.abort();
    }
  }
  return {
    control: {
      signal: controller.signal,
    } satisfies WorkflowCallControl,
    abort: controller.abort,
    cleanup() {
      externalSignal?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function runMcpJsonRpcWithMetrics(
  payload: unknown,
  requestId = "",
  externalSignal?: CancellationSignal,
): Promise<{
  response: unknown;
  inflightAtAccept: number;
  durationMs: number;
  limitReason: string;
  toolOutcome: "" | "success" | "error" | "notification";
  toolErrorName: string;
}> {
  const shouldAdmit = payloadContainsAdmittedToolCall(payload);
  const toolName = firstToolName(payload);
  if (payloadContainsToolCall(payload)) {
    appendMcpRuntimeLog({
      requestId,
      stage: "tool.resolved",
      phase: "tool",
      payload,
      details: {
        admitted: shouldAdmit,
      },
    });
  }
  if (shouldAdmit) {
    const circuit = resolveCircuitState(toolName);
    if (circuit?.open) {
      return {
        response: jsonRpcCircuitOpenError(
          firstJsonRpcId(payload),
          toolName,
          circuit,
        ),
        inflightAtAccept: 0,
        durationMs: 0,
        limitReason: "tool_circuit_open",
        toolOutcome: "error",
        toolErrorName: "ZoteroMcpToolCircuitOpenError",
      };
    }
  }

  const requestControl = createMcpRequestControl(externalSignal);
  let watchdogTimedOut = false;
  const run = async () => {
    const startedAt = Date.now();
    try {
      if (shouldAdmit) {
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
        control: requestControl.control,
        resolveZoteroHostCapabilityBroker:
          state.resolveZoteroHostCapabilityBroker,
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
              : JSON.stringify(event.result || {}),
            raw: event.error || event.result,
          });
        },
      } satisfies ZoteroMcpHandlerOptions);
      const toolOutcome = shouldAdmit
        ? responseContainsError(response)
          ? "error"
          : "success"
        : response
          ? ""
          : "notification";
      const toolErrorName = responseToolErrorName(response);
      const canRecordCircuit =
        shouldAdmit &&
        !watchdogTimedOut &&
        !requestControl.control.signal?.aborted;
      if (canRecordCircuit && toolOutcome === "success") {
        recordCircuitSuccess(toolName);
      } else if (canRecordCircuit && toolOutcome === "error") {
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
      if (
        shouldAdmit &&
        !watchdogTimedOut &&
        !requestControl.control.signal?.aborted
      ) {
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
        toolOutcome: shouldAdmit ? ("error" as const) : ("" as const),
        toolErrorName: error instanceof Error ? error.name : "Error",
      };
    } finally {
      requestControl.cleanup();
    }
  };

  if (!shouldAdmit) {
    const result = await run();
    return {
      ...result,
      inflightAtAccept: 0,
      limitReason: "",
    };
  }

  try {
    appendMcpRuntimeLog({
      requestId,
      stage: "admission.accepted",
      phase: "admission",
      payload,
      details: {
        toolName,
      },
    });
    const admissionResult = await toolCallAdmission.admit(
      {
        toolName,
        run,
      },
      {
        onTimeout: () => {
          watchdogTimedOut = true;
          requestControl.abort();
        },
      },
    );
    if (admissionResult.kind !== "ok") {
      if (admissionResult.kind === "inflight_limit") {
        requestControl.cleanup();
        return {
          response: jsonRpcInflightLimitError(
            firstJsonRpcId(payload),
            toolName,
            admissionResult.inflightAtAccept,
          ),
          inflightAtAccept: admissionResult.inflightAtAccept,
          durationMs: 0,
          limitReason: admissionResult.limitReason,
          toolOutcome: "error",
          toolErrorName: "ZoteroMcpInflightLimitError",
        };
      }
      recordCircuitFailure(
        toolName,
        "ZoteroMcpToolTimeoutError",
        `Timed out after ${toolCallAdmission.getPolicy().runningTimeoutMs}ms`,
      );
      return {
        response: jsonRpcToolTimeoutError(firstJsonRpcId(payload), toolName),
        inflightAtAccept: admissionResult.inflightAtAccept,
        durationMs: 0,
        limitReason: admissionResult.limitReason,
        toolOutcome: "error",
        toolErrorName: "ZoteroMcpToolTimeoutError",
      };
    }
    return {
      ...admissionResult.value,
      inflightAtAccept: admissionResult.inflightAtAccept,
      limitReason: "",
    };
  } catch (error) {
    requestControl.cleanup();
    const response = jsonRpcInternalError(firstJsonRpcId(payload), error);
    return {
      response,
      inflightAtAccept: 0,
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
): Promise<PreparedMemoryHttpResponse> {
  if (!isZoteroMcpServerEnabled()) {
    const responseBody = {
      error: "zotero_mcp_disabled",
      message: "Zotero MCP server is disabled by preference",
    };
    return prepareAndRecordMcpResponse({
      request,
      status: 503,
      reason: "Service Unavailable",
      authorized: false,
      body: responseBody,
      error: "zotero_mcp_disabled",
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
    return prepareAndRecordMcpResponse({
      request,
      status: 400,
      reason: "Bad Request",
      authorized,
      body: responseBody,
      error: "bad_request",
    });
  }

  if (request.path === "/health" && request.method === "GET") {
    return prepareAndRecordMcpResponse({
      request,
      status: 200,
      reason: "OK",
      authorized: true,
      body: {
        status: state.status,
        endpoint: state.endpoint,
      },
    });
  }
  if (!isMcpPath(request)) {
    return prepareAndRecordMcpResponse({
      request,
      status: 404,
      reason: "Not Found",
      authorized,
      body: {
        error: "not_found",
      },
      error: "not_found",
    });
  }
  if (!authorized) {
    return prepareAndRecordMcpResponse({
      request,
      status: 401,
      reason: "Unauthorized",
      authorized,
      body: {
        error: "unauthorized",
      },
      error: "unauthorized",
    });
  }
  if (!isOriginAllowed(request)) {
    const responseBody = {
      error: "origin_not_allowed",
    };
    return prepareAndRecordMcpResponse({
      request,
      status: 403,
      reason: "Forbidden",
      authorized,
      body: responseBody,
      error: "origin_not_allowed",
    });
  }
  if (request.method === "GET") {
    const responseBody = {
      error: "streamable_http_get_not_supported",
    };
    return prepareAndRecordMcpResponse({
      request,
      status: 405,
      reason: "Method Not Allowed",
      authorized,
      body: responseBody,
      error: "streamable_http_get_not_supported",
      headers: {
        Allow: "POST",
      },
    });
  }
  if (request.method !== "POST") {
    return prepareAndRecordMcpResponse({
      request,
      status: 405,
      reason: "Method Not Allowed",
      authorized,
      body: {
        error: "method_not_allowed",
      },
      error: "method_not_allowed",
    });
  }
  if ((request.bodyByteLength || 0) > MAX_MCP_REQUEST_BODY_BYTES) {
    const responseBody = {
      error: "request_body_too_large",
      maxBytes: MAX_MCP_REQUEST_BODY_BYTES,
    };
    return prepareAndRecordMcpResponse({
      request,
      status: 413,
      reason: "Payload Too Large",
      authorized,
      body: responseBody,
      error: "request_body_too_large",
      limitReason: "request_body_too_large",
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
    const responseBody = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
      },
    };
    return prepareAndRecordMcpResponse({
      request,
      status: 400,
      reason: "Bad Request",
      authorized,
      body: responseBody,
      error: "parse_error",
    });
  }
  const result = await runMcpJsonRpcWithMetrics(
    payload,
    requestId,
    request.signal,
  );
  const response = result.response;
  if (!response) {
    recordMcpRequest({
      request,
      status: 202,
      authorized,
      responseBody: "",
      responseContentType: "",
      inflightAtAccept: result.inflightAtAccept,
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
      responseBytes: noContentResponse.wireByteLength,
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
      responseBodyLength: rawResponse.bodyByteLength,
      inflightAtAccept: result.inflightAtAccept,
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
      responseBytes: rawResponse.wireByteLength,
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
  return String(bridgeEndpoint || "").replace(/\/bridge\/v2\/?$/, "/mcp");
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

async function startServer() {
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
    resolveZoteroHostCapabilityBroker?: ZoteroMcpHandlerOptions["resolveZoteroHostCapabilityBroker"];
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
  if (args.resolveZoteroHostCapabilityBroker) {
    updateState({
      resolveZoteroHostCapabilityBroker: args.resolveZoteroHostCapabilityBroker,
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
  const listeners = state.listeners;
  state = createEmptyState("stopped");
  state.listeners = listeners;
  toolCallAdmission.reset();
  descriptorInjected = false;
  descriptorInjectedAt = "";
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
  toolCallAdmission.reset();
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
  return preparedResponseToRawString(
    buildRequestFailureResponse(rawRequest, error),
  );
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
      responseBytes: raw.wireByteLength,
    });
    return preparedResponseToRawString(raw);
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
    return preparedResponseToRawString(
      buildHttpResponse({
        status: 200,
        reason: "OK",
        body: jsonRpcInternalError(null, error),
      }),
    );
  }
}

export function configureZoteroMcpServerForTests(
  args: {
    token?: string;
    endpoint?: string;
    resolveZoteroHostCapabilityBroker?: ZoteroMcpHandlerOptions["resolveZoteroHostCapabilityBroker"];
    requestToolPermission?: (
      request: ZoteroMcpToolPermissionRequest,
    ) =>
      | Promise<ZoteroMcpToolPermissionDecision>
      | ZoteroMcpToolPermissionDecision;
    runningTimeoutMs?: number;
    beforeToolCallForTests?: () => Promise<void> | void;
  } = {},
) {
  toolCallAdmission.reset();
  toolCallAdmission.configure({
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
    resolveZoteroHostCapabilityBroker: args.resolveZoteroHostCapabilityBroker,
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
  signal?: CancellationSignal;
}) {
  const requestId = createMcpRequestId();
  const parsedPath = parseTestPath(args.path || "/");
  const body = args.body || "";
  const request: HttpRequest = args.rawRequestBytes
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
  if (args.signal) {
    request.signal = args.signal;
  }
  const response = await handleHttpRequest(request, requestId);
  appendMcpRuntimeLog({
    requestId,
    stage: "response.write.started",
    phase: "response",
    request,
    responseBytes: response.wireByteLength,
  });
  appendMcpRuntimeLog({
    requestId,
    stage: "response.write.finished",
    phase: "response",
    request,
    responseBytes: response.wireByteLength,
  });
  return preparedResponseToRawString(response);
}
