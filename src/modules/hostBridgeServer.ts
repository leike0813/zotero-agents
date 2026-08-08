import {
  getHostBridgeToken,
  getHostBridgeMasterTokenStatus,
  isHostBridgeAuthorizationValid,
  readHostBridgeMasterToken,
  redactHostBridgeToken,
  rotateHostBridgeMasterToken as rotateStoredHostBridgeMasterToken,
  rotateHostBridgeToken as rotateStoredHostBridgeToken,
} from "./hostBridgeAuth";
import {
  executeHostBridgeCapability,
  getHostBridgeCapability,
  HostBridgeCapabilityContractError,
  HostBridgeWorkflowProductError,
  listHostBridgeCapabilities,
} from "./hostBridgeCapabilityRegistry";
import { validateHostBridgeCapabilityInput } from "./hostBridgeCapabilityContract";
import type { SynthesisMcpService } from "./synthesis/mcpService";
import {
  describeHostBridgeWorkflow,
  requirementsForHostBridgeWorkflow,
  validateHostBridgeWorkflow,
  buildHostBridgeWorkflowAgentRun,
  ackHostBridgeNotifications,
  cancelHostBridgeWorkflowRun,
  connectHostBridgeSkillRun,
  getHostBridgeWorkflowControlManifest,
  getHostBridgeSkillRun,
  getHostBridgeWorkflowRunStatus,
  applyHostBridgeWorkflowAgentRun,
  abandonHostBridgeWorkflowAgentRun,
  getHostBridgeWorkflowAgentRunApplyReceipt,
  describeHostBridgeProviderProfile,
  listHostBridgeProviderProfiles,
  validateHostBridgeProviderProfile,
  getHostBridgeWorkflowDefaults,
  refreshHostBridgeProviderProfile,
  listHostBridgeActiveTasks,
  listHostBridgeNotifications,
  listHostBridgeRecentSkillRuns,
  listHostBridgeRecentTasks,
  listHostBridgeSkillRunEvents,
  listHostBridgeTasks,
  listHostBridgeWorkflowRuns,
  listHostBridgeWorkflowQueue,
  getHostBridgeWorkflowSubmission,
  cancelHostBridgeWorkflowQueueUnit,
  listHostBridgeWorkflows,
  replyHostBridgeSkillRun,
  renewHostBridgeWorkflowAgentRun,
  submitHostBridgeWorkflow,
  type HostBridgeTaskFilters,
  type HostBridgeWorkflowAgentApplyRequest,
  type HostBridgeWorkflowAgentRunRequest,
  type HostBridgeWorkflowDescribeRequest,
  type HostBridgeWorkflowValidateRequest,
  type HostBridgeProviderProfileDescribeRequest,
  type HostBridgeProviderProfileValidateRequest,
  type HostBridgeWorkflowSubmitRequest,
} from "./hostBridgeWorkflowControl";
import {
  getHostBridgeFileDownloadManifest,
  HostBridgeFileRegistryError,
  registerHostBridgeUploadedFile,
  resolveHostBridgeFileDownload,
} from "./hostBridgeFileRegistry";
import {
  beginRuntimeFileResponseTransfer,
  collectRuntimeFileSourceBytesForTests,
  type RuntimeFileResponseTransfer,
  type RuntimeFileTransferSource,
} from "./runtimeFileTransfer";
import {
  beginRuntimeMemoryResponseTransfer,
  prepareJsonHttpResponse,
  prepareTextHttpResponse,
  type PreparedMemoryHttpResponse,
  type RuntimeMemoryResponseTransfer,
} from "./runtimeHttpResponse";
import { createSha256Accumulator } from "../utils/sha256";
import {
  completeHostBridgeOperation,
  getHostBridgeOperation,
  markHostBridgeOperationOutcomeUnknown,
  recoverHostBridgeOperationStoreAfterRestart,
  reserveHostBridgeOperation,
  resetHostBridgeOperationStoreForTests,
  type HostBridgeOperationResponse,
} from "./hostBridgeOperationStore";
import { recoverHostBridgeAgentRunStoreAfterRestart } from "./hostBridgeWorkflowAgentRunStore";
import {
  HostBridgePermissionError,
  getHostBridgePermissionProjection,
  listHostBridgePendingPermissions,
  parseHostBridgePermissionScope,
  requestHostBridgePermission,
  requestHostBridgePermissionForRequirement,
} from "./hostBridgePermissionManager";
import type { HostBridgeNotificationFilters } from "./hostBridgeNotificationInbox";
import {
  isHostBridgeWriteAutoApprovalScope,
  resetHostBridgeWriteAutoApprovalScopesForTests,
} from "./hostBridgeWriteAutoApprovalRegistry";
import { isDebugModeEnabled } from "./debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  observeAcpRuntimeGauge,
  readAcpRuntimePerformanceClockMs,
} from "./acpRuntimePerformanceProfiler";
import {
  createZoteroHostCapabilityBrokerApis,
  ZoteroCollectionNotFoundError,
  ZoteroInvalidObjectRefError,
  ZoteroItemNotFoundError,
  ZoteroNavigationUnavailableError,
  ZoteroNoteNotFoundError,
} from "./zoteroHostCapabilityBroker";
import { ZoteroLibraryCursorError } from "./zoteroLibraryPageQuery";
import {
  HostBridgeCursorError,
  paginateHostBridgeRows,
} from "./hostBridgePagination";
import { resetHostBridgeAgentRunStoreForTests } from "./hostBridgeWorkflowAgentRunStore";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";
import {
  HOST_BRIDGE_CLI_SCHEMA,
  HOST_BRIDGE_PROTOCOL_VERSION,
  hostBridgeError,
  hostBridgeOk,
  type HostBridgeCallRequest,
  type HostBridgeBindMode,
  type HostBridgeHealth,
  type HostBridgeErrorCode,
  type HostBridgeManifest,
  type HostBridgeResponse,
  type HostBridgeServiceStatus,
  type HostBridgeStatusSnapshot,
  type HostBridgePortMode,
  type HostBridgeConnectionMode,
  type HostBridgeAdvertisedHostSource,
} from "./hostBridgeProtocol";
import { writeHostBridgeWellKnownProfile } from "./hostBridgeProfileStore";
import { loadBackendsRegistry } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import {
  invalidateDefaultSynthesisService,
  SynthesisMaintenanceError,
} from "./synthesis/service";
import { getPref, setPref } from "../utils/prefs";
import {
  beginHostHttpRequestRead,
  HostHttpRequestReadError,
  type HostHttpRequestReadResult,
  type HostHttpRequestReadStats,
} from "./hostHttpRequestReader";

export { redactHostBridgeToken };

const LOOPBACK_HOST = "127.0.0.1";
const LAN_HOST = "0.0.0.0";
const PORT_MIN = 26570;
const PORT_SPAN = 200;
const PINNED_PORT_DEFAULT = PORT_MIN;
const PINNED_PORT_MIN = 1024;
const PINNED_PORT_MAX = 65535;
const RECOVERY_DELAY_MS = 1000;
const SUPERVISOR_INTERVAL_MS = 30000;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 16 * 1024 * 1024;
const WORKFLOW_PERMISSION_TIMEOUT_MS = 5 * 60 * 1000;

type HostBridgeServerState = {
  status: HostBridgeServiceStatus;
  host: string;
  port: number;
  endpoint: string;
  token: string;
  serverSocket: any;
  bindMode: HostBridgeBindMode;
  lanEnabled: boolean;
  portMode: HostBridgePortMode;
  pinPortEnabled: boolean;
  pinnedPort: number;
  supervised: boolean;
  restartCount: number;
  lastRecoveryReason: string;
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  updatedAt: string;
};

type HostBridgeStartConfig = {
  lanEnabled: boolean;
  pinPortEnabled: boolean;
  pinnedPort: number;
  bindMode: HostBridgeBindMode;
  host: string;
  initialPortMode: HostBridgePortMode;
};

type HttpRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  bodyBytes: Uint8Array;
  bodyByteLength: number;
  parseError?: string;
};

type HostBridgeTransportContext = {
  peerHost: string;
  peerPort: number;
  peerLocality: "local" | "remote" | "unknown";
};

const trustedTransportContexts = new WeakMap<
  HttpRequest,
  HostBridgeTransportContext
>();

type HttpResponseArgs = {
  status: number;
  reason: string;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
};

type RawHttpResponse =
  | PreparedMemoryHttpResponse
  | {
      kind: "file";
      headers: string;
      source: RuntimeFileTransferSource;
    };

type AcceptedHostConnection = {
  generation: number;
  transport: any;
  transportContext: HostBridgeTransportContext;
  outputStream: any;
  requestRead: ProfiledHostBridgeRequestReadOperation;
  responseTransfer?:
    | RuntimeFileResponseTransfer
    | RuntimeMemoryResponseTransfer;
  outputClosed: boolean;
  transportClosed: boolean;
};

type ProfiledHostBridgeRequestReadOperation = {
  completion: Promise<HttpRequest>;
  abort: () => void;
};

let supervisorEnabled = false;
let controlledShutdown = false;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
let supervisorTimer: ReturnType<typeof setInterval> | null = null;
let serverSocketFactory: (port: number, bindMode: HostBridgeBindMode) => any =
  createServerSocket;
let state: HostBridgeServerState = createEmptyState("idle");
let startingPromise: Promise<HostBridgeStatusSnapshot> | null = null;
let synthesisServiceResolverForTests: (() => SynthesisMcpService) | undefined =
  undefined;
let serverGeneration = 0;
const acceptedConnections = new Set<AcceptedHostConnection>();
const CONNECTION_INITIALIZATION_ERROR_PREFIX =
  "Host Access connection initialization failed: ";

function nowIso() {
  return new Date().toISOString();
}

function getLanEnabled() {
  return getPref("hostBridgeLanEnabled") === true;
}

function getPinPortEnabled() {
  return getPref("hostBridgePinPortEnabled") === true;
}

function getEffectivePinPortEnabled(lanEnabled = getLanEnabled()) {
  return lanEnabled || getPinPortEnabled();
}

function normalizePinnedPort(value: unknown) {
  const port = Number(value);
  if (
    Number.isInteger(port) &&
    port >= PINNED_PORT_MIN &&
    port <= PINNED_PORT_MAX
  ) {
    return port;
  }
  return PINNED_PORT_DEFAULT;
}

function getPinnedPort() {
  return normalizePinnedPort(getPref("hostBridgePinnedPort"));
}

function bindModeFromLanEnabled(
  lanEnabled = getLanEnabled(),
): HostBridgeBindMode {
  return lanEnabled ? "lan" : "loopback";
}

function hostFromBindMode(bindMode: HostBridgeBindMode) {
  return bindMode === "lan" ? LAN_HOST : LOOPBACK_HOST;
}

function createEmptyState(
  status: HostBridgeServiceStatus,
): HostBridgeServerState {
  const lanEnabled = getLanEnabled();
  const pinPortEnabled = getEffectivePinPortEnabled(lanEnabled);
  const pinnedPort = getPinnedPort();
  const bindMode = bindModeFromLanEnabled(lanEnabled);
  return {
    status,
    host: hostFromBindMode(bindMode),
    port: 0,
    endpoint: "",
    token: "",
    serverSocket: null,
    bindMode,
    lanEnabled,
    portMode: pinPortEnabled ? "pinned" : "random",
    pinPortEnabled,
    pinnedPort,
    supervised: supervisorEnabled,
    restartCount: 0,
    lastRecoveryReason: "",
    lastRequestMethod: "",
    lastResponseStatus: 0,
    lastError: "",
    requestCount: 0,
    updatedAt: nowIso(),
  };
}

function resolveHostBridgeStartConfig(): HostBridgeStartConfig {
  const lanEnabled = getLanEnabled();
  if (lanEnabled && !getPinPortEnabled()) {
    setPref("hostBridgePinPortEnabled", true);
  }
  const pinPortEnabled = getEffectivePinPortEnabled(lanEnabled);
  const pinnedPort = getPinnedPort();
  const bindMode = bindModeFromLanEnabled(lanEnabled);
  return {
    lanEnabled,
    pinPortEnabled,
    pinnedPort,
    bindMode,
    host: hostFromBindMode(bindMode),
    initialPortMode: pinPortEnabled ? "pinned" : "random",
  };
}

function updateState(partial: Partial<HostBridgeServerState>) {
  state = {
    ...state,
    ...partial,
    supervised: supervisorEnabled,
    updatedAt: nowIso(),
  };
}

function clearConnectionInitializationError() {
  if (state.lastError.startsWith(CONNECTION_INITIALIZATION_ERROR_PREFIX)) {
    updateState({ lastError: "" });
  }
}

function buildEndpoint(host: string, port: number) {
  return `http://${host}:${port}/bridge/v2`;
}

function normalizeAdvertisedHost(value: unknown) {
  const host = String(value || "").trim();
  return host || "<zotero-host-ip>";
}

function getAdvertisedHost() {
  return normalizeAdvertisedHost(getPref("hostBridgeAdvertisedHost"));
}

function getAdvertisedHostSource(): HostBridgeAdvertisedHostSource {
  const manual = String(getPref("hostBridgeAdvertisedHost") || "").trim();
  return manual ? "manual" : "placeholder";
}

function buildRemoteEndpoint(port: number) {
  if (!port) {
    return "";
  }
  return buildEndpoint(getAdvertisedHost(), port);
}

function buildLocalProfileEndpoint(bindMode: HostBridgeBindMode, port: number) {
  return buildEndpoint(
    bindMode === "lan" ? LOOPBACK_HOST : hostFromBindMode(bindMode),
    port,
  );
}

function buildLocalClientEndpoint(bindMode: HostBridgeBindMode, port: number) {
  if (!port) {
    return "";
  }
  return buildLocalProfileEndpoint(bindMode, port);
}

function hostAccessRoutes(bindMode = state.bindMode, port = state.port) {
  const hostBridge = buildLocalClientEndpoint(bindMode, port) || state.endpoint;
  const mcpBridgeEndpoint =
    bindMode === "lan" ? buildRemoteEndpoint(port) || hostBridge : hostBridge;
  const mcp = String(mcpBridgeEndpoint || "").replace(
    /\/bridge\/v2\/?$/,
    "/mcp",
  );
  return {
    routes: {
      hostBridge,
      mcp,
    },
    mcp: {
      enabled: getPref("mcpServer.enabled") !== false,
      endpoint: mcp,
    },
  };
}

function getComponents() {
  return (
    (globalThis as any).Components ||
    (globalThis as any).ChromeUtils?.importESModule?.(
      "resource://gre/modules/Services.sys.mjs",
    )?.Components
  );
}

function createServerSocket(port: number, bindMode: HostBridgeBindMode) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const factory = classes?.["@mozilla.org/network/server-socket;1"];
  const nsIServerSocket = interfaces?.nsIServerSocket;
  if (!factory || !nsIServerSocket) {
    throw new Error("Zotero nsIServerSocket is unavailable");
  }
  const socket = factory.createInstance(nsIServerSocket);
  socket.init(port, bindMode === "loopback", -1);
  return socket;
}

