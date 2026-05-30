import {
  getHostBridgeToken,
  isHostBridgeAuthorizationValid,
  redactHostBridgeToken,
  rotateHostBridgeToken as rotateStoredHostBridgeToken,
} from "./hostBridgeAuth";
import {
  getHostBridgeCapability,
  listHostBridgeCapabilities,
} from "./hostBridgeCapabilityRegistry";
import {
  getHostBridgeWorkflowControlManifest,
  getHostBridgeWorkflowRunStatus,
  listHostBridgeTasks,
  listHostBridgeWorkflows,
  submitHostBridgeWorkflow,
  type HostBridgeTaskFilters,
  type HostBridgeWorkflowSubmitRequest,
} from "./hostBridgeWorkflowControl";
import {
  getHostBridgeFileDownloadManifest,
  HostBridgeFileRegistryError,
  resolveHostBridgeFileDownload,
} from "./hostBridgeFileRegistry";
import {
  HostBridgePermissionError,
  parseHostBridgePermissionScope,
  requestHostBridgePermission,
} from "./hostBridgePermissionManager";
import {
  isHostBridgeWriteAutoApprovalScope,
  resetHostBridgeWriteAutoApprovalScopesForTests,
} from "./hostBridgeWriteAutoApprovalRegistry";
import {
  HOST_BRIDGE_PROTOCOL_VERSION,
  hostBridgeError,
  hostBridgeOk,
  type HostBridgeCallRequest,
  type HostBridgeBindMode,
  type HostBridgeHealth,
  type HostBridgeManifest,
  type HostBridgeResponse,
  type HostBridgeServiceStatus,
  type HostBridgeStatusSnapshot,
  type HostBridgePortMode,
} from "./hostBridgeProtocol";
import { writeHostBridgeWellKnownProfile } from "./hostBridgeProfileStore";
import { getPref, setPref } from "../utils/prefs";

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

type HttpRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  parseError?: string;
};

type HttpResponseArgs = {
  status: number;
  reason: string;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
};

type RawHttpResponse =
  | string
  | {
      text: string;
      binary: true;
    };

let supervisorEnabled = false;
let controlledShutdown = false;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
let supervisorTimer: ReturnType<typeof setInterval> | null = null;
let serverSocketFactory: (port: number, bindMode: HostBridgeBindMode) => any =
  createServerSocket;
let state: HostBridgeServerState = createEmptyState("idle");
let startingPromise: Promise<HostBridgeStatusSnapshot> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function getLanEnabled() {
  return getPref("hostBridgeLanEnabled") === true;
}

function getPinPortEnabled() {
  return getPref("hostBridgePinPortEnabled") === true;
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
  const pinPortEnabled = getPinPortEnabled();
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

function updateState(partial: Partial<HostBridgeServerState>) {
  state = {
    ...state,
    ...partial,
    supervised: supervisorEnabled,
    updatedAt: nowIso(),
  };
}

function buildEndpoint(host: string, port: number) {
  return `http://${host}:${port}/bridge/v1`;
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

function parseHttpRequest(raw: string): HttpRequest {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
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
  return {
    method: method.toUpperCase(),
    path: parsedPath.path,
    query: parsedPath.query,
    headers,
    body,
    parseError: parsedPath.parseError,
  };
}

function tryParseHeaders(text: string) {
  const splitIndex = text.indexOf("\r\n\r\n");
  if (splitIndex < 0) {
    return null;
  }
  const headerText = text.slice(0, splitIndex);
  const body = text.slice(splitIndex + 4);
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
  return {
    body,
    contentLength: Number(headers["content-length"] || 0),
  };
}

function isClosedStreamError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("NS_BASE_STREAM_CLOSED") || message.includes("0x80470002")
  );
}

