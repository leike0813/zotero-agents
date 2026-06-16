import { encodeBasicAuthHeader } from "../../backends/managementAuth";
import type { BackendManagementAuth } from "../../backends/types";
import {
  SkillRunnerHttpError,
  formatSkillRunnerHttpErrorMessage,
} from "./errors";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

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

export type SkillRunnerManagementAuthPromptReason =
  | "unauthorized"
  | "missing";

export type SkillRunnerManagementClientArgs = {
  baseUrl: string;
  fetchImpl?: FetchLike;
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

type AbortLikeError = Error & {
  name: string;
};

function ensureLeadingSlash(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
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
  const normalizedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
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
  };
  let buffer = "";
  let aborted = false;

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
        break;
      }
      buffer += decoder.decode(next.value || new Uint8Array(), { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (frame) {
          emitFrame(frame);
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    throwIfAborted(args.signal);
    const tail = buffer.trim();
    if (tail) {
      emitFrame(tail);
    }
  } finally {
    args.signal?.removeEventListener("abort", abortListener);
  }
}

export class SkillRunnerManagementClient {
  private readonly baseUrl: string;

  private readonly fetchImpl: FetchLike;

  private readonly getManagementAuth?: () => BackendManagementAuth | undefined;

  private readonly saveManagementAuth?: (auth: BackendManagementAuth) => void;

  private readonly promptBasicAuth?: (args: {
    reason: SkillRunnerManagementAuthPromptReason;
  }) => Promise<SkillRunnerManagementCredentials | null>;

  constructor(args: SkillRunnerManagementClientArgs) {
    this.baseUrl = String(args.baseUrl || "").trim().replace(/\/+$/, "");
    if (!this.baseUrl) {
      throw new Error("baseUrl is required");
    }
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

  private async requestWithAuthRetry(args: {
    path: string;
    method: string;
    query?: URLSearchParams;
    headers?: Record<string, string>;
    body?: BodyInit;
    expectJson?: boolean;
    allowUnauthorizedRetry?: boolean;
    signal?: AbortSignal;
  }) {
    const url = normalizeUrl(this.baseUrl, args.path, args.query);
    let credentials = this.resolveStoredCredentials();
    throwIfAborted(args.signal);
    let response = await this.fetchImpl(url, {
      method: args.method,
      headers: this.buildHeaders({
        extra: args.headers,
        auth: credentials,
      }),
      body: args.body,
      signal: args.signal,
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
        throwIfAborted(args.signal);
        response = await this.fetchImpl(url, {
          method: args.method,
          headers: this.buildHeaders({
            extra: args.headers,
            auth: credentials,
          }),
          body: args.body,
          signal: args.signal,
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
    if (args.expectJson === false) {
      return response;
    }
    return readJsonBody(response);
  }

  async listRuns(args?: { limit?: number }) {
    const query = new URLSearchParams();
    const limit = Math.max(1, Math.min(1000, Number(args?.limit || 200)));
    query.set("limit", String(limit));
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: "/v1/management/runs",
      query,
    });
    const runs = Array.isArray((body as { runs?: unknown }).runs)
      ? ((body as { runs: unknown[] }).runs.filter(isObject) as SkillRunnerManagementRunSummary[])
      : [];
    return {
      runs,
    } as SkillRunnerManagementRunList;
  }

  async probeReachability() {
    let lastError: unknown;
    const methods: Array<"HEAD" | "GET"> = ["HEAD", "GET"];
    for (const method of methods) {
      try {
        await this.requestWithAuthRetry({
          method,
          path: "/v1/system/ping",
          expectJson: false,
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("skillrunner reachability probe failed");
  }

  async getRun(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}`,
    });
    if (!isObject(body)) {
      throw new Error("management run detail response must be object");
    }
    return body as SkillRunnerManagementRunState;
  }

  async listRunChatHistory(args: {
    requestId: string;
    fromSeq?: number;
    toSeq?: number;
  }) {
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

  async listRunEventHistory(args: {
    requestId: string;
    fromSeq?: number;
    toSeq?: number;
    fromTs?: string;
    toTs?: string;
  }) {
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

  async getPending(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/interaction/pending`,
    });
    if (!isObject(body)) {
      throw new Error("management pending response must be object");
    }
    return body as SkillRunnerManagementPending;
  }

  async getAuthSession(args: { requestId: string }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const body = await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/auth/session`,
    });
    if (!isObject(body)) {
      throw new Error("management auth session response must be object");
    }
    return body as SkillRunnerManagementAuthSession;
  }

  async submitReply(args: {
    requestId: string;
    payload: SkillRunnerManagementReplyPayload;
  }) {
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
    });
    if (!isObject(body)) {
      throw new Error("management reply response must be object");
    }
    return body as SkillRunnerManagementReplyResponse;
  }

  async cancelRun(args: { requestId: string }) {
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
    });
    if (!isObject(body)) {
      throw new Error("management cancel response must be object");
    }
    return body as SkillRunnerManagementCancelResponse;
  }

  async submitAuthImport(args: {
    requestId: string;
    providerId?: string;
    files: SkillRunnerManagementAuthImportFile[];
  }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const files = Array.isArray(args.files) ? args.files : [];
    if (files.length === 0) {
      throw new Error("files are required");
    }
    const form = new FormData();
    const providerId = String(args.providerId || "").trim().toLowerCase();
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
  }) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
      throw new Error("requestId is required");
    }
    const query = new URLSearchParams();
    const cursor = Math.max(0, Math.floor(Number(args.cursor || 0)));
    query.set("cursor", String(cursor));
    const response = (await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/chat`,
      query,
      headers: {
        accept: "text/event-stream",
      },
      expectJson: false,
      signal: args.signal,
    })) as Response;
    await streamSseResponse({
      response,
      onFrame: args.onFrame,
      signal: args.signal,
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
    const response = (await this.requestWithAuthRetry({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(requestId)}/events`,
      query,
      headers: {
        accept: "text/event-stream",
      },
      expectJson: false,
      signal: args.signal,
    })) as Response;
    await streamSseResponse({
      response,
      onFrame: args.onFrame,
      signal: args.signal,
    });
  }
}