function createConfiguredServerSocket(
  port: number,
  bindMode: HostBridgeBindMode,
) {
  return serverSocketFactory(port, bindMode);
}

function pickStartPort() {
  return PORT_MIN + Math.floor(Math.random() * PORT_SPAN);
}

function clearRecoveryTimer() {
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
}

function clearSupervisorTimer() {
  if (supervisorTimer) {
    clearInterval(supervisorTimer);
    supervisorTimer = null;
  }
}

function shouldRecover() {
  return (
    supervisorEnabled &&
    !controlledShutdown &&
    state.status !== "running" &&
    state.status !== "starting"
  );
}

function scheduleHostBridgeRecovery(reason: string) {
  if (!supervisorEnabled || controlledShutdown || recoveryTimer) {
    return;
  }
  updateState({
    lastRecoveryReason: reason,
  });
  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;
    if (!shouldRecover()) {
      return;
    }
    updateState({
      restartCount: state.restartCount + 1,
      lastRecoveryReason: reason,
    });
    void ensureHostBridgeServer().catch((error) => {
      updateState({
        status: "error",
        lastError: errorMessage(error),
      });
    });
  }, RECOVERY_DELAY_MS);
}

function ensureSupervisorTimer() {
  if (supervisorTimer || !supervisorEnabled) {
    return;
  }
  registerBackgroundRefreshTimer({
    owner: "host-bridge-supervisor",
    activationCondition: "Host Bridge supervisor enabled",
    scopeKey: "host bridge service status",
    allowedDataSources: ["host bridge process state"],
    maxReadShape: "service state flags only",
    requiresForegroundSurface: false,
    minimumIntervalMs: SUPERVISOR_INTERVAL_MS,
    intervalMs: SUPERVISOR_INTERVAL_MS,
  });
  supervisorTimer = setInterval(() => {
    if (shouldRecover()) {
      scheduleHostBridgeRecovery(
        "Host Bridge supervisor detected the service is not running.",
      );
    }
  }, SUPERVISOR_INTERVAL_MS);
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
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

function parseHttpHeaders(head: string) {
  const lines = head.split("\r\n");
  const [method = "", rawPath = ""] = String(lines[0] || "").split(/\s+/);
  const parsedPath = parseTestPath(rawPath);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return { method, parsedPath, headers };
}

function parseHttpRequestBytes(raw: Uint8Array): HttpRequest {
  const splitIndex = findHeaderSeparator(raw);
  const headBytes = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const bodyBytes =
    splitIndex >= 0 ? raw.slice(splitIndex + 4) : new Uint8Array();
  const head = bytesToLatin1String(headBytes);
  const { method, parsedPath, headers } = parseHttpHeaders(head);
  const contentLength = Math.max(
    0,
    Number(headers["content-length"] || bodyBytes.length),
  );
  const boundedBodyBytes =
    contentLength > 0 ? bodyBytes.slice(0, contentLength) : new Uint8Array();
  const body = decodeUtf8Body(boundedBodyBytes);
  const bodyParseError =
    body === null && parsedPath.path !== "/bridge/v2/files/upload"
      ? "invalid_utf8_body"
      : "";
  return {
    method: method.toUpperCase(),
    path: parsedPath.path,
    query: parsedPath.query,
    headers,
    body: body || "",
    bodyBytes: boundedBodyBytes,
    bodyByteLength: boundedBodyBytes.byteLength,
    parseError: parsedPath.parseError || bodyParseError,
  };
}

function utf8ByteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

function bodyByteLength(text: string) {
  return utf8ByteLength(text || "");
}

function parseJsonBody(body: string): unknown {
  const trimmed = String(body || "").trim();
  if (!trimmed) {
    return {};
  }
  return JSON.parse(trimmed);
}

async function hostBridgeOperationRequestDigest(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  const query = Object.fromEntries(
    Object.entries(request.query).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const prefix = new TextEncoder().encode(
    JSON.stringify({
      method: request.method,
      path: request.path,
      query,
      connectionMode: parseConnectionModeHeader(request, transportContext),
      contentType: String(request.headers["content-type"] || "").trim(),
      displayName: String(
        request.headers["x-zotero-bridge-display-name"] || "",
      ).trim(),
    }),
  );
  const accumulator = await createSha256Accumulator();
  if (!accumulator) return undefined;
  accumulator.update(prefix);
  accumulator.update(Uint8Array.of(0));
  accumulator.update(request.bodyBytes);
  return `sha256:${accumulator.digestHex()}`;
}

function operationIdFromRequest(request: HttpRequest) {
  return String(request.headers["x-zotero-bridge-operation-id"] || "").trim();
}

function isOperationReceiptPath(path: string) {
  return path.startsWith("/bridge/v2/operations/");
}

function isStateChangingHostBridgeRequest(request: HttpRequest) {
  if (request.method === "GET" || isOperationReceiptPath(request.path)) {
    return false;
  }
  if (request.path === "/bridge/v2/call") {
    try {
      const payload = parseJsonBody(request.body) as HostBridgeCallRequest;
      return (
        getHostBridgeCapability(String(payload.capability || "").trim())
          ?.requestEffect === "state-change"
      );
    } catch {
      return false;
    }
  }
  const exact = new Set([
    "/bridge/v2/context/selection/open",
    "/bridge/v2/context/items/open",
    "/bridge/v2/context/collections/open",
    "/bridge/v2/context/notes/open",
    "/bridge/v2/workflows/submit",
    "/bridge/v2/workflows/agent-run",
    "/bridge/v2/notifications/ack",
    "/bridge/v2/synthesis/cache/invalidate",
    "/bridge/v2/files/upload",
  ]);
  if (exact.has(request.path)) return true;
  return (
    /^\/bridge\/v1\/workflows\/agent-runs\/[^/]+\/(apply|renew|abandon)$/.test(
      request.path,
    ) ||
    /^\/bridge\/v1\/workflows\/runs\/[^/]+\/cancel$/.test(request.path) ||
    /^\/bridge\/v1\/workflows\/queue\/[^/]+\/cancel$/.test(request.path) ||
    /^\/bridge\/v1\/skill-runs\/[^/]+\/(reply|connect)$/.test(request.path)
  );
}

function operationResponseFromRaw(
  raw: RawHttpResponse,
): HostBridgeOperationResponse | null {
  if (raw.kind !== "memory") return null;
  const statusLine = String(raw.headers.split("\r\n", 1)[0] || "");
  const match = /^HTTP\/1\.1\s+(\d+)\s+(.*)$/.exec(statusLine);
  if (!match) return null;
  const text = new TextDecoder().decode(raw.bodyBytes);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return {
    status: Number(match[1]),
    reason: match[2] || "OK",
    body,
  };
}

function operationReplayResponse(
  record: NonNullable<ReturnType<typeof getHostBridgeOperation>>,
) {
  if (record.state === "completed" && record.response) {
    return buildHttpResponse(record.response);
  }
  return buildHttpResponse({
    status: 202,
    reason: "Accepted",
    body: hostBridgeOk(record),
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function workflowValidationErrorCode(
  error: unknown,
  fallback: HostBridgeErrorCode,
): HostBridgeErrorCode {
  const code = (error as { code?: string })?.code;
  return code === "invalid_workflow_describe_request" ||
    code === "invalid_workflow_validate_request" ||
    code === "invalid_workflow_agent_run_request" ||
    code === "invalid_workflow_submit_request" ||
    code === "invalid_provider_profile_request" ||
    code === "invalid_provider_profile" ||
    code === "provider_profile_backend_not_found" ||
    code === "provider_profile_backend_unready" ||
    code === "provider_profile_provider_unavailable" ||
    code === "provider_profile_option_unknown" ||
    code === "provider_profile_option_invalid" ||
    code === "provider_profile_option_unavailable" ||
    code === "workflow_provider_incompatible" ||
    code === "workflow_resource_missing" ||
    code === "workflow_resource_ineligible" ||
    code === "workflow_resource_mismatch" ||
    code === "workflow_resource_output_invalid" ||
    code === "invalid_workflow_resource_bindings" ||
    code === "workflow_interaction_required" ||
    code === "workflow_conflict_requires_policy" ||
    code === "missing_required_workflow_parameter"
    ? code
    : fallback;
}

function workflowValidationErrorDetails(error: unknown) {
  const requiredFields = (error as { requiredFields?: unknown })
    ?.requiredFields;
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details ||
    {};
  const normalized = {
    ...details,
    ...(Array.isArray(requiredFields)
      ? {
          requiredFields: requiredFields
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        }
      : {}),
  };
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function parsePermissionScopeHeader(request: HttpRequest) {
  const raw = String(request.headers["x-zotero-bridge-scope"] || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const scope = parseHostBridgePermissionScope(JSON.parse(raw));
    const transportContext = trustedTransportContexts.get(request);
    return scope && transportContext
      ? {
          ...scope,
          connectionMode: parseConnectionModeHeader(request, transportContext),
        }
      : scope;
  } catch {
    return null;
  }
}

function performanceProfileRequestIdForHostRequest(request: HttpRequest) {
  const scope = parsePermissionScopeHeader(request);
  const kind = String(scope?.kind || "").trim();
  if (kind !== "acp-skill-run" && kind !== "acp-run") {
    return null;
  }
  return String(scope?.requestId || scope?.runId || "").trim() || null;
}

function hostOperationClass(
  request: HttpRequest,
): "file" | "library" | "mutation" | "workflow" | "diagnostic" | "other" {
  const path = request.path;
  if (path.includes("/files/")) return "file";
  if (path.includes("/library/")) return "library";
  if (path.includes("mutation")) return "mutation";
  if (path.includes("workflow")) return "workflow";
  if (path.includes("diagnostic") || path.endsWith("/health")) {
    return "diagnostic";
  }
  return "other";
}

function parseConnectionModeHeader(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
): HostBridgeConnectionMode {
  const value = String(request.headers["x-zotero-bridge-connection-mode"] || "")
    .trim()
    .toLowerCase();
  return transportContext.peerLocality === "local" && value !== "remote"
    ? "local"
    : "remote";
}

function isLoopbackPeerHost(hostRaw: unknown) {
  const host = String(hostRaw || "")
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (host === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host)?.[1];
  const ipv4 = mapped || host;
  const first = Number(ipv4.split(".")[0]);
  return /^\d+\.\d+\.\d+\.\d+$/.test(ipv4) && first === 127;
}

function transportContextFromAcceptedTransport(
  transport: any,
): HostBridgeTransportContext {
  let peerHost = "";
  let peerPort = 0;
  try {
    peerHost = String(transport?.host || "").trim();
    peerPort = Number(transport?.port || 0);
  } catch {
    return { peerHost: "", peerPort: 0, peerLocality: "unknown" };
  }
  return {
    peerHost,
    peerPort: Number.isInteger(peerPort) && peerPort > 0 ? peerPort : 0,
    peerLocality: peerHost
      ? isLoopbackPeerHost(peerHost)
        ? "local"
        : "remote"
      : "unknown",
  };
}

function permissionErrorResponse(error: HostBridgePermissionError) {
  const status =
    error.code === "permission_timeout"
      ? 408
      : error.code === "permission_ui_unavailable"
        ? 503
        : 403;
  const reason =
    status === 408
      ? "Request Timeout"
      : status === 503
        ? "Service Unavailable"
        : "Forbidden";
  return response(
    status,
    reason,
    hostBridgeError(error.code, error.message, "permission", {
      decision: error.decision,
    }),
    error.code,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanPromptText(value: unknown) {
  return String(value || "").trim();
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function countMutationTargets(input: Record<string, unknown>) {
  for (const key of ["targets", "items"]) {
    const value = input[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }
  for (const key of ["target", "item", "parent", "note"]) {
    if (typeof input[key] !== "undefined" && input[key] !== null) {
      return 1;
    }
  }
  return 0;
}

function previewStringList(values: unknown, label: string) {
  if (!Array.isArray(values)) {
    return "";
  }
  const entries = values.map((entry) => cleanPromptText(entry)).filter(Boolean);
  if (!entries.length) {
    return "";
  }
  const preview = entries.slice(0, 4).join(", ");
  const rest = entries.length > 4 ? `, and ${entries.length - 4} more` : "";
  return `${label}: ${preview}${rest}.`;
}

function previewObjectKeys(value: unknown, label: string) {
  if (!isRecord(value)) {
    return "";
  }
  const keys = Object.keys(value).filter(Boolean);
  if (!keys.length) {
    return "";
  }
  const preview = keys.slice(0, 4).join(", ");
  const rest = keys.length > 4 ? `, and ${keys.length - 4} more` : "";
  return `${label}: ${preview}${rest}.`;
}

function targetSummary(targetCount: number) {
  return targetCount > 0
    ? plural(targetCount, "Zotero item")
    : "the requested Zotero target";
}

function buildMutationApprovalPrompt(input: unknown) {
  const request = isRecord(input) ? input : {};
  const rawOperation = cleanPromptText(request.operation);
  const operation = rawOperation || "unknown mutation";
  const targets = countMutationTargets(request);
  const targetsText = targetSummary(targets);
  const sourceLine = "Source: zotero-bridge CLI.";

  if (operation === "item.addTags" || operation === "item.removeTags") {
    const tags = Array.isArray(request.tags) ? request.tags.length : 0;
    const verb = operation === "item.addTags" ? "Add" : "Remove";
    const direction = operation === "item.addTags" ? "to" : "from";
    return {
      title: "Approve Zotero tag change?",
      summary: `${verb} ${plural(tags, "tag")} ${direction} ${targetsText}.`,
      detail: [
        `Action: ${verb.toLowerCase()} Zotero tags.`,
        `Targets: ${targetsText}.`,
        previewStringList(request.tags, "Tags"),
        sourceLine,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (operation === "item.updateFields") {
    const fields = isRecord(request.fields) ? Object.keys(request.fields) : [];
    return {
      title: "Approve Zotero item update?",
      summary: `Update ${plural(fields.length, "field")} on ${targetsText}.`,
      detail: [
        "Action: update Zotero item fields.",
        `Targets: ${targetsText}.`,
        previewObjectKeys(request.fields, "Fields"),
        sourceLine,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (operation === "item.attachFile") {
    const fileId = cleanPromptText(request.fileId) || "uploaded file";
    return {
      title: "Approve Zotero file attachment?",
      summary: `Attach ${fileId} to ${targetsText}.`,
      detail: [
        "Action: attach uploaded Host Bridge file to Zotero item.",
        `Targets: ${targetsText}.`,
        `File handle: ${fileId}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (operation === "note.createChild") {
    return {
      title: "Approve Zotero note creation?",
      summary: `Create a child note under ${targetsText}.`,
      detail: [
        "Action: create Zotero child note.",
        `Parent: ${targetsText}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (operation === "note.update") {
    return {
      title: "Approve Zotero note update?",
      summary: `Update ${targetsText}.`,
      detail: [
        "Action: update Zotero note content.",
        `Targets: ${targetsText}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (operation === "note.upsertPayload") {
    const payloadType = cleanPromptText(request.payloadType) || "note payload";
    return {
      title: "Approve Zotero note payload update?",
      summary: `Upsert embedded payload "${payloadType}" on ${targetsText}.`,
      detail: [
        "Action: upsert Zotero note embedded workflow payload.",
        `Payload: ${payloadType}.`,
        `Targets: ${targetsText}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (
    operation === "collection.addItems" ||
    operation === "collection.removeItems"
  ) {
    const verb = operation === "collection.addItems" ? "Add" : "Remove";
    const direction = operation === "collection.addItems" ? "to" : "from";
    return {
      title: "Approve Zotero collection change?",
      summary: `${verb} ${targetsText} ${direction} a Zotero collection.`,
      detail: [
        `Action: ${verb.toLowerCase()} Zotero collection membership.`,
        `Targets: ${targetsText}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (operation === "collection.create") {
    const name =
      cleanPromptText(request.name) ||
      cleanPromptText(request.collectionName) ||
      "new collection";
    return {
      title: "Approve Zotero collection creation?",
      summary: `Create Zotero collection "${name}".`,
      detail: [
        "Action: create Zotero collection.",
        `Collection: ${name}.`,
        sourceLine,
      ].join("\n"),
    };
  }

  if (operation === "literature.ingest") {
    if ("papers" in request) {
      throw new Error(
        "literature ingest accepts a single paper payload; papers is not supported",
      );
    }
    const paper = isRecord(request.paper) ? request.paper : {};
    const fields = isRecord(paper.fields) ? paper.fields : {};
    const identifiersObject = isRecord(paper.identifiers)
      ? paper.identifiers
      : {};
    const title = cleanPromptText(fields.title) || "one literature paper";
    const identifiers = [
      cleanPromptText(identifiersObject.doi || fields.DOI)
        ? `DOI: ${cleanPromptText(identifiersObject.doi || fields.DOI)}`
        : "",
      cleanPromptText(identifiersObject.arxiv)
        ? `arXiv: ${cleanPromptText(identifiersObject.arxiv)}`
        : "",
      cleanPromptText(identifiersObject.pmid)
        ? `PMID: ${cleanPromptText(identifiersObject.pmid)}`
        : "",
      cleanPromptText(identifiersObject.isbn || fields.ISBN)
        ? `ISBN: ${cleanPromptText(identifiersObject.isbn || fields.ISBN)}`
        : "",
    ].filter(Boolean);
    const pdfLine = cleanPromptText(paper.pdfUrl)
      ? "PDF: best-effort attachment requested."
      : "PDF: no public PDF URL provided.";
    const landingLinkLine =
      paper.attachLandingUrlOnMissingPdf === true
        ? "Landing link: missing-PDF landing link attachment requested."
        : "";
    return {
      title: "Approve Zotero literature ingest?",
      summary: "Ingest one literature paper into Zotero.",
      detail: [
        "Action: create or update one Zotero literature record.",
        `Paper: ${title}.`,
        cleanPromptText(paper.itemType)
          ? `Item type: ${cleanPromptText(paper.itemType)}.`
          : "",
        identifiers.length ? `Identifier: ${identifiers.join("; ")}.` : "",
        pdfLine,
        landingLinkLine,
        sourceLine,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    title: "Approve Zotero write action?",
    summary: `Run Zotero mutation "${operation}" from zotero-bridge.`,
    detail: [
      `Action: ${operation}.`,
      `Targets: ${targetsText}.`,
      sourceLine,
    ].join("\n"),
  };
}

function compactApprovalText(value: unknown, limit: number) {
  const text = String(value || "").trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit))}...[truncated]`;
}

function buildDebugZoteroEvalApprovalPrompt(input: unknown) {
  const object = isRecord(input) ? input : {};
  const codePreview = compactApprovalText(object.code, 500);
  return {
    title: "Approve Zotero debug eval?",
    summary:
      "Run an approved debug script with access to arbitrary Zotero APIs.",
    detail: [
      "Capability: debug.zotero.eval.",
      "Risk: this code can read or modify Zotero state depending on what it does.",
      "Source: zotero-bridge CLI.",
      codePreview ? `Code preview:\n${codePreview}` : "Code preview: (empty)",
    ].join("\n"),
  };
}

function buildCapabilityApprovalPrompt(
  capability: NonNullable<ReturnType<typeof getHostBridgeCapability>>,
  input: unknown,
) {
  if (capability.name === "mutation.execute") {
    return buildMutationApprovalPrompt(input);
  }
  if (capability.name === "debug.zotero.eval") {
    return buildDebugZoteroEvalApprovalPrompt(input);
  }
  if (capability.name === "workflow_products.remove") {
    const productId = String(
      (input as Record<string, unknown>)?.productId || "",
    ).trim();
    return {
      title: "Remove Dashboard Product record?",
      summary: productId
        ? `Remove Dashboard Product record "${productId}".`
        : "Remove a Dashboard Product record.",
      detail:
        "Managed asset files are retained for persistence cleanup and are not deleted immediately.",
    };
  }
  if (
    capability.name === "reference_sidecar.refresh" ||
    capability.name === "citation_graph.update"
  ) {
    const object = isRecord(input) ? input : {};
    const paperRefs = Array.isArray(object.paper_refs || object.paperRefs)
      ? ((object.paper_refs || object.paperRefs) as unknown[])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const scope = String(
      object.scope || (paperRefs.length ? "papers" : "library"),
    ).trim();
    const sidecar = capability.name === "reference_sidecar.refresh";
    return {
      title: sidecar
        ? "Refresh the references sidecar?"
        : "Update the citation graph?",
      summary: sidecar
        ? `Refresh reference facts for ${scope === "papers" ? `${paperRefs.length} paper(s)` : "the current library"}.`
        : `Update the citation graph for ${scope === "papers" ? `${paperRefs.length} paper closure(s)` : "the current library"}.`,
      detail: [
        `Capability: ${capability.name}.`,
        `Scope: ${scope}.`,
        paperRefs.length
          ? `Paper refs: ${paperRefs.slice(0, 10).join(", ")}${paperRefs.length > 10 ? ` and ${paperRefs.length - 10} more` : ""}.`
          : "Paper refs: full library scope.",
        sidecar
          ? "This approval does not update the citation graph."
          : "This approval does not refresh reference-sidecar facts.",
      ].join("\n"),
    };
  }
  return {
    title: "Approve Host Bridge action?",
    summary: `Run "${capability.name}" from zotero-bridge.`,
    detail: [
      `Capability: ${capability.name}.`,
      capability.summary ? `Purpose: ${capability.summary}` : "",
      "Source: zotero-bridge CLI.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function writeOutputStream(
  outputStream: any,
  response: RawHttpResponse,
  onTransfer?: (transfer: RuntimeFileResponseTransfer) => void,
) {
  if (response.kind === "file") {
    const transfer = beginRuntimeFileResponseTransfer({
      headers: response.headers,
      source: response.source,
      outputStream,
    });
    onTransfer?.(transfer);
    await transfer.completion;
    return;
  }
  const transfer = beginRuntimeMemoryResponseTransfer({
    response,
    outputStream,
  });
  onTransfer?.(transfer);
  await transfer.completion;
}

function buildHttpResponse(args: HttpResponseArgs) {
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

function bytesToBinaryString(bytes: Uint8Array) {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.slice(offset, offset + chunkSize)),
    );
  }
  return chunks.join("");
}

function headerSafeFilename(filename: string) {
  return String(filename || "download.bin")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return char === '"' || code <= 0x1f || code === 0x7f ? "_" : char;
    })
    .join("");
}

function asciiContentDispositionFilename(filename: string) {
  const safe = headerSafeFilename(filename);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").trim();
  const extension = safe.match(/(\.[A-Za-z0-9]{1,16})$/)?.[1] || ".bin";
  const stem = ascii.replace(/(\.[A-Za-z0-9]{1,16})$/, "");
  if (/[A-Za-z0-9]/.test(stem)) {
    return ascii || `download${extension}`;
  }
  return `download${extension}`;
}

function encodeContentDispositionFilename(filename: string) {
  const safe = headerSafeFilename(filename);
  return encodeURIComponent(safe)
    .replace(
      /['()]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/\*/g, "%2A");
}

function contentDispositionHeader(filename: string) {
  const fallback = asciiContentDispositionFilename(filename);
  const encoded = encodeContentDispositionFilename(filename || fallback);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function buildFileHttpResponse(args: {
  filename: string;
  contentType: string;
  source: RuntimeFileTransferSource;
  sha256?: string;
}) {
  const headers = [
    "HTTP/1.1 200 OK",
    `Content-Type: ${args.contentType || "application/octet-stream"}`,
    `Content-Length: ${args.source.size}`,
    ...(args.sha256 ? [`X-Zotero-Bridge-Sha256: ${args.sha256}`] : []),
    `Content-Disposition: ${contentDispositionHeader(args.filename)}`,
    "Connection: close",
    "",
    "",
  ].join("\r\n");
  return {
    kind: "file" as const,
    headers,
    source: args.source,
  };
}

function isBridgePath(path: string) {
  return path === "/bridge/v2" || path.startsWith("/bridge/v2/");
}

function isMcpPath(path: string) {
  return path === "/mcp" || path === "/mcp/";
}

function response(
  status: number,
  reason: string,
  body: HostBridgeResponse,
  lastError = "",
) {
  updateState({
    lastResponseStatus: status,
    lastError,
  });
  return buildHttpResponse({
    status,
    reason,
    body,
  });
}

function health(): HostBridgeHealth {
  return {
    status: state.status,
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    bindMode: state.bindMode,
    lanEnabled: state.lanEnabled,
    authRequired: true,
    ...hostAccessRoutes(),
  };
}

function manifest(request?: HttpRequest) {
  const masterToken = getHostBridgeMasterTokenStatus();
  const capabilities = listHostBridgeCapabilities();
  const capabilityPage = request
    ? paginateRequestRows(request, "bridge manifest", capabilities)
    : {
        page: capabilities,
        nextCursor: "",
        hasMore: false,
        returned: capabilities.length,
        total: capabilities.length,
        limit: capabilities.length,
      };
  return {
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    endpoint: {
      url: buildLocalClientEndpoint(state.bindMode, state.port),
      remoteUrl: buildRemoteEndpoint(state.port),
      advertisedHost: getAdvertisedHost(),
      bindMode: state.bindMode,
      lanEnabled: state.lanEnabled,
    },
    auth: {
      type: "bearer",
      tokenMasked: redactHostBridgeToken(state.token || getHostBridgeToken()),
      masterTokenConfigured: masterToken.configured,
      masterTokenMasked: masterToken.tokenMasked,
    },
    capabilities: capabilityPage.page,
    nextCursor: capabilityPage.nextCursor,
    hasMore: capabilityPage.hasMore,
    returned: capabilityPage.returned,
    total: capabilityPage.total,
    limit: capabilityPage.limit,
    workflowControl: getHostBridgeWorkflowControlManifest(),
    contextControl: {
      supported: true,
      approvalRequired: false,
      endpoints: [
        "GET /bridge/v2/context/current",
        "GET /bridge/v2/context/selection",
        "POST /bridge/v2/context/selection/open",
        "POST /bridge/v2/context/items/open",
        "POST /bridge/v2/context/collections/open",
        "POST /bridge/v2/context/notes/open",
      ],
    },
    fileDownloads: {
      ...getHostBridgeFileDownloadManifest(),
    },
    fileUploads: {
      supported: true,
      endpoint: "POST /bridge/v2/files/upload",
      auth: "bearer",
      maxBytes: MAX_UPLOAD_BODY_BYTES,
      arbitraryPathAllowed: false,
      approvalRequired: false,
    },
    ...hostAccessRoutes(),
    cli: {
      supported: true,
      schema: HOST_BRIDGE_CLI_SCHEMA,
    },
  };
}

function methodNotAllowed(message: string, allow: string) {
  return response(
    405,
    "Method Not Allowed",
    hostBridgeError("method_not_allowed", message, "routing", { allow }),
    "method_not_allowed",
  );
}

async function callCapability(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Capability call endpoint only supports POST",
      "POST",
    );
  }

  let payload: HostBridgeCallRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeCallRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability call request body must be valid JSON",
        "validation",
      ),
      "invalid_capability_input",
    );
  }

  const capabilityName = String(payload?.capability || "").trim();
  if (!capabilityName) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability call request requires a capability name",
        "validation",
      ),
      "invalid_capability_input",
    );
  }

  const capability = getHostBridgeCapability(capabilityName);
  if (!capability) {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "capability_not_found",
        "Host Bridge capability not found",
        "capability",
        { capability: capabilityName },
      ),
      "capability_not_found",
    );
  }

  const normalizedInput = payload.input ?? {};
  const inputViolations = validateHostBridgeCapabilityInput(
    capabilityName,
    normalizedInput,
  );
  if (inputViolations.length) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_capability_input",
        "Capability input does not satisfy its executable contract",
        "validation",
        {
          schema: "host-bridge.argument-error.v1",
          phase: "capability_input",
          capability: capabilityName,
          violations: inputViolations,
          truncated: inputViolations.length >= 8,
        },
      ),
      "invalid_capability_input",
    );
  }

  try {
    const permissionScope = parsePermissionScopeHeader(request);
    const autoApprovedWrite =
      capability.category === "mutation" &&
      isHostBridgeWriteAutoApprovalScope(permissionScope);
    if (capability.approval !== "none" && !autoApprovedWrite) {
      const approvalPrompt = buildCapabilityApprovalPrompt(
        capability,
        normalizedInput,
      );
      await requestHostBridgePermission({
        action: capability.name,
        ...approvalPrompt,
        source: "host-bridge-cli",
        scope: permissionScope,
      });
    }
    const data = await executeHostBridgeCapability(
      capability.name,
      normalizedInput,
      {
        getStatus: getHostBridgeServerStatus,
        connectionMode: parseConnectionModeHeader(request, transportContext),
        ...(synthesisServiceResolverForTests
          ? { resolveSynthesisService: synthesisServiceResolverForTests }
          : {}),
      },
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        capability: capability.name,
        approval: autoApprovedWrite ? "auto-approved" : capability.approval,
        data,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCapabilityContractError) {
      const inputError = error.code === "invalid_capability_input";
      return response(
        inputError ? 400 : 500,
        inputError ? "Bad Request" : "Internal Server Error",
        hostBridgeError(
          error.code,
          error.message,
          inputError ? "validation" : "internal",
          {
            schema: "host-bridge.argument-error.v1",
            phase: inputError ? "capability_input" : "command_result",
            capability: capability.name,
            violations: error.violations,
            truncated: error.violations.length >= 8,
          },
        ),
        error.code,
      );
    }
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
    }
    if (error instanceof HostBridgeWorkflowProductError) {
      return response(
        error.httpStatus,
        error.statusText,
        hostBridgeError(error.code, error.message, error.category),
        error.code,
      );
    }
    if (error instanceof ZoteroLibraryCursorError) {
      return response(
        400,
        "Bad Request",
        hostBridgeError(error.code, error.message, "validation", {
          capability: capability.name,
          retryable: false,
          ...(error.details || {}),
        }),
        error.code,
      );
    }
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    if (error instanceof SynthesisMaintenanceError) {
      const conflict = error.code === "maintenance_idempotency_conflict";
      const code = conflict
        ? "synthesis_maintenance_idempotency_conflict"
        : "invalid_capability_input";
      return response(
        conflict ? 409 : 400,
        conflict ? "Conflict" : "Bad Request",
        hostBridgeError(
          code,
          "Invalid Synthesis maintenance request",
          "validation",
          {
            capability: capability.name,
            reasonCode: error.code,
          },
        ),
        code,
      );
    }
    return response(
      500,
      "Internal Server Error",
      hostBridgeError(
        "capability_failed",
        "Host Bridge capability failed",
        "capability",
        {
          capability: capability.name,
          message: errorMessage(error),
        },
      ),
      "capability_failed",
    );
  }
}

function parseWorkflowTaskFilters(query: Record<string, string>) {
  const filters: HostBridgeTaskFilters = {};
  for (const key of [
    "workflowId",
    "backendId",
    "backendType",
    "requestId",
    "submissionId",
    "runId",
    "state",
  ] as const) {
    const value = String(query[key] || "").trim();
    if (value) {
      filters[key] = value;
    }
  }
  if (
    String(query.includeHistory || "")
      .trim()
      .toLowerCase() === "false"
  ) {
    filters.includeHistory = false;
    filters.activeOnly = true;
  }
  const activeOnly = String(query.activeOnly || query["active-only"] || "")
    .trim()
    .toLowerCase();
  if (activeOnly === "true" || activeOnly === "1" || activeOnly === "yes") {
    filters.activeOnly = true;
  }
  return filters;
}

function parseOptionalBoolean(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseHostBridgeNotificationFilters(
  query: Record<string, string>,
): HostBridgeNotificationFilters {
  const filters: HostBridgeNotificationFilters = {};
  const workflowRunId = String(query.workflowRunId || query.runId || "").trim();
  const skillRunId = String(query.skillRunId || "").trim();
  const type = String(query.type || "").trim();
  const sinceEventId = String(query.sinceEventId || "").trim();
  const clientId = String(query.clientId || "").trim();
  if (workflowRunId) {
    filters.workflowRunId = workflowRunId;
  }
  if (skillRunId) {
    filters.skillRunId = skillRunId;
  }
  if (type) {
    filters.type = type;
  }
  if (sinceEventId) {
    filters.sinceEventId = sinceEventId;
  }
  if (clientId) {
    filters.clientId = clientId;
  }
  const includeSuppressed = parseOptionalBoolean(query.includeSuppressed);
  if (typeof includeSuppressed === "boolean") {
    filters.includeSuppressed = includeSuppressed;
  }
  const acknowledged = parseOptionalBoolean(query.acknowledged);
  if (typeof acknowledged === "boolean") {
    filters.acknowledged = acknowledged;
  }
  const limit = Number(query.limit || "");
  if (Number.isFinite(limit) && limit > 0) {
    filters.limit = Math.floor(limit);
  }
  return filters;
}

function parsePositiveLimit(query: Record<string, string>, fallback = 20) {
  const value = Number(query.limit || "");
  if (Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.min(200, Math.floor(value)));
  }
  return fallback;
}

function paginationCriteria(query: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key !== "cursor" && key !== "limit")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function paginationRowKey(value: unknown) {
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  for (const key of [
    "queueId",
    "submissionUnitId",
    "permissionRequestId",
    "eventId",
    "skillRunId",
    "workflowRunId",
    "runId",
    "requestId",
    "id",
    "key",
  ]) {
    const entry = String(object[key] || "").trim();
    if (entry) return `${key}:${entry}`;
  }
  return stableTextFingerprint(value);
}

function paginateRequestRows<T>(
  request: HttpRequest,
  scope: string,
  rows: readonly T[],
  extraCriteria: Record<string, unknown> = {},
) {
  return paginateHostBridgeRows({
    scope,
    criteria: { ...paginationCriteria(request.query), ...extraCriteria },
    rows,
    key: paginationRowKey,
    cursor: request.query.cursor,
    limit: request.query.limit,
  });
}

function paginationErrorResponse(error: HostBridgeCursorError) {
  return response(
    400,
    "Bad Request",
    hostBridgeError("invalid_host_bridge_cursor", error.message, "validation", {
      reason: error.reason,
      ...error.details,
    }),
    "invalid_host_bridge_cursor",
  );
}

function stableTextFingerprint(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function redactDiagnosticText(value: unknown) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/[A-Za-z]:[\\/][^\r\n.;,)]*/g, "[redacted-path]")
    .replace(
      /\/(?:Users|home|var|tmp|private|Volumes|root|opt|data)\/[^\r\n.;,)]*/g,
      "[redacted-path]",
    )
    .replace(
      /(bearer|token|password|secret|api[_-]?key|access[_-]?token)=([^&\s]+)/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);
}

function summarizeRuntimeOptionsCache(backend: BackendInstance) {
  const cache = backend.acp?.runtimeOptionsCache;
  return {
    refreshedAt: cache?.refreshedAt || "",
    modes: Array.isArray(cache?.modes) ? cache.modes.length : 0,
    rawModels: Array.isArray(cache?.rawModels) ? cache.rawModels.length : 0,
    displayModels: Array.isArray(cache?.displayModels)
      ? cache.displayModels.length
      : 0,
    reasoningEfforts: Array.isArray(cache?.reasoningEfforts)
      ? cache.reasoningEfforts.length
      : 0,
  };
}

function summarizeBackend(backend: BackendInstance) {
  const connectionTest = backend.acp?.connectionTest;
  return {
    backendId: backend.id,
    id: backend.id,
    type: backend.type,
    displayName: backend.displayName || backend.id,
    enabled: backend.enabled !== false,
    locality: String(backend.baseUrl || "").startsWith("local://")
      ? "local"
      : "remote",
    commandConfigured: Boolean(backend.command),
    auth: {
      configured:
        Boolean(backend.auth && backend.auth.kind !== "none") ||
        Boolean(
          backend.management_auth &&
          backend.management_auth.kind &&
          backend.management_auth.kind !== "none",
        ),
    },
    acp: backend.acp
      ? {
          agentFamily: backend.acp.agentFamily || "unknown",
          connectionTest: connectionTest
            ? {
                status: connectionTest.status || "untested",
                testedAt: connectionTest.testedAt || "",
                configFingerprint: connectionTest.configFingerprint || "",
                error: redactDiagnosticText(connectionTest.error),
              }
            : { status: "untested" },
          runtimeOptionsCache: summarizeRuntimeOptionsCache(backend),
        }
      : undefined,
  };
}

async function loadBackendSummaries() {
  const loaded = await loadBackendsRegistry();
  return {
    backends: loaded.backends.map(summarizeBackend),
    warnings: loaded.warnings.map(redactDiagnosticText).filter(Boolean),
    errors: loaded.errors.map(redactDiagnosticText).filter(Boolean),
    invalidBackends: Object.fromEntries(
      Object.entries(loaded.invalidBackends || {}).map(([key, value]) => [
        key,
        redactDiagnosticText(value),
      ]),
    ),
    fatalError: redactDiagnosticText(loaded.fatalError),
  };
}

function parseSkillRunEventFilters(query: Record<string, string>) {
  const sinceUpdatedAt = String(
    query.sinceUpdatedAt || query["since-updated-at"] || "",
  ).trim();
  return {
    sinceUpdatedAt: sinceUpdatedAt || undefined,
    limit: parsePositiveLimit(query),
  };
}

function asRequestObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function navigationErrorResponse(error: unknown) {
  if (error instanceof ZoteroInvalidObjectRefError) {
    return response(
      400,
      "Bad Request",
      hostBridgeError("invalid_object_ref", error.message, "validation", {
        ref: error.ref,
      }),
      "invalid_object_ref",
    );
  }
  if (error instanceof ZoteroItemNotFoundError) {
    return response(
      404,
      "Not Found",
      hostBridgeError("item_not_found", error.message, "not_found", {
        ref: error.ref,
      }),
      "item_not_found",
    );
  }
  if (error instanceof ZoteroNoteNotFoundError) {
    return response(
      404,
      "Not Found",
      hostBridgeError("note_not_found", error.message, "not_found", {
        ref: error.ref,
      }),
      "note_not_found",
    );
  }
  if (error instanceof ZoteroCollectionNotFoundError) {
    return response(
      404,
      "Not Found",
      hostBridgeError("collection_not_found", error.message, "not_found", {
        ref: error.ref,
      }),
      "collection_not_found",
    );
  }
  if (error instanceof ZoteroNavigationUnavailableError) {
    return response(
      503,
      "Service Unavailable",
      hostBridgeError("navigation_unavailable", error.message, "internal"),
      "navigation_unavailable",
    );
  }
  return response(
    500,
    "Internal Server Error",
    hostBridgeError(
      "context_navigation_failed",
      errorMessage(error),
      "internal",
    ),
    "context_navigation_failed",
  );
}

function parseNavigationBody(request: HttpRequest) {
  try {
    return parseJsonBody(request.body || "");
  } catch {
    throw new ZoteroInvalidObjectRefError(
      "navigation request body must be JSON",
    );
  }
}

async function listWorkflows(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Workflow list endpoint only supports GET", "GET");
  }
  return response(
    200,
    "OK",
    hostBridgeOk({ workflows: listHostBridgeWorkflows() }),
  );
}

async function inspectProfile(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Profile inspect endpoint only supports GET",
      "GET",
    );
  }
  const currentManifest = manifest();
  const capabilities = currentManifest.capabilities.map((entry) => ({
    name: entry.name,
    category: entry.category,
    approval: entry.approval,
    inputSchema: entry.inputSchema,
    outputSchema: entry.outputSchema,
  }));
  return response(
    200,
    "OK",
    hostBridgeOk({
      schema: "host-bridge.profile-inspect.v1",
      generatedAt: nowIso(),
      protocol: currentManifest.protocol,
      endpoint: currentManifest.endpoint,
      connectionMode: parseConnectionModeHeader(request, transportContext),
      capabilities: {
        count: capabilities.length,
        fingerprint: stableTextFingerprint(capabilities),
      },
      workflowControl: currentManifest.workflowControl,
      fileDownloads: currentManifest.fileDownloads,
      fileUploads: currentManifest.fileUploads,
      safety: {
        stdout: "single-json-object",
        tokensRedacted: true,
        localPrivatePathsRedacted: true,
        transcriptFree: true,
      },
    }),
  );
}

async function diagnoseProfile(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Profile diagnose endpoint only supports GET",
      "GET",
    );
  }
  const backendSummary = await loadBackendSummaries();
  return response(
    200,
    "OK",
    hostBridgeOk({
      schema: "host-bridge.profile-diagnose.v1",
      generatedAt: nowIso(),
      status: health(),
      backendSummary: {
        total: backendSummary.backends.length,
        enabled: backendSummary.backends.filter((entry) => entry.enabled)
          .length,
        warnings: backendSummary.warnings,
        errors: backendSummary.errors,
        fatalError: backendSummary.fatalError,
      },
    }),
  );
}

async function listBackends(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Backend list endpoint only supports GET", "GET");
  }
  return response(200, "OK", hostBridgeOk(await loadBackendSummaries()));
}

async function getBackendStatus(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Backend status endpoint only supports GET", "GET");
  }
  const prefix = "/bridge/v2/diagnostics/backends/";
  const backendId = safeDecodeURIComponent(request.path.slice(prefix.length));
  if (!backendId) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "backend_not_found",
        "Backend id is required",
        "not_found",
      ),
      "backend_not_found",
    );
  }
  const summary = await loadBackendSummaries();
  const backend = summary.backends.find((entry) => entry.id === backendId);
  if (!backend) {
    return response(
      404,
      "Not Found",
      hostBridgeError("backend_not_found", "Backend not found", "not_found", {
        backendId,
      }),
      "backend_not_found",
    );
  }
  return response(200, "OK", hostBridgeOk({ backend }));
}

