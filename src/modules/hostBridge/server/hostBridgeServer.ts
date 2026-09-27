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
  isCanonicalMutationProjectionCapability,
  listHostBridgeCapabilities,
} from "../../hostBridgeCapabilityRegistry";
import {
  SynthesisClientError,
  type SynthesisClient,
} from "../../../../packages/synthesis-contracts/src/index";
import type { DirectResearchBundleApplication } from "../workflow/researchBundleService";
import type {
  JsonObject,
  MutationPreviewResult,
} from "../../../workflows/types";
import { validateHostBridgeCapabilityInput } from "./hostBridgeCapabilityContract";
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
} from "../workflow/hostBridgeWorkflowControl";
import { getHostBridgeFileDownloadManifest } from "./hostBridgeFileRegistry";
import {
  collectRuntimeFileSourceBytesForTests,
  type RuntimeFileResponseTransfer,
} from "../../runtimeFileTransfer";
import {
  prepareRuntimeHttpResponse as buildHttpResponse,
  runtimeHttpBytesToBinaryString as bytesToBinaryString,
  writeRuntimeHttpResponse as writeOutputStream,
  type RuntimeHttpResponse as RawHttpResponse,
  type RuntimeMemoryResponseTransfer,
} from "./runtimeHttpResponse";
import { createSha256Accumulator } from "../../../utils/sha256";
import {
  completeHostBridgeOperation,
  getHostBridgeOperation,
  markHostBridgeOperationOutcomeUnknown,
  recoverHostBridgeOperationStoreAfterRestart,
  reserveHostBridgeOperation,
  resetHostBridgeOperationStoreForTests,
  type HostBridgeOperationResponse,
} from "./hostBridgeOperationStore";
import { recoverHostBridgeAgentRunStoreAfterRestart } from "../workflow/hostBridgeWorkflowAgentRunStore";
import {
  HostBridgePermissionError,
  getHostBridgePermissionProjection,
  listHostBridgePendingPermissions,
  parseHostBridgePermissionScope,
  requestHostBridgePermission,
} from "../permissions/hostBridgePermissionManager";
import type { HostBridgeNotificationFilters } from "./hostBridgeNotificationInbox";
import {
  isHostBridgeWriteAutoApprovalScope,
  resetHostBridgeWriteAutoApprovalScopesForTests,
} from "../permissions/hostBridgeWriteAutoApprovalRegistry";
import { isDebugModeEnabled } from "../../debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  observeAcpRuntimeGauge,
  readAcpRuntimePerformanceClockMs,
} from "../../acp/diagnostics/acpRuntimePerformanceProfiler";
import {
  resolveZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
} from "../../zoteroHostCapabilityBroker";
import { ZoteroLibraryCursorError } from "../../zoteroHost/zoteroLibraryPageQuery";
import { paginateHostBridgeRequestRows } from "./hostBridgePagination";
import { resetHostBridgeAgentRunStoreForTests } from "../workflow/hostBridgeWorkflowAgentRunStore";
import { registerBackgroundRefreshTimer } from "../../backgroundRefreshGovernance";
import {
  HOST_BRIDGE_CLI_SCHEMA,
  HOST_BRIDGE_PROTOCOL_VERSION,
  hostBridgeError,
  hostBridgeOk,
  type HostBridgeCallRequest,
  type HostBridgeBindMode,
  type HostBridgeHealth,
  type HostBridgeErrorCode,
  type HostBridgeResponse,
  type HostBridgeServiceStatus,
  type HostBridgeStatusSnapshot,
  type HostBridgePortMode,
  type HostBridgeConnectionMode,
  type HostBridgeAdvertisedHostSource,
} from "./hostBridgeProtocol";
import { writeHostBridgeWellKnownProfile } from "../cli/hostBridgeProfileStore";
import { getPref, setPref } from "../../../utils/prefs";
import {
  createCancellationController,
  type CancellationController,
  type CancellationSignal,
} from "../../../utils/wait";
import {
  beginHostHttpRequestRead,
  hostHttpUtf8ByteLength as utf8ByteLength,
  HostHttpRequestReadError,
  parseHostHttpJsonBody as parseJsonBody,
  parseHostHttpPath as parseTestPath,
  parseHostHttpRequestBytes as parseHttpRequestBytes,
  safeDecodeHostHttpPath as safeDecodeURIComponent,
  type HostHttpRequest as HttpRequest,
  type HostHttpRequestReadResult,
  type HostHttpRequestReadStats,
} from "./hostHttpRequestReader";
import type { HostBridgeRouteMatch } from "./hostBridgeRouteContract";
import {
  matchHostBridgeDiagnosticsRoute,
  redactHostBridgeDiagnosticText,
} from "./routes/hostBridgeDiagnosticsRoutes";
import { matchHostBridgeCapabilityRoute } from "./routes/hostBridgeCapabilityRoutes";
import { matchHostBridgeWorkflowActivityRoute } from "./routes/hostBridgeWorkflowActivityRoutes";
import { matchHostBridgeFileRoute } from "./routes/hostBridgeFileRoutes";
import { matchHostBridgeSynthesisRoute } from "./routes/hostBridgeSynthesisRoutes";

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
const MAX_ACCEPTED_CONNECTIONS = 16;
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