function readInputStream(inputStream: any) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const factory = classes?.["@mozilla.org/scriptableinputstream;1"];
  const nsIScriptableInputStream = interfaces?.nsIScriptableInputStream;
  if (!factory || !nsIScriptableInputStream) {
    throw new Error("Zotero scriptable input stream is unavailable");
  }
  const stream = factory.createInstance(nsIScriptableInputStream);
  stream.init(inputStream);
  let text = "";
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
      const parsed = tryParseHeaders(text);
      if (parsed && parsed.body.length >= parsed.contentLength) {
        break;
      }
      continue;
    }
    text += stream.read(available);
    const parsed = tryParseHeaders(text);
    if (parsed && parsed.body.length >= parsed.contentLength) {
      break;
    }
  }
  stream.close?.();
  return text;
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function parsePermissionScopeHeader(request: HttpRequest) {
  const raw = String(request.headers["x-zotero-bridge-scope"] || "").trim();
  if (!raw) {
    return null;
  }
  try {
    return parseHostBridgePermissionScope(JSON.parse(raw));
  } catch {
    return null;
  }
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

  if (operation === "literature.ingest") {
    if ("papers" in request) {
      throw new Error(
        "literature ingest accepts a single paper payload; papers is not supported",
      );
    }
    const paper = isRecord(request.paper) ? request.paper : {};
    const title = cleanPromptText(paper.title) || "one literature paper";
    const identifiers = [
      cleanPromptText(paper.doi) ? `DOI: ${cleanPromptText(paper.doi)}` : "",
      cleanPromptText(paper.arxiv)
        ? `arXiv: ${cleanPromptText(paper.arxiv)}`
        : "",
      cleanPromptText(paper.pmid) ? `PMID: ${cleanPromptText(paper.pmid)}` : "",
      cleanPromptText(paper.isbn) ? `ISBN: ${cleanPromptText(paper.isbn)}` : "",
    ].filter(Boolean);
    const pdfLine = cleanPromptText(paper.pdfUrl)
      ? "PDF: best-effort attachment requested."
      : "PDF: no public PDF URL provided.";
    return {
      title: "Approve Zotero literature ingest?",
      summary: "Ingest one literature paper into Zotero.",
      detail: [
        "Action: create or update one Zotero literature record.",
        `Paper: ${title}.`,
        identifiers.length ? `Identifier: ${identifiers.join("; ")}.` : "",
        pdfLine,
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

function buildCapabilityApprovalPrompt(
  capability: NonNullable<ReturnType<typeof getHostBridgeCapability>>,
  input: unknown,
) {
  if (capability.name === "mutation.execute") {
    return buildMutationApprovalPrompt(input);
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

function writeOutputStream(outputStream: any, response: RawHttpResponse) {
  if (typeof response !== "string") {
    outputStream.write(response.text, response.text.length);
    outputStream.close?.();
    return;
  }
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
    return;
  }
  outputStream.write(response, response.length);
  outputStream.close?.();
}

function buildHttpResponse(args: HttpResponseArgs) {
  const bodyText =
    typeof args.body === "string" ? args.body : JSON.stringify(args.body);
  return [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    `Content-Type: ${args.contentType || "application/json"}; charset=utf-8`,
    `Content-Length: ${utf8ByteLength(bodyText)}`,
    ...Object.entries(args.headers || {}).map(
      ([name, value]) => `${name}: ${value}`,
    ),
    "Connection: close",
    "",
    bodyText,
  ].join("\r\n");
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
  return String(filename || "download.bin").replace(/["\r\n]/g, "_");
}

function buildFileHttpResponse(args: {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const bodyText = bytesToBinaryString(args.bytes);
  return {
    text: [
      "HTTP/1.1 200 OK",
      `Content-Type: ${args.contentType || "application/octet-stream"}`,
      `Content-Length: ${args.bytes.byteLength}`,
      `Content-Disposition: attachment; filename="${headerSafeFilename(args.filename)}"`,
      "Connection: close",
      "",
      bodyText,
    ].join("\r\n"),
    binary: true as const,
  };
}

function isBridgePath(path: string) {
  return path === "/bridge/v1" || path.startsWith("/bridge/v1/");
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
  };
}

function manifest(): HostBridgeManifest {
  return {
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    endpoint: {
      url: state.endpoint,
      bindMode: state.bindMode,
      lanEnabled: state.lanEnabled,
    },
    auth: {
      type: "bearer",
      tokenMasked: redactHostBridgeToken(state.token || getHostBridgeToken()),
    },
    capabilities: listHostBridgeCapabilities(),
    workflowControl: getHostBridgeWorkflowControlManifest(),
    fileDownloads: {
      ...getHostBridgeFileDownloadManifest(),
    },
    cli: {
      supported: true,
      schema: "zotero-bridge.cli.v1",
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

async function callCapability(request: HttpRequest) {
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

  try {
    const permissionScope = parsePermissionScopeHeader(request);
    const autoApprovedWrite =
      capability.category === "mutation" &&
      isHostBridgeWriteAutoApprovalScope(permissionScope);
    if (capability.approval !== "none" && !autoApprovedWrite) {
      const approvalPrompt = buildCapabilityApprovalPrompt(
        capability,
        payload.input,
      );
      await requestHostBridgePermission({
        action: capability.name,
        ...approvalPrompt,
        source: "host-bridge-cli",
        scope: permissionScope,
      });
    }
    const data = await capability.handler(payload.input, {
      getStatus: getHostBridgeServerStatus,
    });
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
    if (error instanceof HostBridgePermissionError) {
      return permissionErrorResponse(error);
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
  }
  return filters;
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
        "invalid_workflow_input",
        "Workflow submit request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_input",
    );
  }
  try {
    const result = await submitHostBridgeWorkflow({
      payload,
      scope: parsePermissionScopeHeader(request),
    });
    return response(200, "OK", hostBridgeOk(result));
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
    return response(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_input",
        errorMessage(error),
        "validation",
      ),
      "invalid_workflow_input",
    );
  }
}

async function getWorkflowRun(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Workflow run endpoint only supports GET", "GET");
  }
  const prefix = "/bridge/v1/workflows/runs/";
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
  return response(200, "OK", hostBridgeOk(status));
}

async function listTasks(request: HttpRequest) {
  if (request.method !== "GET") {
    return methodNotAllowed("Task list endpoint only supports GET", "GET");
  }
  const tasks = listHostBridgeTasks(parseWorkflowTaskFilters(request.query));
  return response(200, "OK", hostBridgeOk({ tasks }));
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
  const prefix = "/bridge/v1/files/";
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
      bytes: download.bytes,
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

async function handleHttpRequest(request: HttpRequest) {
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

  if (!isBridgePath(request.path)) {
    return response(
      404,
      "Not Found",
      hostBridgeError("not_found", "Host Bridge route not found", "not_found"),
      "not_found",
    );
  }

  if (request.path === "/bridge/v1/health") {
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

  if (!isHostBridgeAuthorizationValid(request.headers, state.token)) {
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

  if (bodyByteLength(request.body || "") > MAX_REQUEST_BODY_BYTES) {
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

  if (request.path === "/bridge/v1/manifest") {
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
    return response(200, "OK", hostBridgeOk(manifest()));
  }

  if (request.path === "/bridge/v1/call") {
    return callCapability(request);
  }

  if (request.path === "/bridge/v1/workflows") {
    return listWorkflows(request);
  }

  if (request.path === "/bridge/v1/workflows/submit") {
    return submitWorkflow(request);
  }

  if (request.path.startsWith("/bridge/v1/workflows/runs/")) {
    return getWorkflowRun(request);
  }

  if (request.path === "/bridge/v1/tasks") {
    return listTasks(request);
  }

  if (request.path.startsWith("/bridge/v1/files/")) {
    return downloadFile(request);
  }

  return response(
    404,
    "Not Found",
    hostBridgeError("not_found", "Host Bridge route not found", "not_found"),
    "not_found",
  );
}

function listen(serverSocket: any) {
  const listener = {
    onSocketAccepted: (_socket: any, transport: any) => {
      void (async () => {
        const inputStream = transport.openInputStream(0, 0, 0);
        const outputStream = transport.openOutputStream(0, 0, 0);
        const rawRequest = readInputStream(inputStream);
        const request = parseHttpRequest(rawRequest);
        const rawResponse = await handleHttpRequest(request);
        writeOutputStream(outputStream, rawResponse);
      })().catch((error) => {
        updateState({
          status: "error",
          lastError:
            error instanceof Error ? error.message : String(error || ""),
        });
      });
    },
    onStopListening: () => {
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

async function startServer() {
  const lanEnabled = getLanEnabled();
  const pinPortEnabled = getPinPortEnabled();
  const pinnedPort = getPinnedPort();
  const bindMode = bindModeFromLanEnabled(lanEnabled);
  const host = hostFromBindMode(bindMode);
  updateState({
    status: "starting",
    host,
    bindMode,
    lanEnabled,
    pinPortEnabled,
    pinnedPort,
    portMode: pinPortEnabled ? "pinned" : "random",
    lastError: "",
  });

  let lastError: unknown;
  let portMode: HostBridgePortMode = pinPortEnabled ? "pinned" : "random";
  let recoveryReason = state.lastRecoveryReason;
  const tryBind = async (port: number, mode: HostBridgePortMode) => {
    const serverSocket = createConfiguredServerSocket(port, bindMode);
    const token = getHostBridgeToken();
    updateState({
      status: "running",
      host,
      port,
      endpoint: buildEndpoint(host, port),
      token,
      serverSocket,
      bindMode,
      lanEnabled,
      pinPortEnabled: getPinPortEnabled(),
      pinnedPort: getPinnedPort(),
      portMode: mode,
      lastRecoveryReason: recoveryReason,
      lastError: "",
    });
    await writeHostBridgeWellKnownProfile({
      endpoint: state.endpoint,
      token,
      updatedAt: state.updatedAt,
    });
    listen(serverSocket);
    return getHostBridgeServerStatus();
  };

  if (pinPortEnabled) {
    try {
      return await tryBind(pinnedPort, "pinned");
    } catch (error) {
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
  try {
    state.serverSocket?.close?.();
  } catch {
    // Best-effort shutdown.
  }
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
  try {
    state.serverSocket?.close?.();
  } catch {
    // Best-effort shutdown.
  }
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
      endpoint: state.endpoint,
      token: rotated.token,
      updatedAt: rotated.rotatedAt,
    });
  }
  return rotated;
}

export function getHostBridgeServerStatus(): HostBridgeStatusSnapshot {
  const token = state.token || String(getPref("hostBridgeToken") || "");
  return {
    status: state.status,
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    host: state.host,
    port: state.port,
    endpoint: state.endpoint,
    bindMode: state.bindMode,
    lanEnabled: state.lanEnabled,
    portMode: state.portMode,
    pinPortEnabled: getPinPortEnabled(),
    pinnedPort: getPinnedPort(),
    supervised: supervisorEnabled,
    restartCount: state.restartCount,
    lastRecoveryReason: state.lastRecoveryReason,
    authRequired: true,
    tokenMasked: redactHostBridgeToken(token),
    lastRequestMethod: state.lastRequestMethod,
    lastResponseStatus: state.lastResponseStatus,
    lastError: state.lastError,
    requestCount: state.requestCount,
    updatedAt: state.updatedAt,
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
  resetHostBridgeWriteAutoApprovalScopesForTests();
}

export function configureHostBridgeServerForTests(
  args: {
    token?: string;
    endpoint?: string;
    lanEnabled?: boolean;
    portMode?: HostBridgePortMode;
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
  setServerSocketFactory(
    factory?: (port: number, bindMode: HostBridgeBindMode) => any,
  ) {
    serverSocketFactory = factory || createServerSocket;
  },
  scheduleRecovery(reason: string) {
    scheduleHostBridgeRecovery(reason);
  },
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

export async function handleHostBridgeHttpRequestForTests(args: {
  method: string;
  path: string;
  headers?: Record<string, unknown>;
  body?: string;
}) {
  const parsedPath = parseTestPath(args.path || "/");
  const request: HttpRequest = {
    method: String(args.method || "GET").toUpperCase(),
    path: parsedPath.path,
    query: parsedPath.query,
    headers: normalizeTestHeaders(args.headers),
    body: args.body || "",
    parseError: parsedPath.parseError,
  };
  const raw = await handleHttpRequest(request);
  return typeof raw === "string" ? raw : raw.text;
}
