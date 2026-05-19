import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { appendRuntimeLog } from "./runtimeLogManager";

export type AcpMcpGatewayTransportKind =
  | "http"
  | "sse"
  | "stdio"
  | "unknown";

export type AcpMcpGatewayObservation = {
  reachedTools: string[];
  missingTools: string[];
  smokeAttemptId: string;
  connectionId: string;
};

export type AcpMcpSmokeSpanHandle = {
  readonly connectionId: string;
  readonly smokeAttemptId: string;
  readonly requiredTools: string[];
  readonly observed: Promise<AcpMcpGatewayObservation>;
  snapshot: () => AcpMcpGatewayObservation;
  finish: () => Promise<void>;
  abort: (reason: unknown) => Promise<void>;
};

export type AcpMcpGatewayConnection = {
  readonly connectionId: string;
  wrapMcpServersForSession: (descriptors: unknown[]) => Promise<unknown[]>;
  startMcpSmokeSpan: (args: {
    sessionId: string;
    requiredTools: string[];
    timeoutMs: number;
  }) => Promise<AcpMcpSmokeSpanHandle>;
  observeToolCall: (args: {
    toolName: string;
    connectionId?: string;
    smokeAttemptId?: string;
  }) => AcpMcpGatewayObservation | null;
  getTransportKinds: () => AcpMcpGatewayTransportKind[];
  close: () => Promise<void>;
};

export type AcpMcpGatewayDiagnostic = {
  kind: string;
  level?: "info" | "warn" | "error";
  message: string;
  detail?: string;
  stage?: string;
  raw?: unknown;
};

type GatewayDescriptorRecord = {
  descriptorId: string;
  original: Record<string, unknown>;
  transportKind: AcpMcpGatewayTransportKind;
};

type SmokeSpanState = {
  sessionId: string;
  smokeAttemptId: string;
  requiredTools: string[];
  required: Set<string>;
  reached: Set<string>;
  active: boolean;
  observed: boolean;
  aborted: boolean;
  resolveObserved: (observation: AcpMcpGatewayObservation) => void;
  rejectObserved: (error: Error) => void;
};

type HttpRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  parseError?: string;
};

type JsonRpcId = string | number | null;

const HOST = "127.0.0.1";
const PORT_MIN = 26620;
const PORT_SPAN = 160;
const REDACTED = "<redacted>";

function nowIdPart() {
  return Date.now().toString(36);
}

