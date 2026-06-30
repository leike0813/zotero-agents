import { encodeBasicAuthHeader } from "../../backends/managementAuth";
import type { BackendManagementAuth } from "../../backends/types";
import {
  runSkillRunnerConnection,
  type SkillRunnerConnectionLane,
} from "../../modules/skillRunnerConnectionGovernor";
import { markSkillRunnerBackendHealthSuccess } from "../../modules/skillRunnerBackendHealthRegistry";
import {
  SkillRunnerHttpError,
  formatSkillRunnerHttpErrorMessage,
} from "./errors";
import {
  buildSkillRunnerHandshakeRequest,
  normalizeSkillRunnerHandshakeResponse,
  type SkillRunnerBackendCapabilities,
} from "../../modules/skillRunnerHandshakeProtocol";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const DEFAULT_MANAGEMENT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS = 5000;

export type SkillRunnerManagementRunSummary = {
  request_id: string;
  run_id: string;
  status: string;
  engine: string;
  model?: string;
  skill_id: string;
  updated_at: string;
  pending_interaction_id?: number | null;
  interaction_count?: number;
  [key: string]: unknown;
};

export type SkillRunnerManagementRunList = {
  runs: SkillRunnerManagementRunSummary[];
};

export type SkillRunnerManagementRunState = SkillRunnerManagementRunSummary & {
  error?: unknown;
};

export type SkillRunnerManagementPending = {
  request_id: string;
  status: string;
  pending?: unknown;
  pending_owner?: string;
  [key: string]: unknown;
};

export type SkillRunnerManagementAuthSession = {
  request_id: string;
  auth_session_id?: string;
  status?: string;
  phase?: string;
  provider_id?: string;
  engine?: string;
  prompt?: string;
  challenge_kind?: string;
  available_methods?: string[];
  accepts_chat_input?: boolean;
  input_kind?: string | null;
  auth_url?: string;
  user_code?: string;
  last_error?: string;
  [key: string]: unknown;
};

export type SkillRunnerManagementChatHistoryPayload = {
  request_id: string;
  count: number;
  events: Array<Record<string, unknown>>;
  cursor_floor: number;
  cursor_ceiling: number;
  source?: string;
};

export type SkillRunnerManagementEventHistoryPayload = {
  request_id: string;
  count: number;
  events: Array<Record<string, unknown>>;
  cursor_floor: number;
  cursor_ceiling: number;
  source?: string;
};

export type SkillRunnerManagementReplyPayload = {
  mode?: "interaction" | "auth";
  interaction_id?: number;
  response?: unknown;
  auth_session_id?: string;
  selection?: unknown;
  submission?: unknown;
  idempotency_key?: string;
};

export type SkillRunnerManagementReplyResponse = {
  request_id: string;
  status: string;
  accepted: boolean;
  mode?: "interaction" | "auth";
};

export type SkillRunnerManagementCancelResponse = {
  request_id: string;
  run_id: string;
  status: string;
  accepted: boolean;
  message: string;
};

export type SkillRunnerManagementAuthImportFile = {
  name: string;
  content_base64: string;
};

export type SkillRunnerManagementCredentials = {
  username: string;
  password: string;
};

export type SkillRunnerManagementAuthPromptReason = "unauthorized" | "missing";

export type SkillRunnerManagementClientArgs = {
  baseUrl: string;
  backendId?: string;
  fetchImpl?: FetchLike;
  requestTimeoutMs?: number;
  getManagementAuth?: () => BackendManagementAuth | undefined;
  saveManagementAuth?: (auth: BackendManagementAuth) => void;
  promptBasicAuth?: (args: {
    reason: SkillRunnerManagementAuthPromptReason;
  }) => Promise<SkillRunnerManagementCredentials | null>;
};

export type SkillRunnerManagementSseFrame = {
  event: string;
  data: unknown;
};

export type SkillRunnerManagementRequestOptions = {
  lane?: SkillRunnerConnectionLane;
  timeoutMs?: number;
  signal?: AbortSignal;
  lastFocusedAt?: number;
  allowGetFallback?: boolean;
};

type AbortLikeError = Error & {
  name: string;
};