async function describeWorkflow(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow describe endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowDescribeRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeWorkflowDescribeRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_describe_request",
        "Workflow describe request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_describe_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await describeHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          { workflowId: String(payload?.workflowId || "").trim() },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_describe_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function validateWorkflow(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow validate endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowValidateRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeWorkflowValidateRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_validate_request",
        "Workflow validate request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_validate_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await validateHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_validate_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function listProviderProfiles(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Provider profile list endpoint only supports GET",
      "GET",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await listHostBridgeProviderProfiles()),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_provider_profile_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(code, errorMessage(error), "validation"),
      code,
    );
  }
}

async function describeProviderProfile(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Provider profile describe endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeProviderProfileDescribeRequest;
  try {
    payload = parseJsonBody(
      request.body,
    ) as HostBridgeProviderProfileDescribeRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile_request",
        "Provider profile describe request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await describeHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_provider_profile_request",
    );
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return response(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function validateProviderProfile(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Provider profile validate endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeProviderProfileValidateRequest;
  try {
    payload = parseJsonBody(
      request.body,
    ) as HostBridgeProviderProfileValidateRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile",
        "Provider profile validate request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await validateHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(error, "invalid_provider_profile");
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return response(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function workflowDefaults(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow defaults endpoint only supports POST",
      "POST",
    );
  }
  let payload: { workflowId?: unknown };
  try {
    payload = parseJsonBody(request.body) as { workflowId?: unknown };
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_defaults_request",
        "Workflow defaults request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_defaults_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await getHostBridgeWorkflowDefaults(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_workflow_defaults_request",
    );
    const status = code === "workflow_not_found" ? 404 : 400;
    return response(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(code, errorMessage(error), "validation"),
      code,
    );
  }
}

async function refreshProviderProfile(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Provider profile refresh endpoint only supports POST",
      "POST",
    );
  }
  let payload: { backendId?: unknown };
  try {
    payload = parseJsonBody(request.body) as { backendId?: unknown };
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile_request",
        "Provider profile refresh request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await refreshHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "provider_profile_refresh_failed",
    );
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return response(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function workflowRequirements(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow requirements endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowDescribeRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeWorkflowDescribeRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_describe_request",
        "Workflow requirements request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_describe_request",
    );
  }
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(await requirementsForHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_describe_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function submitWorkflow(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow submit endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowSubmitRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeWorkflowSubmitRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_submit_request",
        "Workflow submit request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_submit_request",
    );
  }
  try {
    const result = await submitHostBridgeWorkflow({
      payload,
      scope: parsePermissionScopeHeader(request),
    });
    const boundedResult =
      result.admission === "direct"
        ? {
            workflowId: result.workflowId,
            workflowLabel: result.workflowLabel,
            admission: result.admission,
            workflowRunId: result.workflowRunId,
            totalJobs: result.totalJobs,
            permission: result.permission,
            resourceOutputs: result.resourceOutputs,
            runUrl: `/bridge/v2/workflows/runs/${encodeURIComponent(result.workflowRunId)}`,
            tasksUrl: `/bridge/v2/tasks?runId=${encodeURIComponent(result.workflowRunId)}`,
          }
        : result;
    return response(
      result.admission === "host-queue" ? 202 : 200,
      result.admission === "host-queue" ? "Accepted" : "OK",
      hostBridgeOk(boundedResult),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
    }
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          { workflowId: String(payload?.workflowId || "").trim() },
        ),
        "workflow_not_found",
      );
    }
    const message = errorMessage(error);
    if (
      message === "workflow preparation halted" ||
      message === "workflow submission produced no allowed requests"
    ) {
      return response(
        500,
        "Internal Server Error",
        hostBridgeError("workflow_submit_failed", message, "workflow"),
        "workflow_submit_failed",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_submit_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function agentRunWorkflow(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow agent-run endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowAgentRunRequest;
  try {
    payload = parseJsonBody(request.body) as HostBridgeWorkflowAgentRunRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_agent_run_request",
        "Workflow agent-run request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_agent_run_request",
    );
  }
  try {
    const result = await buildHostBridgeWorkflowAgentRun({ payload });
    const { requests, ...boundedResult } = result;
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...boundedResult,
        requestCount: requests.length,
        bundleInspectCommand: `zotero-bridge workflow agent-bundle inspect --bundle ${result.bundle.file.displayName}`,
      }),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          { workflowId: String(payload?.workflowId || "").trim() },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_agent_run_request",
    );
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function applyAgentRunWorkflow(request: HttpRequest) {
  const prefix = "/bridge/v2/workflows/agent-runs/";
  const suffix = "/apply";
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const agentRunId = safeDecodeURIComponent(encoded) || "";
  if (request.method === "GET") {
    const receipt = getHostBridgeWorkflowAgentRunApplyReceipt(agentRunId);
    if (!receipt) {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "agent_run_not_found",
          "Agent run not found",
          "workflow",
          {
            agentRunId,
          },
        ),
        "agent_run_not_found",
      );
    }
    try {
      const page = paginateRequestRows(
        request,
        "workflow agent-apply-status",
        receipt.results,
        { agentRunId },
      );
      return response(
        200,
        "OK",
        hostBridgeOk({
          ...receipt,
          results: page.page,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          returned: page.returned,
          total: page.total,
          limit: page.limit,
        }),
      );
    } catch (error) {
      if (error instanceof HostBridgeCursorError) {
        return paginationErrorResponse(error);
      }
      throw error;
    }
  }
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow agent-run apply endpoint only supports GET and POST",
      "GET, POST",
    );
  }
  let payload: HostBridgeWorkflowAgentApplyRequest;
  try {
    payload = parseJsonBody(
      request.body,
    ) as HostBridgeWorkflowAgentApplyRequest;
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_agent_run_apply_request" as HostBridgeErrorCode,
        "Workflow agent-run apply request body must be valid JSON",
        "validation",
      ),
      "invalid_agent_run_apply_request" as HostBridgeErrorCode,
    );
  }
  try {
    const result = await applyHostBridgeWorkflowAgentRun({
      agentRunId,
      payload,
      scope: parsePermissionScopeHeader(request),
    });
    const { results: _results, warnings: _warnings, ...boundedResult } = result;
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...boundedResult,
        receiptUrl: `/bridge/v2/workflows/agent-runs/${encodeURIComponent(agentRunId)}/apply`,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
    }
    return agentRunApplyErrorResponse(error);
  }
}