function randomIdPart() {
  const cryptoLike = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoLike?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoLike.getRandomValues(bytes);
    return Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2, 12);
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${nowIdPart()}-${randomIdPart()}`;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeToolList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(new Set(value.map(normalizeString).filter(Boolean)));
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(/(authorization\s*[:=]\s*)[^\s,;]+/gi, `$1${REDACTED}`)
      .replace(/([?&]token=)[^&\s]+/gi, `$1${REDACTED}`);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = /authorization|token|secret|api[_-]?key/i.test(key)
        ? REDACTED
        : redactValue(entry);
    }
    return next;
  }
  return value;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(redactValue(value));
  } catch {
    return "";
  }
}

function byteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

function getComponents() {
  const runtime = globalThis as any;
  return (
    runtime.Components ||
    runtime.ChromeUtils?.importESModule?.("resource://gre/modules/Services.sys.mjs")
      ?.Components
  );
}

function createServerSocket(port: number) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const factory = classes?.["@mozilla.org/network/server-socket;1"];
  const nsIServerSocket = interfaces?.nsIServerSocket;
  if (!factory || !nsIServerSocket) {
    throw new Error("ACP MCP gateway HTTP server is unavailable");
  }
  const socket = factory.createInstance(nsIServerSocket);
  socket.init(port, true, -1);
  return socket;
}

function pickStartPort() {
  return PORT_MIN + Math.floor(Math.random() * PORT_SPAN);
}

function isClosedStreamError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("NS_BASE_STREAM_CLOSED") ||
    message.includes("0x80470002")
  );
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

function readInputStream(inputStream: any) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const factory = classes?.["@mozilla.org/scriptableinputstream;1"];
  const nsIScriptableInputStream = interfaces?.nsIScriptableInputStream;
  if (!factory || !nsIScriptableInputStream) {
    throw new Error("ACP MCP gateway input stream is unavailable");
  }
  const stream = factory.createInstance(nsIScriptableInputStream);
  stream.init(inputStream);
  let text = "";
  const startedAt = Date.now();
  while (Date.now() - startedAt < 1000) {
    let available = 0;
    try {
      available = Number(stream.available?.() || inputStream.available?.() || 0);
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
  return text;
}

function writeOutputStream(outputStream: any, response: string) {
  const components = getComponents();
  const classes = components?.classes || (globalThis as any).Cc;
  const interfaces = components?.interfaces || (globalThis as any).Ci;
  const converterFactory = classes?.["@mozilla.org/intl/converter-output-stream;1"];
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

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseHttpRequest(raw: string): HttpRequest {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
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
    path: path || "/",
    query,
    headers,
    body,
    parseError,
  };
}

function buildHttpResponse(args: {
  status: number;
  reason: string;
  body?: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}) {
  const bodyText =
    args.body === undefined
      ? ""
      : typeof args.body === "string"
        ? args.body
        : JSON.stringify(args.body);
  return [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    ...(bodyText
      ? [`Content-Type: ${args.contentType || "application/json"}; charset=utf-8`]
      : []),
    `Content-Length: ${byteLength(bodyText)}`,
    ...Object.entries(args.headers || {}).map(
      ([name, value]) => `${name}: ${value}`,
    ),
    "Connection: close",
    "",
    bodyText,
  ].join("\r\n");
}

function parseGatewayDescriptorId(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "mcp-gateway") {
    return "";
  }
  return normalizeString(parts[1]);
}

function descriptorTransportKind(
  descriptor: Record<string, unknown>,
): AcpMcpGatewayTransportKind {
  const type = normalizeString(descriptor.type).toLowerCase();
  if (type === "http" || type === "sse" || type === "stdio") {
    return type;
  }
  if (normalizeString(descriptor.url)) {
    return "http";
  }
  return "unknown";
}

function descriptorHeaders(descriptor: Record<string, unknown>) {
  const headers: Record<string, string> = {};
  const raw = descriptor.headers;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!isRecord(entry)) {
        continue;
      }
      const name = normalizeString(entry.name);
      if (!name) {
        continue;
      }
      headers[name] = String(entry.value || "");
    }
  } else if (isRecord(raw)) {
    for (const [name, value] of Object.entries(raw)) {
      headers[name] = String(value || "");
    }
  }
  return headers;
}

function isJsonRpcRequest(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.jsonrpc === "2.0" && !!normalizeString(value.method);
}

function isNotification(request: Record<string, unknown>) {
  return !Object.prototype.hasOwnProperty.call(request, "id");
}

function jsonRpcId(request: Record<string, unknown>): JsonRpcId {
  const id = request.id;
  return typeof id === "string" || typeof id === "number" || id === null
    ? id
    : null;
}

export function extractMcpToolNameFromJsonRpc(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }
  const params = isRecord(value.params) ? value.params : {};
  return normalizeString(
    params.name ||
      params.toolName ||
      params.tool ||
      params.functionName ||
      params.function_name,
  );
}

function syntheticToolResult(args: {
  id: JsonRpcId;
  toolName: string;
  connectionId: string;
  smokeAttemptId: string;
}) {
  return {
    jsonrpc: "2.0" as const,
    id: args.id,
    result: {
      content: [
        {
          type: "text",
          text: `MCP smoke observed ${args.toolName}.`,
        },
      ],
      structuredContent: {
        smoke: true,
        decisionSource: "mcp-gateway",
        toolName: args.toolName,
        connectionId: args.connectionId,
        smokeAttemptId: args.smokeAttemptId,
      },
    },
  };
}

function compactForwardResponse(response: unknown) {
  if (Array.isArray(response)) {
    return response;
  }
  return response === null || response === undefined ? [] : [response];
}

function summarizeJsonRpcPayload(payload: unknown) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const requests = entries.filter(isJsonRpcRequest);
  return {
    batch: Array.isArray(payload),
    requestCount: requests.length,
    methods: uniqueStrings(requests.map((entry) => entry.method)),
    toolNames: uniqueStrings(requests.map(extractMcpToolNameFromJsonRpc)),
    notificationCount: requests.filter(isNotification).length,
  };
}

function buildNodeCommand() {
  const runtime = globalThis as {
    process?: {
      execPath?: string;
      versions?: { node?: string };
    };
  };
  const execPath = normalizeString(runtime.process?.execPath);
  if (execPath && runtime.process?.versions?.node) {
    return execPath;
  }
  if (runtime.process?.versions?.node) {
    return "node";
  }
  return "";
}

function stdioShimScriptText() {
  return `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const configPath = process.argv[2];