function ensureLeadingSlash(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeTimeoutMs(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function readJsonBody(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

async function releaseResponseBody(response: Response) {
  try {
    if (response.body && typeof response.body.cancel === "function") {
      await response.body.cancel();
      return;
    }
    await response.arrayBuffer();
  } catch {
    // Best-effort release; callers should not fail after a successful response.
  }
}

function isUnauthorized(response: Response) {
  return response.status === 401;
}

function formatHttpError(args: {
  response: Response;
  body: unknown;
  path: string;
}) {
  return new SkillRunnerHttpError({
    message: formatSkillRunnerHttpErrorMessage({
      prefix: "SkillRunner management request failed",
      path: args.path,
      status: args.response.status,
      body: args.body,
    }),
    status: args.response.status,
    statusText: args.response.statusText,
    path: args.path,
    body: args.body,
  });
}

function parseBasicCredentials(auth: BackendManagementAuth | undefined | null) {
  if (!auth || auth.kind !== "basic") {
    return null;
  }
  const username = String(auth.username || "").trim();
  const password = String(auth.password || "").trim();
  if (!username || !password) {
    return null;
  }
  return { username, password };
}

function normalizeUrl(baseUrl: string, path: string, query?: URLSearchParams) {
  const normalizedBase = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  const url = `${normalizedBase}${ensureLeadingSlash(path)}`;
  if (!query || Array.from(query.keys()).length === 0) {
    return url;
  }
  return `${url}?${query.toString()}`;
}

function createAbortError(): AbortLikeError {
  const runtime = globalThis as {
    DOMException?: new (message?: string, name?: string) => Error;
  };
  if (typeof runtime.DOMException === "function") {
    return new runtime.DOMException(
      "The operation was aborted.",
      "AbortError",
    ) as AbortLikeError;
  }
  const error = new Error("The operation was aborted.") as AbortLikeError;
  error.name = "AbortError";
  return error;
}

export function isAbortErrorLike(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    String((error as { name?: unknown }).name || "").trim() === "AbortError"
  );
}

function throwIfAborted(signal?: AbortSignal | null) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function decodeBase64ToBytes(input: string) {
  const normalized = String(input || "").trim();
  if (!normalized) {
    return new Uint8Array();
  }
  const runtime = globalThis as {
    atob?: (raw: string) => string;
    Buffer?: {
      from: (raw: string, encoding: string) => Uint8Array;
    };
  };
  if (typeof runtime.atob === "function") {
    const binary = runtime.atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      out[index] = binary.charCodeAt(index) & 0xff;
    }
    return out;
  }
  if (runtime.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(normalized, "base64"));
  }
  throw new Error("base64 decoder is unavailable in current runtime");
}

function findSseFrameBoundary(buffer: string) {
  const match = /\r?\n\r?\n/.exec(buffer);
  if (!match || typeof match.index !== "number") {
    return null;
  }
  return {
    index: match.index,
    length: match[0].length,
  };
}

async function streamSseResponse(args: {
  response: Response;
  onFrame: (frame: SkillRunnerManagementSseFrame) => void;
  signal?: AbortSignal;
}) {
  throwIfAborted(args.signal);
  const body = args.response.body;
  if (!body || typeof body.getReader !== "function") {
    throw new Error("SSE stream is unavailable in current runtime");
  }
  const runtime = globalThis as {
    TextDecoder?: new (encoding?: string) => {
      decode: (
        input: Uint8Array,
        options?: {
          stream?: boolean;
        },
      ) => string;
    };
  };
  let textDecoderCtor = runtime.TextDecoder;
  if (typeof textDecoderCtor !== "function") {
    const util = await dynamicImport("util");
    textDecoderCtor = util.TextDecoder;
    runtime.TextDecoder = util.TextDecoder;
  }
  if (typeof textDecoderCtor !== "function") {
    throw new Error("TextDecoder is unavailable in current runtime");
  }
  const decoder = new textDecoderCtor("utf-8");
  const reader = body.getReader() as {
    read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    cancel?: (reason?: unknown) => Promise<void>;
    releaseLock?: () => void;
  };
  let buffer = "";
  let aborted = false;
  let completed = false;

  const emitFrame = (rawFrame: string) => {
    const lines = rawFrame.split(/\r?\n/);
    let event = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim() || "message";
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }
    if (dataLines.length === 0) {
      return;
    }
    const joined = dataLines.join("\n");
    let data: unknown = joined;
    try {
      data = JSON.parse(joined);
    } catch {
      data = joined;
    }
    args.onFrame({
      event,
      data,
    });
  };

  const abortListener = () => {
    aborted = true;
    if (typeof reader.cancel === "function") {
      void reader.cancel(createAbortError()).catch(() => {});
    }
  };
  args.signal?.addEventListener("abort", abortListener, { once: true });
  try {
    throwIfAborted(args.signal);
    while (true) {
      throwIfAborted(args.signal);
      let next: { done: boolean; value?: Uint8Array };
      try {
        next = await reader.read();
      } catch (error) {
        if (aborted || isAbortErrorLike(error)) {
          throw createAbortError();
        }
        throw error;
      }
      if (aborted) {
        throw createAbortError();
      }
      if (next.done) {
        buffer += decoder.decode(new Uint8Array());
        completed = true;
        break;
      }
      buffer += decoder.decode(next.value || new Uint8Array(), {
        stream: true,
      });
      let boundary = findSseFrameBoundary(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index).trim();
        buffer = buffer.slice(boundary.index + boundary.length);
        if (frame) {
          emitFrame(frame);
        }
        boundary = findSseFrameBoundary(buffer);
      }
    }
    throwIfAborted(args.signal);
    const tail = buffer.trim();
    if (tail) {
      emitFrame(tail);
    }
  } finally {
    args.signal?.removeEventListener("abort", abortListener);
    if (!completed && typeof reader.cancel === "function") {
      await reader.cancel(createAbortError()).catch(() => {});
    }
    if (typeof reader.releaseLock === "function") {
      try {
        reader.releaseLock();
      } catch {
        // Some runtimes throw if the stream is already released.
      }
    }
  }
}