async function changeAgentRunWorkflowLifecycle(
  request: HttpRequest,
  action: "renew" | "abandon",
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      `Workflow agent-run ${action} endpoint only supports POST`,
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/agent-runs/";
  const suffix = `/${action}`;
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const agentRunId = safeDecodeURIComponent(encoded) || "";
  try {
    const result =
      action === "renew"
        ? renewHostBridgeWorkflowAgentRun(agentRunId)
        : abandonHostBridgeWorkflowAgentRun(agentRunId);
    return response(200, "OK", hostBridgeOk(result));
  } catch (error) {
    return agentRunApplyErrorResponse(error);
  }
}

async function getWorkflowRun(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Workflow run endpoint only supports GET", "GET");
  }
  const prefix = "/bridge/v2/workflows/runs/";
  const runId = safeDecodeURIComponent(request.path.slice(prefix.length)) || "";
  const status = getHostBridgeWorkflowRunStatus(runId);
  if (!status.found) {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_run_not_found",
        "Workflow run not found",
        "workflow",
        { runId },
      ),
      "workflow_run_not_found",
    );
  }
  try {
    const page = paginateRequestRows(
      request,
      "run get",
      status.skillRuns || [],
      { runId },
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...status,
        skillRuns: page.page,
        pagination: {
          skillRuns: {
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            returned: page.returned,
            total: page.total,
            limit: page.limit,
          },
        },
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return controlPlaneErrorResponse(error);
  }
}

