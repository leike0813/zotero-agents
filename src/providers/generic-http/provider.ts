import type {
  GenericHttpRequestV1,
  GenericHttpStepDefinitionV1,
  GenericHttpStepsRequestV1,
  ProviderExecutionResult,
} from "../contracts";
import type { Provider, ProviderSupportsArgs } from "../types";
import { appendRuntimeLog } from "../../modules/runtimeLogManager";
import { GENERIC_HTTP_BACKEND_TYPE } from "../../config/defaults";
import { delay } from "../../utils/runtimeCompatibility";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type JsonPathSegment = string | number;

function ensureLeadingSlash(input: string) {
  return input.startsWith("/") ? input : `/${input}`;
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${ensureLeadingSlash(path)}`;
}

function resolveJsonPathSegments(pathExpr: string): JsonPathSegment[] {
  const text = String(pathExpr || "").trim();
  if (!text.startsWith("$")) {
    throw new Error(`Unsupported json path expression: ${text}`);
  }
  const body = text.slice(1);
  const segments: JsonPathSegment[] = [];
  let cursor = 0;
  while (cursor < body.length) {
    const current = body[cursor];
    if (current === ".") {
      cursor += 1;
      continue;
    }
    if (current === "[") {
      const right = body.indexOf("]", cursor + 1);
      if (right <= cursor + 1) {
        throw new Error(`Unsupported json path expression: ${text}`);
      }
      const indexText = body.slice(cursor + 1, right).trim();
      if (!/^\d+$/.test(indexText)) {
        throw new Error(`Unsupported json path expression: ${text}`);
      }
      segments.push(Number(indexText));
      cursor = right + 1;
      continue;
    }
    let right = cursor;
    while (right < body.length) {
      const ch = body[right];
      if (ch === "." || ch === "[") {
        break;
      }
      right += 1;
    }
    const key = body.slice(cursor, right).trim();
    if (!key) {
      throw new Error(`Unsupported json path expression: ${text}`);
    }
    segments.push(key);
    cursor = right;
  }
  return segments;
}

function resolveJsonPath(root: unknown, pathExpr: string) {
  const segments = resolveJsonPathSegments(pathExpr);
  let cursor: unknown = root;
  for (const segment of segments) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
      continue;
    }
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    if (!(segment in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function resolveJsonPathWithFallback(root: unknown, pathExpr: string) {
  const expressions = String(pathExpr || "")
    .split("||")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (expressions.length === 0) {
    return undefined;
  }
  for (const expression of expressions) {
    const resolved = resolveJsonPath(root, expression);
    if (typeof resolved !== "undefined") {
      return resolved;
    }
  }
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function resolveFetchImpl() {
  const runtime = globalThis as { fetch?: FetchLike };
  if (typeof runtime.fetch !== "function") {
    throw new Error("fetch() is unavailable in current runtime");
  }
  return runtime.fetch.bind(globalThis);
}

async function sleep(ms: number) {
  await delay(ms);
}

async function readFileBytes(filePath: string) {
  const runtime = globalThis as {
    IOUtils?: { read?: (targetPath: string) => Promise<Uint8Array> };
  };
  if (typeof runtime.IOUtils?.read === "function") {
    return runtime.IOUtils.read(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  const bytes = await fs.readFile(filePath);
  return new Uint8Array(bytes);
}

function resolveTemplateValue(
  key: string,
  state: Record<string, unknown>,
): string {
  if (!Object.prototype.hasOwnProperty.call(state, key)) {
    throw new Error(`Missing interpolation variable: ${key}`);
  }
  const value = state[key];
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new Error(`Interpolation variable ${key} must be scalar`);
}

function compactListPreview(entries: string[], max = 6) {
  const normalized = entries
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (normalized.length === 0) {
    return "";
  }
  if (normalized.length <= max) {
    return normalized.join(",");
  }
  const head = normalized.slice(0, max).join(",");
  return `${head},+${normalized.length - max}`;
}

function compactTextPreview(value: unknown, max = 40) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
}

function resolveValueType(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

function summarizeRequestForDebug(args: {
  stepId: string;
  url: string;
  requestSpec: GenericHttpStepDefinitionV1["request"];
  headers?: Record<string, string>;
  body?: BodyInit | null;
}) {
  const method = String(args.requestSpec.method || "").toUpperCase() || "GET";
  const json = args.requestSpec.json;
  const normalizedHeaders = Object.fromEntries(
    Object.entries(args.headers || {}).map(([key, value]) => [
      String(key || "").toLowerCase(),
      String(value || ""),
    ]),
  );
  const headerKeys = compactListPreview(Object.keys(normalizedHeaders), 5);
  const contentType = compactTextPreview(
    normalizedHeaders["content-type"] || "",
    48,
  );
  const accept = compactTextPreview(normalizedHeaders.accept || "", 48);
  const authText = normalizedHeaders.authorization
    ? compactTextPreview(normalizedHeaders.authorization, 24)
    : "";
  const headerValues = [
    contentType ? `ct=${contentType}` : "",
    accept ? `accept=${accept}` : "",
    authText ? `auth=${authText}` : "",
  ]
    .filter(Boolean)
    .join(",");
  const headersText = headerKeys
    ? ` headers=${headerKeys}${headerValues ? `(${headerValues})` : ""}`
    : "";
  const bodyType = resolveValueType(args.body);
  const bodyPreview =
    typeof args.body === "string" ? compactTextPreview(args.body, 160) : "";
  const bodyText = bodyPreview
    ? ` bodyType=${bodyType} body=${bodyPreview}`
    : ` bodyType=${bodyType}`;
  if (!isObject(json)) {
    return `${args.stepId}:${method} ${args.url}${headersText} jsonType=${resolveValueType(json)}${bodyText}`;
  }
  const files = (json as Record<string, unknown>).files;
  const filesType = resolveValueType(files);
  const firstFile = Array.isArray(files) ? files[0] : undefined;
  const firstFileType = resolveValueType(firstFile);
  const firstFilePreview = firstFile
    ? compactTextPreview(JSON.stringify(firstFile), 120)
    : "";
  const previewText = firstFilePreview ? ` firstFile=${firstFilePreview}` : "";
  return `${args.stepId}:${method} ${args.url}${headersText} filesType=${filesType} firstFileType=${firstFileType}${previewText}${bodyText}`;
}

function resolvePayloadSummary(payload: unknown) {
  if (!isObject(payload)) {
    return "prev=none";
  }
  const code = Object.prototype.hasOwnProperty.call(payload, "code")
    ? String((payload as Record<string, unknown>).code)
    : "n/a";
  const msg = Object.prototype.hasOwnProperty.call(payload, "msg")
    ? String((payload as Record<string, unknown>).msg || "")
    : Object.prototype.hasOwnProperty.call(payload, "message")
      ? String((payload as Record<string, unknown>).message || "")
      : "";
  const data = (payload as Record<string, unknown>).data;
  const dataKeys = isObject(data) ? compactListPreview(Object.keys(data)) : "";
  const msgText = msg ? `,msg=${compactTextPreview(msg)}` : "";
  const dataText = dataKeys ? `,dataKeys=${dataKeys}` : "";
  return `prev(code=${code}${msgText}${dataText})`;
}

function rethrowWithInterpolationContext(args: {
  error: unknown;
  stepId: string;
  state: Record<string, unknown>;
  lastPayload: unknown;
  lastRequestSummary?: string;
}) {
  const message =
    args.error instanceof Error ? args.error.message : String(args.error || "");
  const missingMatch = message.match(
    /^Missing interpolation variable:\s*(.+)$/i,
  );
  if (!missingMatch) {
    throw args.error;
  }
  const missingKey = String(missingMatch[1] || "").trim() || "unknown";
  const stateKeys = compactListPreview(Object.keys(args.state), 4);
  const payloadSummary = resolvePayloadSummary(args.lastPayload);
  const hasBatchId = Object.prototype.hasOwnProperty.call(
    args.state,
    "batch_id",
  )
    ? "yes"
    : "no";
  const hasUploadUrl = Object.prototype.hasOwnProperty.call(
    args.state,
    "upload_url",
  )
    ? "yes"
    : "no";
  const stateText = stateKeys ? `keys=${stateKeys}` : "keys=none";
  const requestText = args.lastRequestSummary
    ? `; prevReq=${args.lastRequestSummary}`
    : "";
  throw new Error(
    `Step ${args.stepId} missing interpolation variable: ${missingKey}; ${payloadSummary}; hasBatchId=${hasBatchId}; hasUploadUrl=${hasUploadUrl}; ${stateText}${requestText}`,
  );
}

function interpolateString(template: string, state: Record<string, unknown>) {
  return String(template || "").replace(/\{([^{}]+)\}/g, (_, key: string) =>
    resolveTemplateValue(String(key || "").trim(), state),
  );
}

function interpolateValue<T>(value: T, state: Record<string, unknown>): T {
  if (typeof value === "string") {
    return interpolateString(value, state) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => interpolateValue(entry, state)) as T;
  }
  if (isObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = interpolateValue(entry, state);
    }
    return next as T;
  }
  return value;
}

function applyHeaderMap(target: Headers, source: Record<string, string>) {
  for (const [key, value] of Object.entries(source || {})) {
    target.set(key, String(value));
  }
}

function headersToObject(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

function resolveBaseHeaders(args: {
  backend: import("../../backends/types").BackendInstance;
}) {
  const headers = new Headers();
  applyHeaderMap(headers, args.backend.defaults?.headers || {});
  if (args.backend.auth?.kind === "bearer") {
    headers.set("authorization", `Bearer ${args.backend.auth.token}`);
  }
  return headers;
}

async function readResponsePayload(response: Response, responseType: string) {
  const normalizedType = String(responseType || "json").toLowerCase();
  if (normalizedType === "bytes") {
    if (!response.ok) {
      throw new Error(
        `Generic HTTP request failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      kind: "bytes" as const,
      payload: new Uint8Array(arrayBuffer),
    };
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Generic HTTP request failed: HTTP ${response.status} ${response.statusText} ${text}`,
    );
  }
  if (normalizedType === "text") {
    return {
      kind: "text" as const,
      payload: text,
    };
  }

  if (!text.trim()) {
    return {
      kind: "json" as const,
      payload: {},
    };
  }
  try {
    return {
      kind: "json" as const,
      payload: JSON.parse(text),
    };
  } catch {
    return {
      kind: "json" as const,
      payload: { raw: text },
    };
  }
}

function resolveRequestUrl(args: {
  baseUrl: string;
  path?: string;
  url?: string;
}) {
  const absolute = String(args.url || "").trim();
  if (absolute) {
    if (isAbsoluteHttpUrl(absolute)) {
      return absolute;
    }
    return buildUrl(args.baseUrl, absolute);
  }
  const path = String(args.path || "").trim();
  if (!path) {
    throw new Error("Step request requires either request.url or request.path");
  }
  return buildUrl(args.baseUrl, path);
}

function checkFailCondition(args: {
  step: GenericHttpStepDefinitionV1;
  payload: unknown;
}) {
  const failWhen = args.step.fail_when;
  if (!failWhen) {
    return;
  }
  const actual = resolveJsonPathWithFallback(args.payload, failWhen.json_path);
  const isMatchByEquals =
    typeof failWhen.equals !== "undefined" && actual === failWhen.equals;
  const isMatchBySet =
    Array.isArray(failWhen.in) && failWhen.in.some((entry) => entry === actual);
  if (!isMatchByEquals && !isMatchBySet) {
    return;
  }
  const fromPath = failWhen.message_path
    ? resolveJsonPathWithFallback(args.payload, failWhen.message_path)
    : "";
  const message = String(failWhen.message || fromPath || "").trim();
  if (message) {
    throw new Error(message);
  }
  throw new Error(`Step ${args.step.id} failed`);
}

function shouldRepeatStep(args: {
  step: GenericHttpStepDefinitionV1;
  payload: unknown;
}) {
  const repeat = args.step.repeat_until;
  if (!repeat) {
    return false;
  }
  const actual = resolveJsonPathWithFallback(args.payload, repeat.json_path);
  const expected = Array.isArray(repeat.in) ? repeat.in : [];
  return !expected.some((entry) => entry === actual);
}

function applyExtractedValues(args: {
  step: GenericHttpStepDefinitionV1;
  payload: unknown;
  state: Record<string, unknown>;
}) {
  const extract = args.step.extract || {};
  for (const [key, expr] of Object.entries(extract)) {
    const value = resolveJsonPathWithFallback(args.payload, expr);
    if (typeof value !== "undefined") {
      args.state[key] = value;
    }
  }
}

function resolveRequestId(args: {
  state: Record<string, unknown>;
  responsePayload: unknown;
}) {
  const candidates = [
    args.state.request_id,
    args.state.batch_id,
    args.state.task_id,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) {
      return text;
    }
  }
  if (isObject(args.responsePayload)) {
    const payloadCandidates = [
      args.responsePayload.request_id,
      args.responsePayload.batch_id,
      args.responsePayload.task_id,
    ];
    for (const candidate of payloadCandidates) {
      const text = String(candidate || "").trim();
      if (text) {
        return text;
      }
    }
  }
  return `generic-http-${Date.now().toString(36)}`;
}

export class GenericHttpProvider implements Provider {
  readonly id = GENERIC_HTTP_BACKEND_TYPE;

  private readonly fetchImpl: FetchLike;

  constructor(args?: { fetchImpl?: FetchLike }) {
    this.fetchImpl = args?.fetchImpl || resolveFetchImpl();
  }

  getRuntimeOptionSchema() {
    return {};
  }

  normalizeRuntimeOptions() {
    return {};
  }

  supports(args: ProviderSupportsArgs) {
    return (
      args.backend.type === GENERIC_HTTP_BACKEND_TYPE &&
      (args.requestKind === "generic-http.request.v1" ||
        args.requestKind === "generic-http.steps.v1")
    );
  }

  private async executeSingleRequest(args: {
    request: GenericHttpRequestV1;
    backend: import("../../backends/types").BackendInstance;
  }) {
    if (!args.request?.request?.method || !args.request?.request?.path) {
      throw new Error(
        "Invalid generic-http request payload: request.method and request.path are required",
      );
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: this.id,
      component: "generic-http-provider",
      operation: "single-request",
      phase: "start",
      stage: "provider-http-start",
      message: "generic-http single request started",
      transport: {
        method: String(args.request.request.method || "").toUpperCase(),
        path: String(args.request.request.path || "").trim() || undefined,
      },
    });
    const headers = resolveBaseHeaders({ backend: args.backend });
    applyHeaderMap(headers, args.request.request.headers || {});
    if (
      typeof args.request.request.json !== "undefined" &&
      !headers.has("content-type")
    ) {
      headers.set("content-type", "application/json");
    }
    const response = await this.fetchImpl(
      buildUrl(args.backend.baseUrl, args.request.request.path),
      {
        method: args.request.request.method,
        headers: headersToObject(headers),
        ...(typeof args.request.request.json !== "undefined"
          ? { body: JSON.stringify(args.request.request.json) }
          : {}),
      },
    );
    const parsed = await readResponsePayload(response, "json");
    const resultJson = parsed.payload;
    let requestId = `generic-http-${Date.now().toString(36)}`;
    if (
      resultJson &&
      typeof resultJson === "object" &&
      typeof (resultJson as { request_id?: unknown }).request_id === "string"
    ) {
      requestId = (resultJson as { request_id: string }).request_id;
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: this.id,
      requestId,
      component: "generic-http-provider",
      operation: "single-request",
      phase: "terminal",
      stage: "provider-http-succeeded",
      message: "generic-http single request succeeded",
      transport: {
        method: String(args.request.request.method || "").toUpperCase(),
        path: String(args.request.request.path || "").trim() || undefined,
        status: response.status,
      },
    });
    return {
      status: "succeeded" as const,
      requestId,
      fetchType: "result" as const,
      resultJson,
      responseJson: resultJson,
    };
  }

  private async executeStepsRequest(args: {
    request: GenericHttpStepsRequestV1;
    backend: import("../../backends/types").BackendInstance;
  }): Promise<ProviderExecutionResult> {
    if (!Array.isArray(args.request.steps) || args.request.steps.length === 0) {
      throw new Error("generic-http.steps.v1 requires at least one step");
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: this.id,
      component: "generic-http-provider",
      operation: "steps-request",
      phase: "start",
      stage: "provider-http-steps-start",
      message: "generic-http steps request started",
      details: {
        steps: args.request.steps.length,
      },
    });
    const pollInterval = Math.max(0, args.request.poll?.interval_ms ?? 2000);
    const pollTimeout = Math.max(1, args.request.poll?.timeout_ms ?? 600000);
    const state: Record<string, unknown> = {
      ...(isObject(args.request.context) ? args.request.context : {}),
    };
    let lastPayload: unknown = {};
    let lastResponseKind: "json" | "text" | "bytes" = "json";
    let lastRequestSummary = "";

    for (const step of args.request.steps) {
      if (!step?.id || !step.request?.method) {
        throw new Error(
          "Invalid step definition: step.id and request.method are required",
        );
      }
      const startedAt = Date.now();
      let retryCount = 0;
      while (true) {
        const requestSpec = (() => {
          try {
            return interpolateValue(step.request, state);
          } catch (error) {
            rethrowWithInterpolationContext({
              error,
              stepId: step.id,
              state,
              lastPayload,
              lastRequestSummary,
            });
            throw error;
          }
        })();
        const url = resolveRequestUrl({
          baseUrl: args.backend.baseUrl,
          path: requestSpec.path,
          url: requestSpec.url,
        });
        const headers = resolveBaseHeaders({ backend: args.backend });
        applyHeaderMap(headers, requestSpec.headers || {});
        const init: RequestInit = {
          method: String(requestSpec.method || "").toUpperCase(),
        };
        if (typeof requestSpec.binary_from === "string") {
          init.body = await readFileBytes(requestSpec.binary_from);
        } else if (typeof requestSpec.json !== "undefined") {
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
          }
          init.body = JSON.stringify(requestSpec.json);
        }
        init.headers = headersToObject(headers);
        lastRequestSummary = summarizeRequestForDebug({
          stepId: step.id,
          url,
          requestSpec,
          headers: init.headers as Record<string, string>,
          body: init.body ?? null,
        });

        const requestStartedAt = Date.now();
        const response = await this.fetchImpl(url, init);
        const duration = Date.now() - requestStartedAt;
        appendRuntimeLog({
          level: "debug",
          scope: "provider",
          backendId: args.backend.id,
          backendType: args.backend.type,
          providerId: this.id,
          requestId:
            String(
              state.request_id || state.batch_id || state.task_id || "",
            ).trim() || undefined,
          component: "generic-http-provider",
          operation: "step",
          phase: "running",
          stage: "provider-http-step-response",
          message: `generic-http step ${step.id} responded`,
          transport: {
            stepId: step.id,
            method: String(requestSpec.method || "").toUpperCase(),
            url,
            path: String(requestSpec.path || "").trim() || undefined,
            status: response.status,
            duration,
            retry: retryCount,
          },
        });
        const parsed = await readResponsePayload(
          response,
          requestSpec.response_type || "json",
        );
        lastPayload = parsed.payload;
        lastResponseKind = parsed.kind;

        if (parsed.kind === "json") {
          checkFailCondition({
            step,
            payload: parsed.payload,
          });
          applyExtractedValues({
            step,
            payload: parsed.payload,
            state,
          });
          if (shouldRepeatStep({ step, payload: parsed.payload })) {
            if (Date.now() - startedAt > pollTimeout) {
              throw new Error(
                `Step ${step.id} polling timeout after ${pollTimeout}ms`,
              );
            }
            retryCount += 1;
            await sleep(pollInterval);
            continue;
          }
        } else if (step.repeat_until || step.fail_when || step.extract) {
          throw new Error(
            `Step ${step.id} uses json-only conditions on non-json response`,
          );
        }
        break;
      }
    }

    const requestId = resolveRequestId({
      state,
      responsePayload: lastPayload,
    });
    if (lastResponseKind === "bytes") {
      appendRuntimeLog({
        level: "info",
        scope: "provider",
        backendId: args.backend.id,
        backendType: args.backend.type,
        providerId: this.id,
        requestId,
        component: "generic-http-provider",
        operation: "steps-request",
        phase: "terminal",
        stage: "provider-http-steps-succeeded",
        message: "generic-http steps request succeeded with bundle output",
      });
      return {
        status: "succeeded",
        requestId,
        fetchType: "bundle",
        bundleBytes: lastPayload as Uint8Array,
        responseJson: isObject(lastPayload) ? lastPayload : undefined,
      };
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId: args.backend.id,
      backendType: args.backend.type,
      providerId: this.id,
      requestId,
      component: "generic-http-provider",
      operation: "steps-request",
      phase: "terminal",
      stage: "provider-http-steps-succeeded",
      message: "generic-http steps request succeeded with result output",
    });
    return {
      status: "succeeded",
      requestId,
      fetchType: "result",
      resultJson: lastPayload,
      responseJson: lastPayload,
    };
  }

  async execute(args: {
    requestKind: string;
    request: unknown;
    backend: import("../../backends/types").BackendInstance;
    providerOptions?: Record<string, unknown>;
  }): Promise<ProviderExecutionResult> {
    if (!this.supports(args)) {
      throw new Error(
        `Unsupported request kind/backend for GenericHttpProvider: requestKind=${args.requestKind}, backendType=${args.backend.type}`,
      );
    }
    try {
      if (args.requestKind === "generic-http.request.v1") {
        return await this.executeSingleRequest({
          request: args.request as GenericHttpRequestV1,
          backend: args.backend,
        });
      }
      if (args.requestKind === "generic-http.steps.v1") {
        return await this.executeStepsRequest({
          request: args.request as GenericHttpStepsRequestV1,
          backend: args.backend,
        });
      }
      throw new Error(
        `Unsupported request kind/backend for GenericHttpProvider: requestKind=${args.requestKind}, backendType=${args.backend.type}`,
      );
    } catch (error) {
      appendRuntimeLog({
        level: "error",
        scope: "provider",
        backendId: args.backend.id,
        backendType: args.backend.type,
        providerId: this.id,
        component: "generic-http-provider",
        operation: "execute",
        phase: "terminal",
        stage: "provider-execute-failed",
        message: "generic-http provider execute failed",
        error,
      });
      throw error;
    }
  }
}