export class SkillRunnerManagementClient {
  private readonly baseUrl: string;

  private readonly backendId: string;

  private readonly fetchImpl: FetchLike;

  private readonly requestTimeoutMs: number;

  private readonly getManagementAuth?: () => BackendManagementAuth | undefined;

  private readonly saveManagementAuth?: (auth: BackendManagementAuth) => void;

  private readonly promptBasicAuth?: (args: {
    reason: SkillRunnerManagementAuthPromptReason;
  }) => Promise<SkillRunnerManagementCredentials | null>;

  constructor(args: SkillRunnerManagementClientArgs) {
    this.baseUrl = String(args.baseUrl || "")
      .trim()
      .replace(/\/+$/, "");
    if (!this.baseUrl) {
      throw new Error("baseUrl is required");
    }
    this.backendId = normalizeString(args.backendId) || this.baseUrl;
    this.requestTimeoutMs = normalizeTimeoutMs(
      args.requestTimeoutMs,
      DEFAULT_MANAGEMENT_REQUEST_TIMEOUT_MS,
    );
    const runtimeFetch = (globalThis as { fetch?: FetchLike }).fetch;
    this.fetchImpl = args.fetchImpl || (runtimeFetch as FetchLike);
    if (typeof this.fetchImpl !== "function") {
      throw new Error("fetch() is unavailable in current runtime");
    }
    this.getManagementAuth = args.getManagementAuth;
    this.saveManagementAuth = args.saveManagementAuth;
    this.promptBasicAuth = args.promptBasicAuth;
  }

  private buildHeaders(args?: {
    extra?: Record<string, string>;
    auth?: SkillRunnerManagementCredentials | null;
  }) {
    const headers: Record<string, string> = {
      ...(args?.extra || {}),
    };
    const auth = args?.auth;
    if (auth) {
      headers.authorization = encodeBasicAuthHeader({
        username: auth.username,
        password: auth.password,
      });
    }
    return headers;
  }

  private resolveStoredCredentials() {
    const auth = this.getManagementAuth?.();
    return parseBasicCredentials(auth);
  }

  private async requestWithAuthRetry<T = unknown>(args: {
    path: string;
    method: string;
    query?: URLSearchParams;
    headers?: Record<string, string>;
    body?: BodyInit;
    expectJson?: boolean;
    allowUnauthorizedRetry?: boolean;
    lane?: SkillRunnerConnectionLane;
    timeoutMs?: number;
    stream?: boolean;
    lastFocusedAt?: number;
    requestId?: string;
    operation?: string;
    signal?: AbortSignal;
    consumeResponse?: (response: Response, signal?: AbortSignal) => Promise<T>;
  }) {
    const url = normalizeUrl(this.baseUrl, args.path, args.query);
    const lane = args.lane || "maintenance";
    const timeoutMs =
      args.stream === true
        ? 0
        : normalizeTimeoutMs(args.timeoutMs, this.requestTimeoutMs);
    return runSkillRunnerConnection({
      backendId: this.backendId,
      lane,
      requestId: normalizeString(args.requestId) || undefined,
      operation:
        normalizeString(args.operation) ||
        `${normalizeString(args.method) || "GET"} ${args.path}`,
      lastFocusedAt: args.lastFocusedAt,
      timeoutMs,
      stream: args.stream === true,
      signal: args.signal,
      task: async (signal) => {
        let credentials = this.resolveStoredCredentials();
        throwIfAborted(signal);
        let response = await this.fetchImpl(url, {
          method: args.method,
          headers: this.buildHeaders({
            extra: args.headers,
            auth: credentials,
          }),
          body: args.body,
          signal,
        });

        if (
          args.allowUnauthorizedRetry !== false &&
          isUnauthorized(response) &&
          typeof this.promptBasicAuth === "function"
        ) {
          const prompted = await this.promptBasicAuth({
            reason: credentials ? "unauthorized" : "missing",
          });
          if (prompted && prompted.username && prompted.password) {
            credentials = prompted;
            this.saveManagementAuth?.({
              kind: "basic",
              username: prompted.username,
              password: prompted.password,
            });
            throwIfAborted(signal);
            response = await this.fetchImpl(url, {
              method: args.method,
              headers: this.buildHeaders({
                extra: args.headers,
                auth: credentials,
              }),
              body: args.body,
              signal,
            });
          }
        }

        if (!response.ok) {
          const body = await readJsonBody(response);
          throw formatHttpError({
            response,
            body,
            path: args.path,
          });
        }
        markSkillRunnerBackendHealthSuccess(this.backendId);
        if (args.consumeResponse) {
          return args.consumeResponse(response, signal);
        }
        if (args.expectJson === false) {
          await releaseResponseBody(response);
          return response as T;
        }
        return readJsonBody(response) as Promise<T>;
      },
    });
  }