function controlPlaneErrorResponse(error: unknown) {
  const code = String((error as { code?: unknown })?.code || "").trim();
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details ||
    undefined;
  if (code === "workflow_submission_not_found") {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_submission_not_found" as HostBridgeErrorCode,
        errorMessage(error),
        "workflow",
        details,
      ),
      "workflow_submission_not_found" as HostBridgeErrorCode,
    );
  }
  if (code === "queue_unit_not_pending") {
    return response(
      409,
      "Conflict",
      hostBridgeError(
        "queue_unit_not_pending" as HostBridgeErrorCode,
        errorMessage(error),
        "workflow",
        details,
      ),
      "queue_unit_not_pending" as HostBridgeErrorCode,
    );
  }
  if (code === "workflow_run_not_found") {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_run_not_found",
        errorMessage(error),
        "workflow",
        details,
      ),
      "workflow_run_not_found",
    );
  }
  if (code === "skill_run_not_found") {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "skill_run_not_found",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_found",
    );
  }
  if (code === "invalid_skill_run_id") {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_skill_run_id",
        errorMessage(error),
        "validation",
        details,
      ),
      "invalid_skill_run_id",
    );
  }
  if (code === "skill_run_not_waiting") {
    return response(
      409,
      "Conflict",
      hostBridgeError(
        "skill_run_not_waiting",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_waiting",
    );
  }
  if (code === "skill_run_not_recoverable") {
    return response(
      409,
      "Conflict",
      hostBridgeError(
        "skill_run_not_recoverable",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_recoverable",
    );
  }
  if (code === "unsupported_interaction_backend") {
    return response(
      422,
      "Unprocessable Entity",
      hostBridgeError(
        "unsupported_interaction_backend",
        errorMessage(error),
        "workflow",
        details,
      ),
      "unsupported_interaction_backend",
    );
  }
  return response(
    500,
    "Internal Server Error",
    hostBridgeError("internal_error", errorMessage(error), "internal", details),
    "internal_error",
  );
}

function agentRunApplyErrorResponse(error: unknown) {
  const code = String((error as { code?: unknown })?.code || "").trim();
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details ||
    undefined;
  const statusByCode: Record<string, number> = {
    invalid_agent_run_apply_request: 400,
    agent_run_not_found: 404,
    workflow_not_found: 404,
    agent_run_expired: 410,
    agent_run_already_consumed: 409,
    agent_run_lifecycle_conflict: 409,
    unknown_request: 400,
    invalid_bundle: 422,
    apply_not_allowed: 409,
  };
  const status = statusByCode[code] || 500;
  const reason =
    status === 400
      ? "Bad Request"
      : status === 404
        ? "Not Found"
        : status === 409
          ? "Conflict"
          : status === 410
            ? "Gone"
            : status === 422
              ? "Unprocessable Entity"
              : "Internal Server Error";
  const responseCode = code || "internal_error";
  return response(
    status,
    reason,
    hostBridgeError(
      responseCode as HostBridgeErrorCode,
      errorMessage(error),
      status >= 500 ? "internal" : "workflow",
      details,
    ),
    responseCode as HostBridgeErrorCode,
  );
}

async function cancelWorkflowRun(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow cancel endpoint only supports POST",
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/runs/";
  const suffix = "/cancel";
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const workflowRunId = safeDecodeURIComponent(encoded) || "";
  try {
    const payload = parseJsonBody(request.body || "");
    const object =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};
    const result = await cancelHostBridgeWorkflowRun({
      workflowRunId,
      reason: String(object.reason || "").trim() || undefined,
      message: String(object.message || "").trim() || undefined,
      scope: parsePermissionScopeHeader(request),
      timeoutMs: WORKFLOW_PERMISSION_TIMEOUT_MS,
    });
    return response(200, "OK", hostBridgeOk(result));
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
    }
    return controlPlaneErrorResponse(error);
  }
}

async function listWorkflowQueue(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Workflow queue endpoint only supports GET", "GET");
  }
  const backendType = String(request.query.backendType || "").trim();
  const backendId = String(request.query.backendId || "").trim();
  const scope =
    (backendType === "acp" || backendType === "skillrunner") && backendId
      ? {
          backendType: backendType as "acp" | "skillrunner",
          backendId,
        }
      : undefined;
  try {
    const result = listHostBridgeWorkflowQueue(scope);
    const page = paginateRequestRows(
      request,
      "workflow queue list",
      result.units,
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...result,
        units: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    throw error;
  }
}

async function getWorkflowSubmission(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Workflow submission endpoint only supports GET",
      "GET",
    );
  }
  const prefix = "/bridge/v2/workflows/submissions/";
  const submissionId =
    safeDecodeURIComponent(request.path.slice(prefix.length)) || "";
  try {
    const result = getHostBridgeWorkflowSubmission(submissionId);
    const page = paginateRequestRows(
      request,
      "workflow submission get",
      result.units,
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...result,
        units: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return controlPlaneErrorResponse(error);
  }
}

async function cancelWorkflowQueueUnit(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Workflow queue cancel endpoint only supports POST",
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/queue/";
  const suffix = "/cancel";
  const queueId =
    safeDecodeURIComponent(request.path.slice(prefix.length, -suffix.length)) ||
    "";
  try {
    return response(
      200,
      "OK",
      hostBridgeOk(cancelHostBridgeWorkflowQueueUnit(queueId)),
    );
  } catch (error) {
    return controlPlaneErrorResponse(error);
  }
}

async function listTasks(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Task list endpoint only supports GET", "GET");
  }
  try {
    const page = paginateRequestRows(
      request,
      "run list",
      listHostBridgeTasks(parseWorkflowTaskFilters(request.query)),
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        items: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function listRecentTasks(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Recent task endpoint only supports GET", "GET");
  }
  try {
    const page = paginateRequestRows(
      request,
      "run recent",
      listHostBridgeTasks({
        ...parseWorkflowTaskFilters(request.query),
        includeHistory: true,
      }),
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        items: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function listWorkflowRuns(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Workflow runs endpoint only supports GET", "GET");
  }
  try {
    const result = listHostBridgeWorkflowRuns(
      parseWorkflowTaskFilters(request.query),
    );
    const page = paginateRequestRows(
      request,
      "run workflow recent",
      result.runs,
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        runs: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function listRecentSkillRuns(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Recent skill-run endpoint only supports GET",
      "GET",
    );
  }
  try {
    const result = listHostBridgeRecentSkillRuns(
      parseWorkflowTaskFilters(request.query),
    );
    const page = paginateRequestRows(
      request,
      "run skill recent",
      result.skillRuns,
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        skillRuns: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function listActiveTasks(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Active task endpoint only supports GET", "GET");
  }
  try {
    const page = paginateRequestRows(
      request,
      "run active",
      listHostBridgeActiveTasks(),
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        tasks: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function listPendingPermissions(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Permission pending endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateRequestRows(
      request,
      "run permission pending",
      listHostBridgePendingPermissions(),
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        permissions: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(error)
      : controlPlaneErrorResponse(error);
  }
}

async function getPermission(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Permission get endpoint only supports GET", "GET");
  }
  const prefix = "/bridge/v2/permissions/";
  const permissionRequestId =
    safeDecodeURIComponent(request.path.slice(prefix.length)) || "";
  const permission = getHostBridgePermissionProjection(permissionRequestId);
  if (!permission) {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "permission_request_not_found",
        "Permission request not found",
        "not_found",
        { permissionRequestId },
      ),
      "permission_request_not_found",
    );
  }
  return response(200, "OK", hostBridgeOk({ permission }));
}

async function getCurrentContext(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Context current endpoint only supports GET",
      "GET",
    );
  }
  try {
    const currentView =
      createZoteroHostCapabilityBrokerApis().context.getCurrentView();
    const page = paginateRequestRows(
      request,
      "context current",
      currentView.selectedItems || [],
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...currentView,
        selectedItems: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return navigationErrorResponse(error);
  }
}

async function getCurrentSelection(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Context selection endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateRequestRows(
      request,
      "context selection get",
      createZoteroHostCapabilityBrokerApis().context.getSelectedItems(),
    );
    return response(
      200,
      "OK",
      hostBridgeOk({
        items: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return navigationErrorResponse(error);
  }
}

async function openContextItem(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Context item open endpoint only supports POST",
      "POST",
    );
  }
  try {
    const payload = parseNavigationBody(request);
    const object = asRequestObject(payload);
    const ref =
      object.item ??
      object.ref ??
      object.target ??
      (typeof payload === "string" ? payload : object);
    return response(
      200,
      "OK",
      hostBridgeOk(
        await createZoteroHostCapabilityBrokerApis().context.openItem(
          ref as never,
        ),
      ),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return navigationErrorResponse(error);
  }
}

async function openContextNote(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Context note open endpoint only supports POST",
      "POST",
    );
  }
  try {
    const payload = parseNavigationBody(request);
    const object = asRequestObject(payload);
    const ref =
      object.note ??
      object.ref ??
      object.target ??
      (typeof payload === "string" ? payload : object);
    return response(
      200,
      "OK",
      hostBridgeOk(
        await createZoteroHostCapabilityBrokerApis().context.openNote(
          ref as never,
        ),
      ),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return navigationErrorResponse(error);
  }
}

async function openContextCollection(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Context collection open endpoint only supports POST",
      "POST",
    );
  }
  try {
    const payload = parseNavigationBody(request);
    const object = asRequestObject(payload);
    const collection = asRequestObject(object.collection);
    const libraryId =
      typeof object.libraryId === "string" ||
      typeof object.libraryId === "number"
        ? object.libraryId
        : typeof object.libraryID === "string" ||
            typeof object.libraryID === "number"
          ? object.libraryID
          : typeof collection.libraryId === "string" ||
              typeof collection.libraryId === "number"
            ? collection.libraryId
            : undefined;
    return response(
      200,
      "OK",
      hostBridgeOk(
        await createZoteroHostCapabilityBrokerApis().context.openCollection({
          key: String(
            object.key || object.collectionKey || collection.key || "",
          ),
          libraryId,
        }),
      ),
    );
  } catch (error) {
    return navigationErrorResponse(error);
  }
}

async function openContextSelection(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Context selection open endpoint only supports POST",
      "POST",
    );
  }
  try {
    const payload = parseNavigationBody(request);
    const object = asRequestObject(payload);
    const items = Array.isArray(object.items)
      ? object.items
      : Array.isArray(payload)
        ? payload
        : [];
    const result =
      await createZoteroHostCapabilityBrokerApis().context.openSelection({
        items: items as never[],
      });
    const target = asRequestObject(result.target);
    const targetItems = Array.isArray(target.items) ? target.items : [];
    const page = paginateRequestRows(
      request,
      "context selection open",
      targetItems,
      { items },
    );
    const currentView = asRequestObject(result.currentView);
    return response(
      200,
      "OK",
      hostBridgeOk({
        ...result,
        target: { ...target, items: page.page },
        currentView: {
          ...currentView,
          selectedItems: page.page,
        },
        pagination: {
          items: {
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            returned: page.returned,
            total: page.total,
            limit: page.limit,
          },
        },
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return navigationErrorResponse(error);
  }
}

async function listNotifications(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Notification list endpoint only supports GET",
      "GET",
    );
  }
  return response(
    200,
    "OK",
    hostBridgeOk(
      listHostBridgeNotifications(
        parseHostBridgeNotificationFilters(request.query),
      ),
    ),
  );
}

async function ackNotifications(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Notification ack endpoint only supports POST",
      "POST",
    );
  }
  const payload = parseJsonBody(request.body || "");
  const object =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const eventIds = Array.isArray(object.eventIds)
    ? object.eventIds.map((entry) => String(entry || "").trim())
    : [String(object.eventId || "").trim()];
  const normalized = eventIds.filter(Boolean);
  const clientId = String(
    object.clientId || request.query.clientId || "",
  ).trim();
  if (normalized.length === 0) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_request_body",
        "notification ack requires body.eventId or body.eventIds",
        "validation",
      ),
      "invalid_request_body",
    );
  }
  return response(
    200,
    "OK",
    hostBridgeOk(ackHostBridgeNotifications(normalized, clientId)),
  );
}