type HostBridgeTransportContext = {
  peerHost: string;
  peerPort: number;
  peerLocality: "local" | "remote" | "unknown";
};

const trustedTransportContexts = new WeakMap<
  HttpRequest,
  HostBridgeTransportContext
>();

type AcceptedHostConnection = {
  generation: number;
  transport: any;
  transportContext: HostBridgeTransportContext;
  outputStream: any;
  requestRead: ProfiledHostBridgeRequestReadOperation;
  requestControl: CancellationController;
  responseTransfer?:
    | RuntimeFileResponseTransfer
    | RuntimeMemoryResponseTransfer;
  outputClosed: boolean;
  transportClosed: boolean;
};

type ProfiledHostBridgeRequestReadOperation = {
  head: Promise<HttpRequest>;
  completion: Promise<HttpRequest>;
  continue: (maxBodyBytes: number) => void;
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
let synthesisClientResolverForTests:
  | (() => SynthesisClient | Promise<SynthesisClient>)
  | undefined = undefined;
let directResearchBundleApplicationResolverForTests:
  | (() =>
      | DirectResearchBundleApplication
      | Promise<DirectResearchBundleApplication>)
  | undefined = undefined;
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
  socket.init(port, bindMode === "loopback", MAX_ACCEPTED_CONNECTIONS);
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

function navigationScopeAllowed(request: HttpRequest) {
  const raw = String(request.headers["x-zotero-bridge-scope"] || "").trim();
  if (!raw) return true;
  const scope = parsePermissionScopeHeader(request);
  const kind = String(scope?.kind || "").trim();
  return kind === "global" || kind === "acp-chat";
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
    ? paginateHostBridgeRequestRows({
        request,
        scope: "bridge manifest",
        rows: capabilities,
      })
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

function requestWorkflowCallControl(request: HttpRequest) {
  const captured = (globalThis as any).Zotero?.getMainWindow?.();
  if (!captured) return request.signal ? { signal: request.signal } : undefined;
  return {
    ...(request.signal ? { signal: request.signal } : {}),
    target: {
      resolveAndValidate: () => {
        if (captured.closed || !captured.ZoteroPane) return null;
        return captured;
      },
    },
  };
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
      await import("../mcp/zoteroMcpServer");
    return handleZoteroMcpHostAccessRequest(
      request,
      getHostBridgeServerStatus(),
    );
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

  const routeMatch: HostBridgeRouteMatch | null =
    matchHostBridgeDiagnosticsRoute(request, {
      respond: response,
      getManifest: manifest,
      getHealth: health,
      getConnectionMode: () =>
        parseConnectionModeHeader(request, transportContext),
    }) ||
    matchHostBridgeCapabilityRoute(request, {
      respond: response,
      getStatus: getHostBridgeServerStatus,
      getConnectionMode: () =>
        parseConnectionModeHeader(request, transportContext),
      getOperationId: () => operationIdFromRequest(request),
      getPermissionScope: () => parsePermissionScopeHeader(request),
      navigationScopeAllowed: () => navigationScopeAllowed(request),
      getWorkflowCallControl: () => requestWorkflowCallControl(request),
      ...(synthesisClientResolverForTests
        ? { resolveSynthesisClient: synthesisClientResolverForTests }
        : {}),
      ...(directResearchBundleApplicationResolverForTests
        ? {
            resolveDirectResearchBundleApplication:
              directResearchBundleApplicationResolverForTests,
          }
        : {}),
    }) ||
    matchHostBridgeWorkflowActivityRoute(request, {
      respond: response,
      getPermissionScope: () => parsePermissionScopeHeader(request),
      permissionErrorResponse,
    }) ||
    matchHostBridgeSynthesisRoute(request, {
      respond: response,
      getCapabilityContext: () => ({
        getStatus: getHostBridgeServerStatus,
        connectionMode: parseConnectionModeHeader(request, transportContext),
        control: requestWorkflowCallControl(request),
        ...(synthesisClientResolverForTests
          ? { resolveSynthesisClient: synthesisClientResolverForTests }
          : {}),
        ...(directResearchBundleApplicationResolverForTests
          ? {
              resolveDirectResearchBundleApplication:
                directResearchBundleApplicationResolverForTests,
            }
          : {}),
      }),
      getPermissionScope: () => parsePermissionScopeHeader(request),
      permissionErrorResponse,
    }) ||
    matchHostBridgeFileRoute(request, {
      respond: response,
      maxUploadBytes: MAX_UPLOAD_BODY_BYTES,
      recordSuccessfulDownload: () =>
        updateState({ lastResponseStatus: 200, lastError: "" }),
    });

  if (!routeMatch) {
    return response(
      404,
      "Not Found",
      hostBridgeError("not_found", "Host Bridge route not found", "not_found"),
      "not_found",
    );
  }

  const operationId = operationIdFromRequest(request);
  let operationReserved = false;
  const stateChangingRequest = routeMatch.admission === "generic-operation";
  const canonicalMutationExecution =
    routeMatch.admission === "canonical-mutation";
  if (stateChangingRequest && !canonicalMutationExecution && !operationId) {
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
  if (!canonicalMutationExecution && (stateChangingRequest || operationId)) {
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

  const dispatchAuthorizedRequest = routeMatch.handle;

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
  deferBody = false,
): ProfiledHostBridgeRequestReadOperation {
  const requestRead = beginHostHttpRequestRead(inputStream, { deferBody });
  return {
    head: requestRead.head.then((input) => parseHttpRequestBytes(input.bytes)),
    abort: requestRead.abort,
    continue: requestRead.continue,
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
  connection.requestControl.abort();
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
    const headRequest = await connection.requestRead.head;
    headRequest.signal = connection.requestControl.signal;
    const isHealth = headRequest.path === "/bridge/v2/health";
    const recognizedPath =
      isBridgePath(headRequest.path) || isMcpPath(headRequest.path);
    const authValid =
      isHealth ||
      !recognizedPath ||
      (await isHostBridgeAuthorizationValid(headRequest.headers, state.token));
    if (headRequest.parseError || !recognizedPath || !authValid || isHealth) {
      void connection.requestRead.completion.catch(() => undefined);
      connection.requestRead.abort();
      const rawResponse = await handleHttpRequest(
        headRequest,
        connection.transportContext,
      );
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
      return;
    }
    connection.requestRead.continue(
      headRequest.path === "/bridge/v2/files/upload"
        ? MAX_UPLOAD_BODY_BYTES
        : MAX_REQUEST_BODY_BYTES,
    );
    const request = await connection.requestRead.completion;
    request.signal = connection.requestControl.signal;
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
      if (acceptedConnections.size >= MAX_ACCEPTED_CONNECTIONS) {
        rejectStaleTransport(transport);
        return;
      }
      let inputStream: any;
      let outputStream: any;
      let requestRead: ProfiledHostBridgeRequestReadOperation | undefined;
      const requestControl = createCancellationController();
      try {
        outputStream = transport.openOutputStream(0, 0, 0);
        inputStream = transport.openInputStream(0, 0, 0);
        requestRead = beginProfiledHostBridgeRequestRead(inputStream, true);
        const connection: AcceptedHostConnection = {
          generation,
          transport,
          transportContext: transportContextFromAcceptedTransport(transport),
          outputStream,
          requestRead,
          requestControl,
          outputClosed: false,
          transportClosed: false,
        };
        acceptedConnections.add(connection);
        void processAcceptedConnection(connection);
      } catch (error) {
        requestControl.abort();
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
  synthesisClientResolverForTests = undefined;
  directResearchBundleApplicationResolverForTests = undefined;
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
    resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
    resolveDirectResearchBundleApplication?: () =>
      | DirectResearchBundleApplication
      | Promise<DirectResearchBundleApplication>;
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
  synthesisClientResolverForTests = args.resolveSynthesisClient;
  directResearchBundleApplicationResolverForTests =
    args.resolveDirectResearchBundleApplication;
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
    MAX_ACCEPTED_CONNECTIONS,
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
  redactDiagnosticText: redactHostBridgeDiagnosticText,
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
  signal?: CancellationSignal;
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
    if (args.signal) {
      request.signal = args.signal;
    }
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
  if (args.signal) {
    request.signal = args.signal;
  }
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