  async listRuns(
    args?: { limit?: number } & SkillRunnerManagementRequestOptions,
  ) {
    const query = new URLSearchParams();
    const limit = Math.max(1, Math.min(1000, Number(args?.limit || 200)));
    query.set("limit", String(limit));
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: "/v1/management/runs",
      query,
      lane: args?.lane || "maintenance",
      timeoutMs: args?.timeoutMs,
      signal: args?.signal,
    });
    const runs = Array.isArray((body as { runs?: unknown }).runs)
      ? ((body as { runs: unknown[] }).runs.filter(
          isObject,
        ) as SkillRunnerManagementRunSummary[])
      : [];
    return {
      runs,
    } as SkillRunnerManagementRunList;
  }

  async probeReachability(args?: SkillRunnerManagementRequestOptions) {
    let lastError: unknown;
    const methods: Array<"HEAD" | "GET"> =
      args?.allowGetFallback === true ? ["HEAD", "GET"] : ["HEAD"];
    for (const method of methods) {
      try {
        await this.requestWithAuthRetry({
          method,
          path: "/v1/system/ping",
          expectJson: false,
          lane: args?.lane || "health",
          timeoutMs: args?.timeoutMs || DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS,
          signal: args?.signal,
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("skillrunner reachability probe failed");
  }

  async handshake(
    args?: {
      requestedProtocols?: readonly string[];
    } & SkillRunnerManagementRequestOptions,
  ): Promise<SkillRunnerBackendCapabilities> {
    const body = await this.requestWithAuthRetry({
      method: "POST",
      path: "/v1/system/handshake",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildSkillRunnerHandshakeRequest({
          requestedProtocols: args?.requestedProtocols,
        }),
      ),
      lane: args?.lane || "health",
      timeoutMs: args?.timeoutMs || DEFAULT_MANAGEMENT_PROBE_TIMEOUT_MS,
      signal: args?.signal,
    });
    return normalizeSkillRunnerHandshakeResponse(body);
  }

  async getRun(
    args: { requestId: string } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}`,
      lane: args.lane || "background",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management run detail response must be object");
    }
    return body as SkillRunnerManagementRunState;
  }

  async listRunChatHistory(
    args: {
      requestId: string;
      fromSeq?: number;
      toSeq?: number;
    } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const query = new URLSearchParams();
    if (typeof args.fromSeq === "number" && Number.isFinite(args.fromSeq)) {
      query.set("from_seq", String(Math.max(0, Math.floor(args.fromSeq))));
    }
    if (typeof args.toSeq === "number" && Number.isFinite(args.toSeq)) {
      query.set("to_seq", String(Math.max(0, Math.floor(args.toSeq))));
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/chat/history`,
      query,
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management chat history response must be object");
    }
    const events = Array.isArray(body.events)
      ? body.events.filter(isObject)
      : [];
    return {
      request_id: String(body.request_id || requestId),
      count: events.length,
      events,
      cursor_floor: Number(body.cursor_floor || 0),
      cursor_ceiling: Number(body.cursor_ceiling || 0),
      source: String(body.source || "unknown"),
    } as SkillRunnerManagementChatHistoryPayload;
  }

  async listRunEventHistory(
    args: {
      requestId: string;
      fromSeq?: number;
      toSeq?: number;
      fromTs?: string;
      toTs?: string;
    } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const query = new URLSearchParams();
    if (typeof args.fromSeq === "number" && Number.isFinite(args.fromSeq)) {
      query.set("from_seq", String(Math.max(0, Math.floor(args.fromSeq))));
    }
    if (typeof args.toSeq === "number" && Number.isFinite(args.toSeq)) {
      query.set("to_seq", String(Math.max(0, Math.floor(args.toSeq))));
    }
    const fromTs = String(args.fromTs || "").trim();
    if (fromTs) {
      query.set("from_ts", fromTs);
    }
    const toTs = String(args.toTs || "").trim();
    if (toTs) {
      query.set("to_ts", toTs);
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/events/history`,
      query,
      lane: args.lane || "background",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management events history response must be object");
    }
    const events = Array.isArray(body.events)
      ? body.events.filter(isObject)
      : [];
    return {
      request_id: String(body.request_id || requestId),
      count: events.length,
      events,
      cursor_floor: Number(body.cursor_floor || 0),
      cursor_ceiling: Number(body.cursor_ceiling || 0),
      source: String(body.source || "unknown"),
    } as SkillRunnerManagementEventHistoryPayload;
  }

  async getPending(
    args: { requestId: string } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/pending`,
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management pending response must be object");
    }
    return body as SkillRunnerManagementPending;
  }

  async getAuthSession(
    args: { requestId: string } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/auth/session`,
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management auth session response must be object");
    }
    return body as SkillRunnerManagementAuthSession;
  }

  async submitReply(
    args: {
      requestId: string;
      payload: SkillRunnerManagementReplyPayload;
    } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "POST",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/reply`,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(args.payload || {}),
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management reply response must be object");
    }
    return body as SkillRunnerManagementReplyResponse;
  }

  async cancelRun(
    args: { requestId: string } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "POST",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/cancel`,
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("management cancel response must be object");
    }
    return body as SkillRunnerManagementCancelResponse;
  }

  async submitAuthImport(
    args: {
      requestId: string;
      providerId?: string;
      files: SkillRunnerManagementAuthImportFile[];
    } & SkillRunnerManagementRequestOptions,
  ) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const files = Array.isArray(args.files) ? args.files : [];
    if (files.length === 0) {
      throw new Error("files are required");
    }
    const form = new FormData();
    const providerId = String(args.providerId || "")
      .trim()
      .toLowerCase();
    if (providerId) {
      form.append("provider_id", providerId);
    }
    for (const file of files) {
      const name = String(file?.name || "").trim();
      const contentBase64 = String(file?.content_base64 || "").trim();
      if (!name || !contentBase64) {
        continue;
      }
      const bytes = decodeBase64ToBytes(contentBase64);
      const blob = new Blob([bytes], {
        type: "application/octet-stream",
      });
      form.append("files", blob, name);
    }
    const body = await this.requestWithAuthRetry({
      method: "POST",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/auth/import`,
      body: form,
      lane: args.lane || "foreground-query",
      timeoutMs: args.timeoutMs,
      signal: args.signal,
      requestId,
    });
    if (!isObject(body)) {
      throw new Error("auth import response must be object");
    }
    return body as SkillRunnerManagementReplyResponse;
  }

  async streamRunChat(args: {
    requestId: string;
    cursor?: number;
    onFrame: (frame: SkillRunnerManagementSseFrame) => void;
    signal?: AbortSignal;
    lastFocusedAt?: number;
  }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const query = new URLSearchParams();
    const cursor = Math.max(0, Math.floor(Number(args.cursor || 0)));
    query.set("cursor", String(cursor));
    await this.requestWithAuthRetry<void>({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/chat`,
      query,
      headers: {
        accept: "text/event-stream",
      },
      expectJson: false,
      signal: args.signal,
      lane: "foreground-stream",
      stream: true,
      lastFocusedAt: args.lastFocusedAt,
      requestId,
      consumeResponse: (response, signal) =>
        streamSseResponse({
          response,
          onFrame: args.onFrame,
          signal,
        }),
    });
  }

  async streamRunEvents(args: {
    requestId: string;
    cursor?: number;
    onFrame: (frame: SkillRunnerManagementSseFrame) => void;
    signal?: AbortSignal;
  }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const query = new URLSearchParams();
    const cursor = Math.max(0, Math.floor(Number(args.cursor || 0)));
    query.set("cursor", String(cursor));
    await this.requestWithAuthRetry<void>({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/events`,
      query,
      headers: {
        accept: "text/event-stream",
      },
      expectJson: false,
      signal: args.signal,
      lane: "background",
      stream: true,
      requestId,
      consumeResponse: (response, signal) =>
        streamSseResponse({
          response,
          onFrame: args.onFrame,
          signal,
        }),
    });
  }
}