function skillRunPathParts(path: string) {
  const prefix = "/bridge/v2/skill-runs/";
  const rest = path.slice(prefix.length);
  const parts = rest.split("/");
  return {
    skillRunId: safeDecodeURIComponent(parts[0] || "") || "",
    action: parts[1] || "",
    extra: parts.slice(2),
  };
}

async function handleSkillRun(request: HttpRequest) {
  const { skillRunId, action, extra } = skillRunPathParts(request.path);
  if (extra.length > 0) {
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "not_found",
        "Host Bridge skill run route not found",
        "not_found",
      ),
      "not_found",
    );
  }
  try {
    if (!action) {
      if (request.method !== "GET") {
        return methodNotAllowed("Skill run endpoint only supports GET", "GET");
      }
      return response(
        200,
        "OK",
        hostBridgeOk(getHostBridgeSkillRun(skillRunId)),
      );
    }
    if (action === "reply") {
      if (request.method !== "POST") {
        return methodNotAllowed(
          "Skill run reply endpoint only supports POST",
          "POST",
        );
      }
      const payload = parseJsonBody(request.body || "");
      const object =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : {};
      const message = String(object.message || "").trim();
      if (!message) {
        return response(
          400,
          "Bad Request",
          hostBridgeError(
            "invalid_request_body",
            "skill-run reply requires body.message",
            "validation",
          ),
          "invalid_request_body",
        );
      }
      return response(
        200,
        "OK",
        hostBridgeOk(
          await replyHostBridgeSkillRun({
            skillRunId,
            message,
          }),
        ),
      );
    }
    if (action === "connect") {
      if (request.method !== "POST") {
        return methodNotAllowed(
          "Skill run connect endpoint only supports POST",
          "POST",
        );
      }
      return response(
        200,
        "OK",
        hostBridgeOk(await connectHostBridgeSkillRun({ skillRunId })),
      );
    }
    if (action === "events") {
      if (request.method !== "GET") {
        return methodNotAllowed(
          "Skill run events endpoint only supports GET",
          "GET",
        );
      }
      const filters = parseSkillRunEventFilters(request.query);
      const result = listHostBridgeSkillRunEvents(skillRunId, {
        ...filters,
        limit: 1000,
      });
      const page = paginateRequestRows(
        request,
        "run skill events",
        result.events,
        { skillRunId, sinceUpdatedAt: filters.sinceUpdatedAt },
      );
      return response(
        200,
        "OK",
        hostBridgeOk({
          ...result,
          events: page.page,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          returned: page.returned,
          total: page.total,
          limit: page.limit,
        }),
      );
    }
    return response(
      404,
      "Not Found",
      hostBridgeError(
        "not_found",
        "Host Bridge skill run route not found",
        "not_found",
      ),
      "not_found",
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(error);
    }
    return controlPlaneErrorResponse(error);
  }
}

function fileDownloadErrorResponse(error: HostBridgeFileRegistryError) {
  const status =
    error.code === "invalid_file_id"
      ? 400
      : error.code === "file_not_found"
        ? 404
        : error.code === "file_handle_expired"
          ? 410
          : 404;
  const reason =
    status === 400 ? "Bad Request" : status === 410 ? "Gone" : "Not Found";
  return response(
    status,
    reason,
    hostBridgeError(error.code, error.message, "not_found", error.details),
    error.code,
  );
}

async function downloadFile(request: HttpRequest): Promise<RawHttpResponse> {
  if (request.method !== "GET") {
    return methodNotAllowed("File download endpoint only supports GET", "GET");
  }
  const prefix = "/bridge/v2/files/";
  const fileId =
    safeDecodeURIComponent(request.path.slice(prefix.length)) || "";
  try {
    const download = await resolveHostBridgeFileDownload(fileId);
    updateState({
      lastResponseStatus: 200,
      lastError: "",
    });
    return buildFileHttpResponse({
      filename: download.descriptor.displayName,
      contentType: download.descriptor.contentType,
      source: download.source,
      sha256: download.descriptor.sha256,
    });
  } catch (error) {
    if (error instanceof HostBridgeFileRegistryError) {
      return fileDownloadErrorResponse(error);
    }
    return response(
      500,
      "Internal Server Error",
      hostBridgeError(
        "download_failed",
        "Host Bridge file download failed",
        "internal",
        { message: errorMessage(error) },
      ),
      "download_failed",
    );
  }
}

async function uploadFile(request: HttpRequest): Promise<RawHttpResponse> {
  if (request.method !== "POST") {
    return methodNotAllowed("File upload endpoint only supports POST", "POST");
  }
  if ((request.bodyByteLength || 0) <= 0) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "upload_empty",
        "Uploaded file body is empty",
        "validation",
      ),
      "upload_empty",
    );
  }
  if ((request.bodyByteLength || 0) > MAX_UPLOAD_BODY_BYTES) {
    return response(
      413,
      "Payload Too Large",
      hostBridgeError(
        "upload_too_large",
        "Uploaded file body is too large",
        "validation",
        { maxBytes: MAX_UPLOAD_BODY_BYTES },
      ),
      "upload_too_large",
    );
  }
  try {
    const descriptor = await registerHostBridgeUploadedFile({
      bytes: request.bodyBytes,
      displayName:
        request.headers["x-zotero-bridge-display-name"] ||
        request.query.displayName,
      contentType:
        request.headers["content-type"] ||
        request.headers["x-zotero-bridge-content-type"] ||
        "application/octet-stream",
    });
    return response(200, "OK", hostBridgeOk({ file: descriptor }));
  } catch (error) {
    if (error instanceof HostBridgeFileRegistryError) {
      return fileDownloadErrorResponse(error);
    }
    return response(
      500,
      "Internal Server Error",
      hostBridgeError(
        "upload_failed",
        "Host Bridge file upload failed",
        "internal",
        { message: errorMessage(error) },
      ),
      "upload_failed",
    );
  }
}

function synthesisMaintenanceStatus(kind: "cache" | "index") {
  return {
    schema: `host-bridge.synthesis-${kind}-status.v1`,
    generatedAt: nowIso(),
    status: "available",
    readOnly: true,
    cacheView: true,
    supportedInvalidateScopes: ["topic", "graph", "index"],
  };
}

async function getSynthesisCacheStatus(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Synthesis cache status endpoint only supports GET",
      "GET",
    );
  }
  const operationId = String(
    request.query.operationId || request.query.operation_id || "",
  ).trim();
  if (operationId) {
    const capability = getHostBridgeCapability("synthesis.operation.get");
    if (!capability) {
      return response(
        503,
        "Service Unavailable",
        hostBridgeError(
          "capability_not_found",
          "Synthesis maintenance operation status is unavailable",
          "capability",
        ),
        "capability_not_found",
      );
    }
    const data = await executeHostBridgeCapability(
      capability.name,
      { operation_id: operationId },
      {
        getStatus: getHostBridgeServerStatus,
        connectionMode: parseConnectionModeHeader(request, transportContext),
        ...(synthesisServiceResolverForTests
          ? { resolveSynthesisService: synthesisServiceResolverForTests }
          : {}),
      },
    );
    return response(200, "OK", hostBridgeOk(data));
  }
  return response(200, "OK", hostBridgeOk(synthesisMaintenanceStatus("cache")));
}

async function getSynthesisIndexStatus(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      "Synthesis index status endpoint only supports GET",
      "GET",
    );
  }
  return response(
    200,
    "OK",
    hostBridgeOk({
      ...synthesisMaintenanceStatus("index"),
      indexes: ["library", "reference", "topic", "graph"],
    }),
  );
}