if (!configPath) {
  console.error("stdio_gateway_unavailable: missing config path");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const child = spawn(config.command, config.args || [], {
  cwd: config.cwd || process.cwd(),
  env: { ...process.env, ...(config.env || {}) },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
let nextId = 1;
const pending = new Map();

function writeJson(value) {
  process.stdout.write(JSON.stringify(value) + "\\n");
}

function toolNameOf(message) {
  const params = message && typeof message === "object" && message.params && typeof message.params === "object" ? message.params : {};
  return String(params.name || params.toolName || params.tool || "").trim();
}

async function observe(toolName) {
  if (!config.observerEndpoint || !toolName) {
    return { shortCircuit: false };
  }
  const res = await fetch(config.observerEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + config.token,
    },
    body: JSON.stringify({
      connectionId: config.connectionId,
      smokeAttemptId: config.smokeAttemptId || "",
      descriptorId: config.descriptorId,
      toolName,
    }),
  });
  if (!res.ok) {
    return { shortCircuit: false };
  }
  return await res.json();
}

async function handleLine(line) {
  if (!line.trim()) {
    return;
  }
  const message = JSON.parse(line);
  if (message && message.method === "tools/call") {
    const toolName = toolNameOf(message);
    try {
      const decision = await observe(toolName);
      if (decision && decision.shortCircuit) {
        if (Object.prototype.hasOwnProperty.call(message, "id")) {
          writeJson({
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [{ type: "text", text: "MCP smoke observed " + toolName + "." }],
              structuredContent: {
                smoke: true,
                decisionSource: "mcp-gateway",
                toolName,
                connectionId: config.connectionId,
                smokeAttemptId: decision.smokeAttemptId || "",
              },
            },
          });
        }
        return;
      }
    } catch (error) {
      console.error("stdio gateway observe failed:", error && error.message ? error.message : String(error));
    }
  }
  child.stdin.write(JSON.stringify(message) + "\\n");
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    void handleLine(line).catch((error) => {
      writeJson({
        jsonrpc: "2.0",
        id: nextId++,
        error: {
          code: -32603,
          message: error && error.message ? error.message : String(error),
        },
      });
    });
  }
});
process.stdin.on("end", () => child.stdin.end());
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
`;
}

export function createAcpMcpGatewayConnection(args: {
  runtimeDir: string;
  emitDiagnostic?: (entry: AcpMcpGatewayDiagnostic) => void;
  disableHttpServer?: boolean;
  backendId?: string;
  backendType?: string;
  providerId?: string;
}): AcpMcpGatewayConnection & {
  handleJsonRpcPayloadForTests: (
    payload: unknown,
    options?: {
      descriptorId?: string;
      forward?: (payload: unknown) => Promise<unknown> | unknown;
    },
  ) => Promise<unknown>;
} {
  const connectionId = nextOpaqueId("acp-mcp-conn");
  const descriptors = new Map<string, GatewayDescriptorRecord>();
  let activeSpan: SmokeSpanState | null = null;
  let serverSocket: any = null;
  let endpointBase = "";
  const token = nextOpaqueId("acp-mcp-gateway-token");

  const emitDiagnostic = (entry: AcpMcpGatewayDiagnostic) => {
    args.emitDiagnostic?.(entry);
  };

  const appendGatewayRuntimeLog = (entry: {
    level?: "info" | "warn" | "error";
    phase?: string;
    stage: string;
    message: string;
    details?: Record<string, unknown>;
    transport?: { method?: string; path?: string; status?: number; size?: number };
    error?: unknown;
  }) => {
    try {
      appendRuntimeLog({
        level: entry.level || "info",
        scope: "system",
        backendId: args.backendId,
        backendType: args.backendType,
        providerId: args.providerId || "acp",
        component: "acp-mcp-gateway",
        operation: "mcp-gateway",
        phase: entry.phase || "runtime",
        stage: entry.stage,
        message: entry.message,
        transport: entry.transport,
        details: redactValue({
          connectionId,
          runtimeDir: args.runtimeDir,
          ...(entry.details || {}),
        }),
        error: entry.error,
      });
    } catch {
      // Runtime logging must never affect MCP traffic.
    }
  };

  const snapshotForSpan = (span: SmokeSpanState): AcpMcpGatewayObservation => {
    const reachedTools = span.requiredTools.filter((tool) => span.reached.has(tool));
    const missingTools = span.requiredTools.filter((tool) => !span.reached.has(tool));
    return {
      reachedTools,
      missingTools,
      smokeAttemptId: span.smokeAttemptId,
      connectionId,
    };
  };

  const completeIfObserved = (span: SmokeSpanState) => {
    if (span.observed || span.aborted) {
      return;
    }
    const observation = snapshotForSpan(span);
    if (observation.missingTools.length > 0) {
      return;
    }
    span.observed = true;
    span.active = false;
    span.resolveObserved(observation);
  };

  const observeToolCall = (observeArgs: {
    toolName: string;
    connectionId?: string;
    smokeAttemptId?: string;
  }) => {
    const toolName = normalizeString(observeArgs.toolName);
    if (
      !toolName ||
      !activeSpan ||
      !activeSpan.active ||
      activeSpan.aborted ||
      activeSpan.observed
    ) {
      return null;
    }
    if (observeArgs.connectionId && observeArgs.connectionId !== connectionId) {
      return null;
    }
    if (
      observeArgs.smokeAttemptId &&
      observeArgs.smokeAttemptId !== activeSpan.smokeAttemptId
    ) {
      return null;
    }
    if (!activeSpan.required.has(toolName)) {
      return snapshotForSpan(activeSpan);
    }
    activeSpan.reached.add(toolName);
    const observation = snapshotForSpan(activeSpan);
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-tool-observed",
      message: "ACP MCP gateway observed smoke tool call",
      details: {
        toolName,
        smokeAttemptId: activeSpan.smokeAttemptId,
        reachedTools: observation.reachedTools,
        missingTools: observation.missingTools,
      },
    });
    completeIfObserved(activeSpan);
    return observation;
  };

  const activeShortCircuitAttemptId = () =>
    activeSpan?.active && !activeSpan.aborted && !activeSpan.observed
      ? activeSpan.smokeAttemptId
      : "";

  const handleJsonRpcPayload = async (
    payload: unknown,
    options?: {
      descriptorId?: string;
      forward?: (payload: unknown) => Promise<unknown> | unknown;
    },
  ): Promise<unknown> => {
    const entries = Array.isArray(payload) ? payload : [payload];
    const responses: Array<{ index: number; response: unknown }> = [];
    const forwardEntries: Array<{ index: number; request: unknown }> = [];
    const attemptId = activeShortCircuitAttemptId();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (
        attemptId &&
        isJsonRpcRequest(entry) &&
        normalizeString(entry.method) === "tools/call"
      ) {
        const toolName = extractMcpToolNameFromJsonRpc(entry);
        observeToolCall({
          toolName,
          connectionId,
          smokeAttemptId: attemptId,
        });
        appendGatewayRuntimeLog({
          stage: "mcp-gateway-tool-short-circuited",
          message: "ACP MCP gateway short-circuited active smoke tool call",
          details: {
            descriptorId: options?.descriptorId,
            smokeAttemptId: attemptId,
            toolName,
          },
        });
        if (!isNotification(entry)) {
          responses.push({
            index,
            response: syntheticToolResult({
              id: jsonRpcId(entry),
              toolName,
              connectionId,
              smokeAttemptId: attemptId,
            }),
          });
        }
        continue;
      }
      forwardEntries.push({ index, request: entry });
    }
    if (forwardEntries.length > 0 && options?.forward) {
      const forwardPayload = Array.isArray(payload)
        ? forwardEntries.map((entry) => entry.request)
        : forwardEntries[0]?.request;
      const forwarded = await options.forward(forwardPayload);
      const forwardedResponses = compactForwardResponse(forwarded);
      for (let i = 0; i < forwardedResponses.length; i += 1) {
        const index = forwardEntries[Math.min(i, forwardEntries.length - 1)]?.index ?? i;
        responses.push({
          index,
          response: forwardedResponses[i],
        });
      }
    } else if (forwardEntries.length > 0) {
      appendGatewayRuntimeLog({
        level: "warn",
        stage: "mcp-gateway-upstream-forwarder-unavailable",
        message: "ACP MCP gateway upstream forwarder is unavailable",
        details: {
          descriptorId: options?.descriptorId,
          requestCount: forwardEntries.length,
        },
      });
      for (const entry of forwardEntries) {
        if (!isJsonRpcRequest(entry.request) || isNotification(entry.request)) {
          continue;
        }
        responses.push({
          index: entry.index,
          response: {
            jsonrpc: "2.0",
            id: jsonRpcId(entry.request),
            error: {
              code: -32603,
              message: "ACP MCP gateway upstream forwarder is unavailable",
            },
          },
        });
      }
    }
    responses.sort((a, b) => a.index - b.index);
    if (Array.isArray(payload)) {
      return responses.map((entry) => entry.response);
    }
    return responses[0]?.response ?? null;
  };

  const forwardHttpPayload = async (
    descriptor: GatewayDescriptorRecord,
    request: HttpRequest,
    payloadOverride?: unknown,
  ) => {
    const url = normalizeString(descriptor.original.url);
    if (!url) {
      return buildHttpResponse({
        status: 502,
        reason: "Bad Gateway",
        body: {
          error: "mcp_gateway_upstream_url_missing",
        },
      });
    }
    const headers = {
      ...descriptorHeaders(descriptor.original),
      "content-type": request.headers["content-type"] || "application/json",
    };
    const body =
      payloadOverride === undefined
        ? request.body
        : JSON.stringify(payloadOverride);
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-upstream-forward-started",
      message: "ACP MCP gateway forwarding request upstream",
      transport: {
        method: request.method,
        path: request.path,
        size: byteLength(body || ""),
      },
      details: {
        descriptorId: descriptor.descriptorId,
        transportKind: descriptor.transportKind,
      },
    });
    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.method === "GET" ? undefined : body,
      });
      const responseBody = await response.text();
      appendGatewayRuntimeLog({
        stage: "mcp-gateway-upstream-forward-finished",
        message: "ACP MCP gateway upstream response received",
        transport: {
          method: request.method,
          path: request.path,
          status: response.status,
          size: byteLength(responseBody),
        },
        details: {
          descriptorId: descriptor.descriptorId,
          transportKind: descriptor.transportKind,
        },
      });
      return buildHttpResponse({
        status: response.status,
        reason: response.statusText || "OK",
        body: responseBody,
        contentType:
          response.headers.get("content-type")?.split(";")[0] || "application/json",
      });
    } catch (error) {
      appendGatewayRuntimeLog({
        level: "error",
        stage: "mcp-gateway-upstream-forward-failed",
        message: "ACP MCP gateway upstream request failed",
        transport: {
          method: request.method,
          path: request.path,
        },
        details: {
          descriptorId: descriptor.descriptorId,
          transportKind: descriptor.transportKind,
        },
        error,
      });
      throw error;
    }
  };

  const handleHttpRequest = async (request: HttpRequest) => {
    if (request.parseError) {
      return buildHttpResponse({
        status: 400,
        reason: "Bad Request",
        body: { error: request.parseError },
      });
    }
    const expected = `bearer ${token}`.toLowerCase();
    if (normalizeString(request.headers.authorization).toLowerCase() !== expected) {
      appendGatewayRuntimeLog({
        level: "warn",
        stage: "mcp-gateway-auth-failed",
        message: "ACP MCP gateway rejected unauthorized request",
        transport: {
          method: request.method,
          path: request.path,
          status: 401,
        },
      });
      return buildHttpResponse({
        status: 401,
        reason: "Unauthorized",
        body: { error: "unauthorized" },
      });
    }
    if (request.path === "/mcp-gateway/observe" && request.method === "POST") {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(request.body || "{}");
      } catch {
        return buildHttpResponse({
          status: 400,
          reason: "Bad Request",
          body: { error: "parse_error" },
        });
      }
      const shouldShortCircuit = !!activeShortCircuitAttemptId();
      const observation = observeToolCall({
        toolName: normalizeString(payload.toolName),
        connectionId: normalizeString(payload.connectionId),
        smokeAttemptId: normalizeString(payload.smokeAttemptId),
      });
      appendGatewayRuntimeLog({
        stage: "mcp-gateway-observer-request",
        message: "ACP MCP gateway observer request received",
        transport: {
          method: request.method,
          path: request.path,
          status: 200,
        },
        details: {
          toolName: normalizeString(payload.toolName),
          smokeAttemptId: normalizeString(payload.smokeAttemptId),
          matched: !!observation,
          shortCircuit: !!observation && shouldShortCircuit,
        },
      });
      return buildHttpResponse({
        status: 200,
        reason: "OK",
        body: {
          shortCircuit: !!observation && shouldShortCircuit,
          smokeAttemptId: observation?.smokeAttemptId || "",
          connectionId,
        },
      });
    }
    const descriptorId = parseGatewayDescriptorId(request.path);
    const descriptor = descriptors.get(descriptorId);
    if (!descriptor) {
      appendGatewayRuntimeLog({
        level: "warn",
        stage: "mcp-gateway-descriptor-not-found",
        message: "ACP MCP gateway descriptor was not found for request",
        transport: {
          method: request.method,
          path: request.path,
          status: 404,
        },
        details: {
          descriptorId,
        },
      });
      return buildHttpResponse({
        status: 404,
        reason: "Not Found",
        body: { error: "mcp_gateway_descriptor_not_found" },
      });
    }
    if (request.method !== "POST") {
      return forwardHttpPayload(descriptor, request);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(request.body || "{}");
    } catch {
      return buildHttpResponse({
        status: 400,
        reason: "Bad Request",
        body: {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        },
      });
    }
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-request-received",
      message: "ACP MCP gateway request received",
      transport: {
        method: request.method,
        path: request.path,
        size: byteLength(request.body || ""),
      },
      details: {
        descriptorId,
        transportKind: descriptor.transportKind,
        jsonrpc: summarizeJsonRpcPayload(payload),
      },
    });
    const gatewayResponse = await handleJsonRpcPayload(payload, {
      descriptorId,
      forward: async (forwardPayload) => {
        const upstreamRaw = await forwardHttpPayload(
          descriptor,
          request,
          forwardPayload,
        );
        const splitIndex = upstreamRaw.indexOf("\r\n\r\n");
        const body = splitIndex >= 0 ? upstreamRaw.slice(splitIndex + 4) : "";
        return body.trim() ? JSON.parse(body) : null;
      },
    });
    if (!gatewayResponse) {
      return buildHttpResponse({
        status: 202,
        reason: "Accepted",
      });
    }
    return buildHttpResponse({
      status: 200,
      reason: "OK",
      body: gatewayResponse,
    });
  };

  const listen = (socket: any) => {
    socket.asyncListen({
      onSocketAccepted(_server: unknown, transport: any) {
        void (async () => {
          let output: any;
          try {
            const input = transport.openInputStream(0, 0, 0);
            output = transport.openOutputStream(0, 0, 0);
            const raw = readInputStream(input);
            if (!raw.trim()) {
              transport.close?.(0);
              return;
            }
            const request = parseHttpRequest(raw);
            const response = await handleHttpRequest(request);
            writeOutputStream(output, response);
            transport.close?.(0);
          } catch (error) {
            emitDiagnostic({
              kind: "mcp_gateway_error",
              level: "error",
              message: "ACP MCP gateway request failed",
              detail: error instanceof Error ? error.message : String(error || ""),
            });
            appendGatewayRuntimeLog({
              level: "error",
              stage: "mcp-gateway-request-failed",
              message: "ACP MCP gateway request failed",
              error,
            });
            try {
              if (output) {
                writeOutputStream(
                  output,
                  buildHttpResponse({
                    status: 500,
                    reason: "Internal Server Error",
                    body: { error: "mcp_gateway_request_failed" },
                  }),
                );
              }
            } catch {
              // Best effort response.
            }
            transport.close?.(0);
          }
        })();
      },
      onStopListening() {
        serverSocket = null;
        endpointBase = "";
      },
    });
  };

  const ensureHttpServer = async () => {
    if (endpointBase) {
      return endpointBase;
    }
    if (args.disableHttpServer) {
      endpointBase = `http://${HOST}:0`;
      appendGatewayRuntimeLog({
        stage: "mcp-gateway-started",
        message: "ACP MCP gateway HTTP server disabled for test connection",
        details: {
          endpointBase,
          disabled: true,
        },
      });
      return endpointBase;
    }
    const startPort = pickStartPort();
    let lastError: unknown;
    for (let offset = 0; offset < PORT_SPAN; offset += 1) {
      const port = PORT_MIN + ((startPort - PORT_MIN + offset) % PORT_SPAN);
      try {
        const socket = createServerSocket(port);
        serverSocket = socket;
        endpointBase = `http://${HOST}:${port}`;
        listen(socket);
        emitDiagnostic({
          kind: "mcp_gateway_started",
          message: "ACP MCP gateway HTTP server started",
          detail: endpointBase,
        });
        appendGatewayRuntimeLog({
          stage: "mcp-gateway-started",
          message: "ACP MCP gateway HTTP server started",
          details: {
            endpointBase,
          },
        });
        return endpointBase;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      lastError instanceof Error
        ? lastError.message
        : "ACP MCP gateway HTTP server is unavailable",
    );
  };

  const wrapHttpDescriptor = async (
    descriptor: Record<string, unknown>,
    descriptorId: string,
  ) => {
    const base = await ensureHttpServer();
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-descriptor-wrapped",
      message: "ACP MCP gateway wrapped HTTP/SSE descriptor",
      details: {
        descriptorId,
        transportKind: descriptorTransportKind(descriptor),
        name: normalizeString(descriptor.name),
        gatewayUrl: `${base}/mcp-gateway/${encodeURIComponent(descriptorId)}`,
        upstream: redactValue(descriptor),
      },
    });
    return {
      ...descriptor,
      url: `${base}/mcp-gateway/${encodeURIComponent(descriptorId)}`,
      headers: [
        {
          name: "Authorization",
          value: `Bearer ${token}`,
        },
      ],
      _meta: {
        ...(isRecord(descriptor._meta) ? descriptor._meta : {}),
        gateway: {
          decisionSource: "mcp-gateway",
          connectionId,
          descriptorId,
          upstream: redactValue(descriptor),
        },
      },
    };
  };

  const writeStdioShim = async (
    descriptor: Record<string, unknown>,
    descriptorId: string,
  ) => {
    const nodeCommand = buildNodeCommand();
    if (!nodeCommand) {
      throw new Error("stdio_gateway_unavailable: Node runtime is unavailable");
    }
    const gatewayDir = joinPath(args.runtimeDir, "mcp-gateway", connectionId);
    await ensureRuntimeDirectory(gatewayDir);
    const shimPath = joinPath(gatewayDir, "stdio-shim.mjs");
    const configPath = joinPath(gatewayDir, `${descriptorId}.json`);
    await writeRuntimeTextFile(shimPath, stdioShimScriptText());
    await writeRuntimeTextFile(
      configPath,
      `${JSON.stringify(
        {
          command: normalizeString(descriptor.command),
          args: Array.isArray(descriptor.args) ? descriptor.args : [],
          env: isRecord(descriptor.env) ? descriptor.env : {},
          cwd: normalizeString(descriptor.cwd),
          observerEndpoint: `${await ensureHttpServer()}/mcp-gateway/observe`,
          token,
          connectionId,
          descriptorId,
        },
        null,
        2,
      )}\n`,
    );
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-descriptor-wrapped",
      message: "ACP MCP gateway wrapped stdio descriptor",
      details: {
        descriptorId,
        transportKind: "stdio",
        name: normalizeString(descriptor.name),
        shimPath,
        configPath,
        upstream: redactValue(descriptor),
      },
    });
    return {
      ...descriptor,
      command: nodeCommand,
      args: [shimPath, configPath],
      env: {},
      cwd: args.runtimeDir,
      _meta: {
        ...(isRecord(descriptor._meta) ? descriptor._meta : {}),
        gateway: {
          decisionSource: "mcp-gateway",
          connectionId,
          descriptorId,
          upstream: redactValue(descriptor),
        },
      },
    };
  };

  const wrapMcpServersForSession = async (rawDescriptors: unknown[]) => {
    const wrapped: unknown[] = [];
    const descriptorList = Array.isArray(rawDescriptors) ? rawDescriptors : [];
    for (const raw of descriptorList) {
      if (!isRecord(raw)) {
        wrapped.push(raw);
        continue;
      }
      const transportKind = descriptorTransportKind(raw);
      const descriptorId = nextOpaqueId("mcp-desc");
      descriptors.set(descriptorId, {
        descriptorId,
        original: raw,
        transportKind,
      });
      if (transportKind === "http" || transportKind === "sse") {
        wrapped.push(await wrapHttpDescriptor(raw, descriptorId));
      } else if (transportKind === "stdio") {
        wrapped.push(await writeStdioShim(raw, descriptorId));
      } else {
        wrapped.push(raw);
      }
    }
    emitDiagnostic({
      kind: "mcp_gateway_descriptors_wrapped",
      message: "ACP MCP descriptors wrapped by gateway",
      detail: safeJson({
        connectionId,
        transportKinds: uniqueStrings(
          Array.from(descriptors.values()).map((entry) => entry.transportKind),
        ),
        count: descriptorList.length,
      }),
    });
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-descriptors-wrapped",
      message: "ACP MCP descriptors wrapped by gateway",
      details: {
        transportKinds: uniqueStrings(
          Array.from(descriptors.values()).map((entry) => entry.transportKind),
        ),
        count: descriptorList.length,
      },
    });
    return wrapped;
  };

  const startMcpSmokeSpan = async (spanArgs: {
    sessionId: string;
    requiredTools: string[];
    timeoutMs: number;
  }) => {
    const requiredTools = normalizeToolList(spanArgs.requiredTools);
    const smokeAttemptId = nextOpaqueId("acp-mcp-smoke");
    let resolveObserved!: (observation: AcpMcpGatewayObservation) => void;
    let rejectObserved!: (error: Error) => void;
    const observed = new Promise<AcpMcpGatewayObservation>((resolve, reject) => {
      resolveObserved = resolve;
      rejectObserved = reject;
    });
    const span: SmokeSpanState = {
      sessionId: normalizeString(spanArgs.sessionId),
      smokeAttemptId,
      requiredTools,
      required: new Set(requiredTools),
      reached: new Set(),
      active: true,
      observed: false,
      aborted: false,
      resolveObserved,
      rejectObserved,
    };
    activeSpan = span;
    if (requiredTools.length === 0) {
      completeIfObserved(span);
    }
    emitDiagnostic({
      kind: "mcp_gateway_smoke_started",
      message: "ACP MCP gateway smoke span started",
      detail: safeJson({
        connectionId,
        smokeAttemptId,
        requiredTools,
        timeoutMs: spanArgs.timeoutMs,
      }),
    });
    appendGatewayRuntimeLog({
      stage: "mcp-gateway-smoke-started",
      message: "ACP MCP gateway smoke span started",
      details: {
        smokeAttemptId,
        sessionId: span.sessionId,
        requiredTools,
        timeoutMs: spanArgs.timeoutMs,
      },
    });
    return {
      connectionId,
      smokeAttemptId,
      requiredTools,
      observed,
      snapshot: () => snapshotForSpan(span),
      finish: async () => {
        span.active = false;
        if (activeSpan === span) {
          activeSpan = null;
        }
        appendGatewayRuntimeLog({
          stage: "mcp-gateway-smoke-finished",
          message: "ACP MCP gateway smoke span finished",
          details: {
            smokeAttemptId,
            reachedTools: snapshotForSpan(span).reachedTools,
            missingTools: snapshotForSpan(span).missingTools,
          },
        });
      },
      abort: async (reason: unknown) => {
        span.active = false;
        span.aborted = true;
        if (activeSpan === span) {
          activeSpan = null;
        }
        appendGatewayRuntimeLog({
          level: "warn",
          stage: "mcp-gateway-smoke-aborted",
          message: "ACP MCP gateway smoke span aborted",
          details: {
            smokeAttemptId,
            reachedTools: snapshotForSpan(span).reachedTools,
            missingTools: snapshotForSpan(span).missingTools,
            reason: reason instanceof Error ? reason.message : normalizeString(reason),
          },
        });
        span.rejectObserved(
          new Error(
            reason instanceof Error
              ? reason.message
              : normalizeString(reason) || "MCP smoke span aborted",
          ),
        );
      },
    } satisfies AcpMcpSmokeSpanHandle;
  };

  return {
    connectionId,
    wrapMcpServersForSession,
    startMcpSmokeSpan,
    observeToolCall,
    getTransportKinds: () =>
      uniqueStrings(
        Array.from(descriptors.values()).map((entry) => entry.transportKind),
      ) as AcpMcpGatewayTransportKind[],
    close: async () => {
      if (activeSpan?.active) {
        await (async () => {
          activeSpan!.active = false;
          activeSpan!.aborted = true;
          activeSpan!.rejectObserved(new Error("MCP gateway connection closed"));
          activeSpan = null;
        })();
      }
      try {
        serverSocket?.close?.();
      } catch {
        // Best effort cleanup.
      }
      serverSocket = null;
      endpointBase = "";
      descriptors.clear();
    },
    handleJsonRpcPayloadForTests: handleJsonRpcPayload,
  };
}