async function invalidateSynthesisCache(request: HttpRequest) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      "Synthesis cache invalidate endpoint only supports POST",
      "POST",
    );
  }
  let payload: Record<string, unknown>;
  try {
    payload = asRequestObject(parseJsonBody(request.body || ""));
  } catch {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_request_body",
        "Synthesis cache invalidate body must be valid JSON",
        "validation",
      ),
      "invalid_request_body",
    );
  }
  const scope = String(payload.scope || "").trim();
  if (!["topic", "graph", "index"].includes(scope)) {
    return response(
      422,
      "Unprocessable Entity",
      hostBridgeError(
        "unsupported_cache_scope",
        "Unsupported synthesis cache invalidate scope",
        "validation",
        { scope },
      ),
      "unsupported_cache_scope",
    );
  }
  try {
    await requestHostBridgePermissionForRequirement({
      action: "synthesis.cache.invalidate",
      title: "Invalidate Synthesis cache",
      summary: `Invalidate default Synthesis service cache; requested scope: ${scope}`,
      detail: payload.id
        ? `Requested target id for audit: ${String(payload.id)}`
        : undefined,
      source: "host-bridge-cli",
      scope: parsePermissionScopeHeader(request),
    });
    invalidateDefaultSynthesisService();
    return response(
      200,
      "OK",
      hostBridgeOk({
        invalidated: true,
        scope,
        id: typeof payload.id === "string" ? payload.id : undefined,
        effect: "default_synthesis_service_invalidated",
        effectScope: "default_synthesis_service",
        scopedInvalidationApplied: false,
        invalidatedAt: nowIso(),
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
    }
    return response(
      500,
      "Internal Server Error",
      hostBridgeError("internal_error", errorMessage(error), "internal"),
      "internal_error",
    );
  }
}

async function handleHttpRequestImpl(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  updateState({
    requestCount: state.requestCount + 1,
    lastRequestMethod: `${request.method} ${request.path}`,
  });

  if (request.parseError) {
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "bad_request",
        `Malformed request: ${request.parseError}`,
        "validation",
      ),
      request.parseError,
    );
  }

  if (isMcpPath(request.path)) {
    const { handleZoteroMcpHostAccessRequest } =
      await import("./zoteroMcpServer");
    return handleZoteroMcpHostAccessRequest(request);
  }

  if (!isBridgePath(request.path)) {
    return response(
      404,
      "Not Found",
      hostBridgeError("not_found", "Host Bridge route not found", "not_found"),
      "not_found",
    );
  }

  if (request.path === "/bridge/v2/health") {
    if (request.method !== "GET") {
      return response(
        405,
        "Method Not Allowed",
        hostBridgeError(
          "method_not_allowed",
          "Health endpoint only supports GET",
          "routing",
          { allow: "GET" },
        ),
        "method_not_allowed",
      );
    }
    return response(200, "OK", hostBridgeOk(health()));
  }

  if (!(await isHostBridgeAuthorizationValid(request.headers, state.token))) {
    return response(
      401,
      "Unauthorized",
      hostBridgeError(
        "unauthorized",
        "Host Bridge request requires a valid bearer token",
        "auth",
      ),
      "unauthorized",
    );
  }

  if (
    request.path !== "/bridge/v2/files/upload" &&
    (request.bodyByteLength || 0) > MAX_REQUEST_BODY_BYTES
  ) {
    return response(
      413,
      "Payload Too Large",
      hostBridgeError(
        "request_body_too_large",
        "Host Bridge request body is too large",
        "validation",
        { maxBytes: MAX_REQUEST_BODY_BYTES },
      ),
      "request_body_too_large",
    );
  }

  if (isOperationReceiptPath(request.path)) {
    if (request.method !== "GET") {
      return methodNotAllowed(
        "Operation receipt endpoint only supports GET",
        "GET",
      );
    }
    const prefix = "/bridge/v2/operations/";
    const operationId =
      safeDecodeURIComponent(request.path.slice(prefix.length)) || "";
    const record = getHostBridgeOperation(operationId);
    if (!record) {
      return response(
        404,
        "Not Found",
        hostBridgeError(
          "operation_not_found",
          "Host Bridge operation not found",
          "not_found",
          { operationId },
        ),
        "operation_not_found",
      );
    }
    return response(200, "OK", hostBridgeOk(record));
  }

  const operationId = operationIdFromRequest(request);
  let operationReserved = false;
  const stateChangingRequest = isStateChangingHostBridgeRequest(request);
  if (stateChangingRequest && !operationId) {
    return response(
      428,
      "Precondition Required",
      hostBridgeError(
        "operation_id_required",
        "State-changing Host Bridge requests require X-Zotero-Bridge-Operation-Id",
        "validation",
      ),
      "operation_id_required",
    );
  }
  if (stateChangingRequest || operationId) {
    if (operationId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(operationId)) {
      return response(
        400,
        "Bad Request",
        hostBridgeError(
          "invalid_operation_id",
          "Host Bridge operation id must be an opaque value of at most 200 characters",
          "validation",
        ),
        "invalid_operation_id",
      );
    }
    const requestDigest = await hostBridgeOperationRequestDigest(
      request,
      transportContext,
    );
    if (!requestDigest) {
      return response(
        500,
        "Internal Server Error",
        hostBridgeError(
          "internal_error",
          "Host Bridge could not calculate the operation request digest",
          "internal",
        ),
        "internal_error",
      );
    }
    const reservation = reserveHostBridgeOperation({
      operationId,
      requestDigest,
      method: request.method,
      path: request.path,
    });
    if (reservation.kind === "conflict") {
      return response(
        409,
        "Conflict",
        hostBridgeError(
          "idempotency_conflict",
          "Host Bridge operation id was already used for different input",
          "validation",
          { operationId },
        ),
        "idempotency_conflict",
      );
    }
    if (reservation.kind === "replay") {
      return operationReplayResponse(reservation.record);
    }
    operationReserved = true;
  }

  const dispatchAuthorizedRequest = async (): Promise<RawHttpResponse> => {
    if (request.path === "/bridge/v2/manifest") {
      if (request.method !== "GET") {
        return response(
          405,
          "Method Not Allowed",
          hostBridgeError(
            "method_not_allowed",
            "Manifest endpoint only supports GET",
            "routing",
            { allow: "GET" },
          ),
          "method_not_allowed",
        );
      }
      try {
        return response(200, "OK", hostBridgeOk(manifest(request)));
      } catch (error) {
        if (error instanceof HostBridgeCursorError) {
          return paginationErrorResponse(error);
        }
        throw error;
      }
    }

    if (request.path === "/bridge/v2/diagnostics/profile") {
      return inspectProfile(request, transportContext);
    }

    if (request.path === "/bridge/v2/diagnostics/profile/diagnose") {
      return diagnoseProfile(request);
    }

    if (request.path === "/bridge/v2/diagnostics/backends") {
      return listBackends(request);
    }

    if (request.path.startsWith("/bridge/v2/diagnostics/backends/")) {
      return getBackendStatus(request);
    }

    if (request.path === "/bridge/v2/call") {
      return callCapability(request, transportContext);
    }

    if (request.path === "/bridge/v2/context/current") {
      return getCurrentContext(request);
    }

    if (request.path === "/bridge/v2/context/selection") {
      return getCurrentSelection(request);
    }

    if (request.path === "/bridge/v2/context/selection/open") {
      return openContextSelection(request);
    }

    if (request.path === "/bridge/v2/context/items/open") {
      return openContextItem(request);
    }

    if (request.path === "/bridge/v2/context/collections/open") {
      return openContextCollection(request);
    }

    if (request.path === "/bridge/v2/context/notes/open") {
      return openContextNote(request);
    }

    if (request.path === "/bridge/v2/workflows") {
      return listWorkflows(request);
    }

    if (request.path === "/bridge/v2/workflows/describe") {
      return describeWorkflow(request);
    }

    if (request.path === "/bridge/v2/workflows/provider-profiles") {
      return listProviderProfiles(request);
    }

    if (request.path === "/bridge/v2/workflows/provider-profiles/describe") {
      return describeProviderProfile(request);
    }

    if (request.path === "/bridge/v2/workflows/provider-profiles/validate") {
      return validateProviderProfile(request);
    }

    if (request.path === "/bridge/v2/workflows/provider-profiles/refresh") {
      return refreshProviderProfile(request);
    }

    if (request.path === "/bridge/v2/workflows/defaults") {
      return workflowDefaults(request);
    }

    if (request.path === "/bridge/v2/workflows/validate") {
      return validateWorkflow(request);
    }

    if (request.path === "/bridge/v2/workflows/requirements") {
      return workflowRequirements(request);
    }

    if (request.path === "/bridge/v2/workflows/submit") {
      return submitWorkflow(request);
    }

    if (request.path === "/bridge/v2/workflows/queue") {
      return listWorkflowQueue(request);
    }

    if (
      request.path.startsWith("/bridge/v2/workflows/queue/") &&
      request.path.endsWith("/cancel")
    ) {
      return cancelWorkflowQueueUnit(request);
    }

    if (request.path.startsWith("/bridge/v2/workflows/submissions/")) {
      return getWorkflowSubmission(request);
    }

    if (request.path === "/bridge/v2/workflows/agent-run") {
      return agentRunWorkflow(request);
    }

    if (
      request.path.startsWith("/bridge/v2/workflows/agent-runs/") &&
      request.path.endsWith("/apply")
    ) {
      return applyAgentRunWorkflow(request);
    }

    if (
      request.path.startsWith("/bridge/v2/workflows/agent-runs/") &&
      request.path.endsWith("/renew")
    ) {
      return changeAgentRunWorkflowLifecycle(request, "renew");
    }

    if (
      request.path.startsWith("/bridge/v2/workflows/agent-runs/") &&
      request.path.endsWith("/abandon")
    ) {
      return changeAgentRunWorkflowLifecycle(request, "abandon");
    }

    if (
      request.path.startsWith("/bridge/v2/workflows/runs/") &&
      request.path.endsWith("/cancel")
    ) {
      return cancelWorkflowRun(request);
    }

    if (request.path === "/bridge/v2/workflows/runs") {
      return listWorkflowRuns(request);
    }

    if (request.path.startsWith("/bridge/v2/workflows/runs/")) {
      return getWorkflowRun(request);
    }

    if (request.path === "/bridge/v2/tasks/active") {
      return listActiveTasks(request);
    }

    if (request.path === "/bridge/v2/tasks/recent") {
      return listRecentTasks(request);
    }

    if (request.path === "/bridge/v2/tasks") {
      return listTasks(request);
    }

    if (request.path === "/bridge/v2/permissions/pending") {
      return listPendingPermissions(request);
    }

    if (request.path.startsWith("/bridge/v2/permissions/")) {
      return getPermission(request);
    }

    if (request.path === "/bridge/v2/notifications") {
      return listNotifications(request);
    }

    if (request.path === "/bridge/v2/notifications/ack") {
      return ackNotifications(request);
    }

    if (request.path === "/bridge/v2/skill-runs/recent") {
      return listRecentSkillRuns(request);
    }

    if (request.path.startsWith("/bridge/v2/skill-runs/")) {
      return handleSkillRun(request);
    }

    if (request.path === "/bridge/v2/synthesis/cache/status") {
      return getSynthesisCacheStatus(request, transportContext);
    }

    if (request.path === "/bridge/v2/synthesis/cache/invalidate") {
      return invalidateSynthesisCache(request);
    }

    if (request.path === "/bridge/v2/synthesis/index/status") {
      return getSynthesisIndexStatus(request);
    }

    if (request.path === "/bridge/v2/files/upload") {
      return uploadFile(request);
    }

    if (request.path.startsWith("/bridge/v2/files/")) {
      return downloadFile(request);
    }

    return response(
      404,
      "Not Found",
      hostBridgeError("not_found", "Host Bridge route not found", "not_found"),
      "not_found",
    );
  };

  let result: RawHttpResponse;
  try {
    result = await dispatchAuthorizedRequest();
  } catch (error) {
    if (operationReserved) {
      markHostBridgeOperationOutcomeUnknown(operationId);
    }
    throw error;
  }
  if (operationReserved) {
    const completed = operationResponseFromRaw(result);
    if (completed) {
      completeHostBridgeOperation({ operationId, response: completed });
    } else {
      markHostBridgeOperationOutcomeUnknown(operationId);
    }
  }
  return result;
}

async function handleHttpRequest(
  request: HttpRequest,
  transportContext: HostBridgeTransportContext,
) {
  trustedTransportContexts.set(request, transportContext);
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    const requestId = performanceProfileRequestIdForHostRequest(request);
    const operationClass = hostOperationClass(request);
    const startedAt = readAcpRuntimePerformanceClockMs();
    observeAcpRuntimeGauge(
      requestId,
      "host_request_inflight",
      { operationClass },
      1,
    );
    try {
      const result = await handleHttpRequestImpl(request, transportContext);
      const responseBytes =
        result.kind === "memory"
          ? result.wireByteLength
          : utf8ByteLength(result.headers) + result.source.size;
      incrementAcpRuntimeMetric(
        requestId,
        "host_response_bytes",
        { operationClass },
        responseBytes,
      );
      return result;
    } finally {
      observeAcpRuntimeGauge(
        requestId,
        "host_request_inflight",
        { operationClass },
        0,
      );
      observeAcpRuntimeDuration(
        requestId,
        "host_request_duration",
        { operationClass },
        readAcpRuntimePerformanceClockMs() - startedAt,
      );
    }
  }
  return handleHttpRequestImpl(request, transportContext);
}

function recordHostInputMetrics(
  input: HostHttpRequestReadStats,
  request: HttpRequest | null,
) {
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    const requestId = request
      ? performanceProfileRequestIdForHostRequest(request)
      : null;
    incrementAcpRuntimeMetric(
      requestId,
      "host_input_bytes",
      {},
      input.inputBytes,
    );
    incrementAcpRuntimeMetric(
      requestId,
      "host_input_fragment",
      {},
      input.fragments,
    );
    incrementAcpRuntimeMetric(requestId, "host_input_wait", {}, input.waits);
    observeAcpRuntimeDuration(
      requestId,
      "host_input_duration",
      {},
      input.durationMs,
    );
    observeAcpRuntimeDuration(
      requestId,
      "host_input_callback_max_duration",
      {},
      input.maxCallbackDurationMs,
    );
  }
}

function statsForReadResult(
  input: HostHttpRequestReadResult,
): HostHttpRequestReadStats {
  return {
    inputBytes: input.bytes.byteLength,
    headerBytes: input.headerBytes,
    bodyBytes: input.bodyBytes,
    contentLength: input.contentLength,
    fragments: input.fragments,
    waits: input.waits,
    durationMs: input.durationMs,
    maxCallbackDurationMs: input.maxCallbackDurationMs,
  };
}

function beginProfiledHostBridgeRequestRead(
  inputStream: any,
): ProfiledHostBridgeRequestReadOperation {
  const requestRead = beginHostHttpRequestRead(inputStream);
  return {
    abort: requestRead.abort,
    completion: requestRead.completion.then(
      (input) => {
        const request = parseHttpRequestBytes(input.bytes);
        recordHostInputMetrics(statsForReadResult(input), request);
        return request;
      },
      (error) => {
        if (error instanceof HostHttpRequestReadError) {
          recordHostInputMetrics(error.stats, null);
        }
        throw error;
      },
    ),
  };
}

async function readProfiledHostBridgeRequest(inputStream: any) {
  return beginProfiledHostBridgeRequestRead(inputStream).completion;
}

function requestReadErrorResponse(error: HostHttpRequestReadError) {
  const details = { readerCode: error.code };
  switch (error.code) {
    case "header_too_large":
      return response(
        431,
        "Request Header Fields Too Large",
        hostBridgeError("bad_request", error.message, "validation", details),
      );
    case "body_too_large":
      return response(
        413,
        "Payload Too Large",
        hostBridgeError(
          "request_body_too_large",
          error.message,
          "validation",
          details,
        ),
      );
    case "idle_timeout":
    case "total_timeout":
      return response(
        408,
        "Request Timeout",
        hostBridgeError("bad_request", error.message, "connection", details),
      );
    case "invalid_content_length":
    case "transfer_encoding_unsupported":
    case "invalid_framing":
    case "early_eof":
      return response(
        400,
        "Bad Request",
        hostBridgeError("bad_request", error.message, "protocol", details),
      );
    case "async_stream_unavailable":
    case "read_failed":
      return response(
        500,
        "Internal Server Error",
        hostBridgeError("internal_error", error.message, "internal", details),
        error.message,
      );
    case "aborted":
      return null;
  }
}

function closeOutputOnce(connection: AcceptedHostConnection) {
  if (connection.outputClosed) return;
  connection.outputClosed = true;
  try {
    connection.outputStream?.close?.();
  } catch {
    // Best-effort accepted-connection cleanup.
  }
}

function closeTransportOnce(connection: AcceptedHostConnection) {
  if (connection.transportClosed) return;
  connection.transportClosed = true;
  try {
    connection.transport?.close?.(0);
  } catch {
    // Best-effort accepted-connection cleanup.
  }
}

function abortAcceptedConnection(connection: AcceptedHostConnection) {
  connection.requestRead.abort();
  connection.responseTransfer?.abort();
  closeOutputOnce(connection);
  closeTransportOnce(connection);
  acceptedConnections.delete(connection);
}

function releaseAcceptedConnection(connection: AcceptedHostConnection) {
  acceptedConnections.delete(connection);
}

function closeAllAcceptedConnections() {
  for (const connection of [...acceptedConnections]) {
    abortAcceptedConnection(connection);
  }
}

async function processAcceptedConnection(connection: AcceptedHostConnection) {
  let responseWriteStarted = false;
  try {
    const request = await connection.requestRead.completion;
    if (connection.generation !== serverGeneration) {
      return;
    }
    const rawResponse = await handleHttpRequest(
      request,
      connection.transportContext,
    );
    if (connection.generation !== serverGeneration) {
      return;
    }
    responseWriteStarted = true;
    await writeOutputStream(
      connection.outputStream,
      rawResponse,
      (transfer) => {
        connection.responseTransfer = transfer;
      },
    );
    connection.responseTransfer = undefined;
    connection.outputClosed = true;
    clearConnectionInitializationError();
  } catch (error) {
    if (connection.generation !== serverGeneration || responseWriteStarted) {
      return;
    }
    const rawResponse =
      error instanceof HostHttpRequestReadError
        ? requestReadErrorResponse(error)
        : response(
            500,
            "Internal Server Error",
            hostBridgeError(
              "internal_error",
              "Host Access request failed",
              "internal",
            ),
            errorMessage(error),
          );
    if (rawResponse) {
      try {
        responseWriteStarted = true;
        await writeOutputStream(connection.outputStream, rawResponse);
        connection.outputClosed = true;
      } catch {
        // The peer may already be closed; cleanup remains local to this request.
      }
    }
  } finally {
    if (connection.outputClosed) {
      releaseAcceptedConnection(connection);
    } else {
      abortAcceptedConnection(connection);
    }
  }
}

function rejectStaleTransport(transport: any) {
  try {
    transport?.close?.(0);
  } catch {
    // Best-effort stale transport cleanup.
  }
}

function listen(serverSocket: any, generation: number) {
  const listener = {
    onSocketAccepted: (_socket: any, transport: any) => {
      if (generation !== serverGeneration) {
        rejectStaleTransport(transport);
        return;
      }
      let inputStream: any;
      let outputStream: any;
      let requestRead: ProfiledHostBridgeRequestReadOperation | undefined;
      try {
        outputStream = transport.openOutputStream(0, 0, 0);
        inputStream = transport.openInputStream(0, 0, 0);
        requestRead = beginProfiledHostBridgeRequestRead(inputStream);
        const connection: AcceptedHostConnection = {
          generation,
          transport,
          transportContext: transportContextFromAcceptedTransport(transport),
          outputStream,
          requestRead,
          outputClosed: false,
          transportClosed: false,
        };
        acceptedConnections.add(connection);
        void processAcceptedConnection(connection);
      } catch (error) {
        requestRead?.abort();
        if (!requestRead) {
          try {
            inputStream?.close?.();
          } catch {
            // Best-effort failed-accept cleanup.
          }
        }
        try {
          outputStream?.close?.();
        } catch {
          // Best-effort failed-accept cleanup.
        }
        rejectStaleTransport(transport);
        updateState({
          lastError: `${CONNECTION_INITIALIZATION_ERROR_PREFIX}${errorMessage(
            error,
          )}`,
        });
      }
    },
    onStopListening: () => {
      if (
        generation !== serverGeneration ||
        state.serverSocket !== serverSocket
      ) {
        return;
      }
      if (state.status === "running") {
        const reason =
          "Host Bridge socket stopped unexpectedly; attempting restart.";
        updateState({
          status: "stopped",
          serverSocket: null,
          lastRecoveryReason: reason,
        });
        scheduleHostBridgeRecovery(reason);
      }
    },
  };
  serverSocket.asyncListen(listener);
}

async function publishWellKnownProfileAfterListen(args: {
  config: HostBridgeStartConfig;
  port: number;
  portMode: HostBridgePortMode;
  token: string;
}) {
  if (
    args.config.lanEnabled &&
    (args.portMode !== "pinned" || args.port !== args.config.pinnedPort)
  ) {
    throw new Error(
      "Refusing to publish Host Bridge LAN profile for a non-pinned endpoint",
    );
  }
  const result = await writeHostBridgeWellKnownProfile({
    endpoint: buildLocalProfileEndpoint(args.config.bindMode, args.port),
    token: args.token,
    updatedAt: state.updatedAt,
  });
  if (!result.ok) {
    updateState({
      lastError: `Host Bridge well-known profile was not written: ${result.reason}`,
    });
  }
}

async function startServer() {
  recoverHostBridgeOperationStoreAfterRestart();
  recoverHostBridgeAgentRunStoreAfterRestart();
  const config = resolveHostBridgeStartConfig();
  updateState({
    status: "starting",
    host: config.host,
    bindMode: config.bindMode,
    lanEnabled: config.lanEnabled,
    pinPortEnabled: config.pinPortEnabled,
    pinnedPort: config.pinnedPort,
    portMode: config.initialPortMode,
    lastError: "",
  });

  let lastError: unknown;
  let portMode: HostBridgePortMode = config.initialPortMode;
  let recoveryReason = state.lastRecoveryReason;
  const tryBind = async (port: number, mode: HostBridgePortMode) => {
    const serverSocket = createConfiguredServerSocket(port, config.bindMode);
    const token = getHostBridgeToken();
    const generation = ++serverGeneration;
    listen(serverSocket, generation);
    updateState({
      status: "running",
      host: config.host,
      port,
      endpoint: buildEndpoint(config.host, port),
      token,
      serverSocket,
      bindMode: config.bindMode,
      lanEnabled: config.lanEnabled,
      pinPortEnabled: config.pinPortEnabled,
      pinnedPort: config.pinnedPort,
      portMode: mode,
      lastRecoveryReason: recoveryReason,
      lastError: "",
    });
    await publishWellKnownProfileAfterListen({
      config,
      port,
      portMode: mode,
      token,
    });
    return getHostBridgeServerStatus();
  };

  if (config.pinPortEnabled) {
    try {
      return await tryBind(config.pinnedPort, "pinned");
    } catch (error) {
      if (config.lanEnabled) {
        const message =
          error instanceof Error
            ? error.message
            : String(error || "Pinned Host Bridge LAN port was unavailable");
        recoveryReason =
          "Pinned Host Bridge LAN port is unavailable; LAN mode requires a fixed port.";
        updateState({
          status: "error",
          pinPortEnabled: true,
          portMode: "pinned",
          lastRecoveryReason: recoveryReason,
          lastError: message,
        });
        scheduleHostBridgeRecovery(message);
        throw new Error(message);
      }
      lastError = error;
      portMode = "fallback";
      setPref("hostBridgePinPortEnabled", false);
      recoveryReason =
        "Pinned Host Bridge port was unavailable; pin port was disabled and a random port was selected.";
      updateState({
        pinPortEnabled: false,
        portMode,
        lastRecoveryReason: recoveryReason,
      });
    }
  }

  const startPort = pickStartPort();
  for (let offset = 0; offset < PORT_SPAN; offset += 1) {
    const port = PORT_MIN + ((startPort - PORT_MIN + offset) % PORT_SPAN);
    try {
      return await tryBind(port, portMode);
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : String(lastError || "Failed to start Host Bridge server");
  updateState({
    status: "error",
    lastError: message,
  });
  scheduleHostBridgeRecovery(message);
  throw new Error(message);
}

export async function ensureHostBridgeServer() {
  if (state.status === "running" && state.endpoint && state.token) {
    return getHostBridgeServerStatus();
  }
  if (!startingPromise) {
    startingPromise = startServer().finally(() => {
      startingPromise = null;
    });
  }
  return startingPromise;
}

export async function shutdownHostBridgeServer() {
  controlledShutdown = true;
  clearRecoveryTimer();
  serverGeneration += 1;
  try {
    state.serverSocket?.close?.();
  } catch {
    // Best-effort shutdown.
  }
  closeAllAcceptedConnections();
  state = createEmptyState("stopped");
  startingPromise = null;
  controlledShutdown = false;
}

export async function restartHostBridgeServer() {
  await shutdownHostBridgeServer();
  return ensureHostBridgeServer().catch((error) => {
    updateState({
      status: "error",
      lastError: errorMessage(error),
    });
    scheduleHostBridgeRecovery(errorMessage(error));
    return getHostBridgeServerStatus();
  });
}

export function startHostBridgeSupervisor() {
  supervisorEnabled = true;
  controlledShutdown = false;
  updateState({ supervised: true });
  ensureSupervisorTimer();
  void ensureHostBridgeServer().catch((error) => {
    updateState({
      status: "error",
      lastError: errorMessage(error),
    });
    scheduleHostBridgeRecovery(errorMessage(error));
  });
  return getHostBridgeServerStatus();
}

export async function stopHostBridgeSupervisor() {
  supervisorEnabled = false;
  controlledShutdown = true;
  clearRecoveryTimer();
  clearSupervisorTimer();
  serverGeneration += 1;
  try {
    state.serverSocket?.close?.();
  } catch {
    // Best-effort shutdown.
  }
  closeAllAcceptedConnections();
  state = createEmptyState("stopped");
  startingPromise = null;
  controlledShutdown = false;
}

export function rotateHostBridgeToken() {
  const rotated = rotateStoredHostBridgeToken();
  updateState({
    token: rotated.token,
  });
  if (state.status === "running" && state.endpoint) {
    void writeHostBridgeWellKnownProfile({
      endpoint: buildLocalProfileEndpoint(state.bindMode, state.port),
      token: rotated.token,
      updatedAt: rotated.rotatedAt,
    });
  }
  return rotated;
}

export async function rotateHostBridgeMasterToken() {
  return rotateStoredHostBridgeMasterToken();
}

export async function readHostBridgeMasterTokenForCopy() {
  return readHostBridgeMasterToken();
}

export async function buildHostBridgeRemoteCliProfileForCopy() {
  const masterToken = await readHostBridgeMasterToken();
  if (!masterToken.ok) {
    return masterToken;
  }
  const server = getHostBridgeServerStatus();
  const endpoint =
    server.remoteEndpoint ||
    buildEndpoint(getAdvertisedHost(), server.port || getPinnedPort());
  return {
    ok: true as const,
    endpoint,
    token: masterToken.token,
    profile: {
      schema: "zotero-bridge.profile.v1",
      protocol: HOST_BRIDGE_PROTOCOL_VERSION,
      endpoint,
      connectionMode: "remote",
      auth: {
        type: "bearer",
        token: masterToken.token,
      },
      source: "manual-remote",
      updatedAt: new Date().toISOString(),
    },
  };
}

export function getHostBridgeServerStatus(): HostBridgeStatusSnapshot {
  const token = state.token || String(getPref("hostBridgeToken") || "");
  const masterToken = getHostBridgeMasterTokenStatus();
  const advertisedHost = getAdvertisedHost();
  const advertisedHostSource = getAdvertisedHostSource();
  const remoteEndpoint = buildRemoteEndpoint(state.port || getPinnedPort());
  const localEndpoint =
    buildLocalClientEndpoint(state.bindMode, state.port) || state.endpoint;
  const accessRoutes = hostAccessRoutes(state.bindMode, state.port);
  return {
    status: state.status,
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    host: state.host,
    port: state.port,
    endpoint: localEndpoint,
    remoteEndpoint,
    advertisedHost,
    advertisedHostSource,
    advertisedHostDiagnostics:
      advertisedHostSource === "placeholder"
        ? [
            "hostBridgeAdvertisedHost is empty; remote endpoint uses placeholder",
          ]
        : [],
    remoteEndpointUsesPlaceholder: advertisedHost === "<zotero-host-ip>",
    bindMode: state.bindMode,
    lanEnabled: state.lanEnabled,
    portMode: state.portMode,
    pinPortEnabled: getEffectivePinPortEnabled(state.lanEnabled),
    pinnedPort: getPinnedPort(),
    supervised: supervisorEnabled,
    restartCount: state.restartCount,
    lastRecoveryReason: state.lastRecoveryReason,
    authRequired: true,
    tokenMasked: redactHostBridgeToken(token),
    masterTokenConfigured: masterToken.configured,
    masterTokenMasked: masterToken.tokenMasked,
    masterTokenUpdatedAt: masterToken.updatedAt,
    lastRequestMethod: state.lastRequestMethod,
    lastResponseStatus: state.lastResponseStatus,
    lastError: state.lastError,
    requestCount: state.requestCount,
    updatedAt: state.updatedAt,
    ...accessRoutes,
  };
}

export function resetHostBridgeServerForTests() {
  void shutdownHostBridgeServer();
  supervisorEnabled = false;
  controlledShutdown = false;
  clearRecoveryTimer();
  clearSupervisorTimer();
  state = createEmptyState("idle");
  startingPromise = null;
  serverSocketFactory = createServerSocket;
  synthesisServiceResolverForTests = undefined;
  acceptedConnections.clear();
  resetHostBridgeWriteAutoApprovalScopesForTests();
  resetHostBridgeAgentRunStoreForTests();
  resetHostBridgeOperationStoreForTests();
  hostBridgeTestOperationSequence = 0;
}

export function configureHostBridgeServerForTests(
  args: {
    token?: string;
    endpoint?: string;
    lanEnabled?: boolean;
    portMode?: HostBridgePortMode;
    resolveSynthesisService?: () => SynthesisMcpService;
  } = {},
) {
  const lanEnabled = args.lanEnabled === true;
  const bindMode = bindModeFromLanEnabled(lanEnabled);
  const host = hostFromBindMode(bindMode);
  const token = args.token || getHostBridgeToken();
  updateState({
    status: "running",
    host,
    port: 0,
    endpoint: args.endpoint || buildEndpoint(host, 0),
    token,
    bindMode,
    lanEnabled,
    portMode: args.portMode || "random",
    pinPortEnabled: getPinPortEnabled(),
    pinnedPort: getPinnedPort(),
    lastError: "",
  });
  synthesisServiceResolverForTests = args.resolveSynthesisService;
  return token;
}

export const hostBridgeServerInternalsForTests = {
  constants: {
    PORT_MIN,
    PORT_SPAN,
    PINNED_PORT_DEFAULT,
    PINNED_PORT_MIN,
    PINNED_PORT_MAX,
    RECOVERY_DELAY_MS,
    SUPERVISOR_INTERVAL_MS,
  },
  readProfiledHostBridgeRequest,
  getAcceptedConnectionCount() {
    return acceptedConnections.size;
  },
  parseHttpRequestBytes,
  setServerSocketFactory(
    factory?: (port: number, bindMode: HostBridgeBindMode) => any,
  ) {
    serverSocketFactory = factory || createServerSocket;
  },
  scheduleRecovery(reason: string) {
    scheduleHostBridgeRecovery(reason);
  },
  redactDiagnosticText,
};

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

let hostBridgeTestOperationSequence = 0;

function ensureTestOperationId(request: HttpRequest, disabled: boolean) {
  if (
    !disabled &&
    request.method !== "GET" &&
    !request.headers["x-zotero-bridge-operation-id"]
  ) {
    hostBridgeTestOperationSequence += 1;
    request.headers["x-zotero-bridge-operation-id"] =
      `test-operation-${hostBridgeTestOperationSequence}`;
  }
  return request;
}

export async function handleHostBridgeHttpRequestForTests(args: {
  method: string;
  path: string;
  headers?: Record<string, unknown>;
  body?: string;
  rawRequestBytes?: Uint8Array;
  peerHost?: string;
  peerPort?: number;
  disableAutomaticOperationId?: boolean;
}) {
  const transportContext = transportContextFromAcceptedTransport({
    host: args.peerHost === undefined ? "127.0.0.1" : args.peerHost,
    port: args.peerPort === undefined ? 1 : args.peerPort,
  });
  if (args.rawRequestBytes) {
    const request = ensureTestOperationId(
      parseHttpRequestBytes(args.rawRequestBytes),
      args.disableAutomaticOperationId === true,
    );
    const raw = await handleHttpRequest(request, transportContext);
    if (raw.kind === "memory") {
      return `${raw.headers}${new TextDecoder().decode(raw.bodyBytes)}`;
    }
    const bytes = await collectRuntimeFileSourceBytesForTests(raw.source);
    return `${raw.headers}${bytesToBinaryString(bytes)}`;
  }
  const parsedPath = parseTestPath(args.path || "/");
  const body = args.body || "";
  const request: HttpRequest = {
    method: String(args.method || "GET").toUpperCase(),
    path: parsedPath.path,
    query: parsedPath.query,
    headers: normalizeTestHeaders(args.headers),
    body,
    bodyBytes: new TextEncoder().encode(body),
    bodyByteLength: utf8ByteLength(body),
    parseError: parsedPath.parseError,
  };
  const raw = await handleHttpRequest(
    ensureTestOperationId(request, args.disableAutomaticOperationId === true),
    transportContext,
  );
  if (raw.kind === "memory") {
    return `${raw.headers}${new TextDecoder().decode(raw.bodyBytes)}`;
  }
  const bytes = await collectRuntimeFileSourceBytesForTests(raw.source);
  return `${raw.headers}${bytesToBinaryString(bytes)}`;
}
