/**
 * Zotero-native outbound HTTP boundary for the Built-in Pi runtime.
 *
 * Every request goes through the shared {@link ./piOutboundNetworkPolicy}
 * facts: URL and literal-IP checks, full A/AAAA DNS classification, the actual
 * connected peer, per-hop redirect revalidation, and the credential rules.
 * The Mozilla channel is anonymous, cache-free and cookie-free; redirects are
 * never followed by the channel itself, so each hop is policy-checked here.
 */
import {
  PI_OUTBOUND_IDLE_TIMEOUT_MS,
  PI_OUTBOUND_MAX_BODY_BYTES,
  PI_OUTBOUND_MAX_REDIRECTS,
  PI_OUTBOUND_TOTAL_TIMEOUT_MS,
  PiOutboundNetworkError,
  assertPiOutboundPeerAllowed,
  assertPiOutboundResolvedAllowed,
  assertPiOutboundUrlShapeAllowed,
  classifyPiOutboundAddress,
  classifyPiOutboundResolvedLocation,
  classifyPiOutboundUrl,
  type PiOutboundUrlLocation,
} from "./piOutboundNetworkPolicy";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import { resolveRuntimeWindowCandidates } from "../utils/runtimeBridge";

export { PiOutboundNetworkError } from "./piOutboundNetworkPolicy";

export type PiNativeResponseHead = {
  status: number;
  headers: Record<string, string>;
  peerAddress?: string;
  url: string;
};

export type PiNativeExchange = {
  /** Resolves once response headers are known; rejects on transport failure. */
  head: Promise<PiNativeResponseHead>;
  /** Decompressed response body; errors when the bound, timeout or abort hits. */
  body: ReadableStream;
  abort(): void;
};

export type PiNativeHttpOptions = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: Uint8Array;
  signal: AbortSignal;
  maxBodyBytes: number;
  idleTimeoutMs: number;
  totalTimeoutMs: number;
};

/** Native seam: one injected implementation per test, Mozilla in production. */
export type PiNativeHttpTransport = {
  resolve(hostname: string): Promise<string[]>;
  open(options: PiNativeHttpOptions): PiNativeExchange;
};

export type PiBrokeredWebHttpRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Uint8Array | string;
  signal?: AbortSignal;
  localNetworkApprovedOrigin?: string;
  credentialed?: boolean;
  maxBodyBytes?: number;
  maxRedirects?: number;
  allowRedirects?: boolean;
  /** When set, every redirect hop must keep this exact origin. */
  redirectOrigin?: string;
};

export type PiBrokeredWebHttpResponse = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
};

export type PiBrokeredWebHttpDependencies = {
  transport?: PiNativeHttpTransport;
  now?: () => number;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Bound a promise by a budget and an abort signal. Used for DNS, header and
 * body waits so no phase can stall past the caller's deadline.
 */
function bounded<T>(
  promise: Promise<T>,
  ms: number,
  signal: AbortSignal,
  code: string,
): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new PiOutboundNetworkError("pi_network_aborted"));
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new PiOutboundNetworkError("pi_network_aborted"));
    };
    const timer = setTimeout(
      () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener?.("abort", onAbort);
        reject(new PiOutboundNetworkError(code));
      },
      Math.max(1, Math.floor(ms)),
    );
    signal.addEventListener?.("abort", onAbort, { once: true });
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener?.("abort", onAbort);
      fn();
    };
    promise.then(
      (value) => done(() => resolve(value)),
      (error) => done(() => reject(error)),
    );
  });
}

export type PiBrokeredWebOperationKind =
  | "fetch"
  | "brave"
  | "perplexity"
  | "openai"
  | "anthropic"
  | "searxng";

export type PiBrokeredWebOperation = {
  kind: PiBrokeredWebOperationKind;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  localNetworkApprovedOrigin?: string;
};

export type PiBrokeredWebOperationProfile = {
  /** Pinned origin, or undefined for caller-selected anonymous/user origins. */
  origin?: string;
  /** Pinned request path, or undefined when the caller selects it. */
  path?: string;
  method: "GET" | "POST";
  credentialed: boolean;
  headers: readonly string[];
  bodyAllowed: boolean;
  allowRedirects: boolean;
  /** Redirects are followed only within the pinned (or requested) origin. */
  sameOriginRedirects: boolean;
};

/**
 * Closed operation profiles. Callers do not choose method, redirect behaviour,
 * credential policy, origin, path or permitted headers; every accepted
 * `kind` fixes them. The Anthropic kind targets the official Messages API
 * at `https://api.anthropic.com/v1/messages` with `x-api-key` and
 * `anthropic-version`.
 */
export const PI_BROKERED_WEB_OPERATION_PROFILES: Record<
  PiBrokeredWebOperationKind,
  PiBrokeredWebOperationProfile
> = {
  fetch: {
    method: "GET",
    credentialed: false,
    headers: [],
    bodyAllowed: false,
    allowRedirects: true,
    sameOriginRedirects: false,
  },
  brave: {
    origin: "https://api.search.brave.com",
    path: "/res/v1/web/search",
    method: "GET",
    credentialed: true,
    headers: ["accept", "x-subscription-token"],
    bodyAllowed: false,
    allowRedirects: true,
    sameOriginRedirects: true,
  },
  perplexity: {
    origin: "https://api.perplexity.ai",
    path: "/search",
    method: "POST",
    credentialed: true,
    headers: ["accept", "content-type", "authorization"],
    bodyAllowed: true,
    allowRedirects: true,
    sameOriginRedirects: true,
  },
  openai: {
    origin: "https://api.openai.com",
    path: "/v1/responses",
    method: "POST",
    credentialed: true,
    headers: ["accept", "content-type", "authorization", "openai-beta"],
    bodyAllowed: true,
    allowRedirects: true,
    sameOriginRedirects: true,
  },
  anthropic: {
    origin: "https://api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    credentialed: true,
    headers: ["accept", "content-type", "x-api-key", "anthropic-version"],
    bodyAllowed: true,
    allowRedirects: true,
    sameOriginRedirects: true,
  },
  searxng: {
    method: "GET",
    credentialed: false,
    headers: ["accept", "authorization"],
    bodyAllowed: false,
    allowRedirects: true,
    sameOriginRedirects: true,
  },
};

function fail(code: string): never {
  throw new PiOutboundNetworkError(code);
}

/** Host-independent signal for the transient internal budgets. */
function newAbortSignal(): AbortSignal {
  const Controller = resolveNativeAbortControllerConstructor();
  if (!Controller) fail("pi_network_transport_unavailable");
  return new Controller().signal;
}

function encodeBody(
  body: Uint8Array | string | undefined,
): Uint8Array | undefined {
  if (body === undefined) return undefined;
  return typeof body === "string" ? new TextEncoder().encode(body) : body;
}

function bound(
  value: number | undefined,
  max: number,
  fallback: number,
): number {
  const candidate = Number.isFinite(value)
    ? Math.floor(value as number)
    : fallback;
  if (candidate < 1) fail("pi_network_invalid_url");
  return Math.min(candidate, max);
}

function responseHeaders(raw: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw)) {
    const key = name.toLowerCase();
    // The body is already decompressed and cookies never apply anonymously.
    if (
      key === "set-cookie" ||
      key === "set-cookie2" ||
      key === "content-encoding" ||
      key === "content-length" ||
      key === "transfer-encoding"
    )
      continue;
    headers[key] = value;
  }
  return headers;
}

async function readBounded(
  exchange: PiNativeExchange,
  maxBodyBytes: number,
): Promise<Uint8Array> {
  const reader = exchange.body.getReader() as unknown as {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    releaseLock?: () => void;
  };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBodyBytes) fail("pi_network_body_too_large");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function drain(exchange: PiNativeExchange): Promise<void> {
  try {
    const reader = exchange.body.getReader() as unknown as {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      releaseLock?: () => void;
    };
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }
    reader.releaseLock?.();
  } catch {
    /* The failure code comes from the head status. */
  }
}

/**
 * One anonymous request with per-hop policy enforcement. Returns the final
 * status, filtered headers and the bounded decompressed body.
 */
export async function requestPiBrokeredWebHttp(
  request: PiBrokeredWebHttpRequest,
  dependencies: PiBrokeredWebHttpDependencies = {},
): Promise<PiBrokeredWebHttpResponse> {
  const transport = dependencies.transport ?? defaultTransport();
  if (!transport) fail("pi_network_transport_unavailable");
  const now = dependencies.now ?? (() => Date.now());
  const requestedUrl = String(request.url || "");
  const credentialed = request.credentialed === true;
  const localNetworkApprovedOrigin = request.localNetworkApprovedOrigin;
  const allowRedirects = request.allowRedirects !== false;
  const redirectOrigin = request.redirectOrigin;
  const maxBodyBytes = bound(
    request.maxBodyBytes,
    PI_OUTBOUND_MAX_BODY_BYTES,
    PI_OUTBOUND_MAX_BODY_BYTES,
  );
  const maxRedirects = Number.isFinite(request.maxRedirects)
    ? Math.max(
        0,
        Math.min(request.maxRedirects as number, PI_OUTBOUND_MAX_REDIRECTS),
      )
    : PI_OUTBOUND_MAX_REDIRECTS;
  const signal = request.signal ?? newAbortSignal();
  const deadline = now() + PI_OUTBOUND_TOTAL_TIMEOUT_MS;
  let url = requestedUrl;
  let method = String(request.method || "GET").toUpperCase();
  let body = encodeBody(request.body);

  for (let hop = 0; ; hop += 1) {
    if (signal.aborted) fail("pi_network_aborted");
    const facts = classifyPiOutboundUrl(url);
    const policy = { facts, credentialed, localNetworkApprovedOrigin };
    // Reject shape violations before any DNS lookup or connection.
    assertPiOutboundUrlShapeAllowed(facts);
    const budget = () => {
      const remaining = deadline - now();
      if (remaining <= 0) fail("pi_network_timeout");
      return remaining;
    };
    // Spend the deadline check before any lookup is dispatched.
    const dnsBudget = budget();
    const addresses = await bounded(
      transport.resolve(facts.hostname),
      dnsBudget,
      signal,
      "pi_network_timeout",
    );
    const location: PiOutboundUrlLocation = assertPiOutboundResolvedAllowed({
      ...policy,
      addresses,
    });
    const exchange = transport.open({
      url: facts.url,
      method,
      headers: { ...(request.headers || {}) },
      body,
      signal,
      maxBodyBytes,
      idleTimeoutMs: PI_OUTBOUND_IDLE_TIMEOUT_MS,
      totalTimeoutMs: Math.max(1, deadline - now()),
    });
    let head: PiNativeResponseHead;
    try {
      head = await bounded(
        exchange.head,
        budget(),
        signal,
        "pi_network_timeout",
      );
      assertPiOutboundPeerAllowed({
        ...policy,
        peerAddress: head.peerAddress,
        expected: location,
      });
    } catch (error) {
      exchange.abort();
      throw error;
    }
    const headers = responseHeaders(head.headers);
    if (REDIRECT_STATUSES.has(head.status)) {
      if (!allowRedirects) {
        exchange.abort();
        fail("pi_network_redirect_denied");
      }
      if (hop >= maxRedirects) {
        exchange.abort();
        fail("pi_network_too_many_redirects");
      }
      const location_ = headers.location;
      exchange.abort();
      if (!location_) fail("pi_network_redirect_denied");
      let next: URL;
      try {
        next = new URL(location_, facts.url);
      } catch {
        fail("pi_network_redirect_denied");
      }
      if (
        head.status === 303 ||
        ((head.status === 301 || head.status === 302) && method === "POST")
      ) {
        method = "GET";
        body = undefined;
      }
      url = next.href;
      if (redirectOrigin && next.origin !== redirectOrigin)
        fail("pi_network_redirect_denied");
      continue;
    }
    if (!head.status) {
      await drain(exchange);
      fail("pi_network_failed");
    }
    let responseBody: Uint8Array;
    try {
      responseBody = await bounded(
        readBounded(exchange, maxBodyBytes),
        budget(),
        signal,
        "pi_network_timeout",
      );
    } catch (error) {
      exchange.abort();
      throw error;
    }
    return {
      requestedUrl,
      finalUrl: facts.url,
      status: head.status,
      headers,
      body: responseBody,
    };
  }
}

/**
 * Closed-operation entry point. The accepted `kind` fixes method, origin,
 * path, credential policy, redirect behaviour and the permitted header names;
 * the caller supplies the URL, permitted headers and, for provider POSTs, the
 * request body.
 */
export async function requestPiBrokeredWebOperation(
  operation: PiBrokeredWebOperation,
  dependencies: PiBrokeredWebHttpDependencies = {},
): Promise<PiBrokeredWebHttpResponse> {
  const profile = PI_BROKERED_WEB_OPERATION_PROFILES[operation?.kind];
  if (!profile) fail("pi_network_operation_denied");
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(operation.headers || {})) {
    const key = name.toLowerCase();
    if (!profile.headers.includes(key)) fail("pi_network_header_denied");
    headers[key] = String(value);
  }
  if (operation.body !== undefined && !profile.bodyAllowed)
    fail("pi_network_body_denied");
  const facts = classifyPiOutboundUrl(operation.url);
  if (profile.origin && facts.origin !== profile.origin)
    fail("pi_network_origin_denied");
  if (profile.path && new URL(facts.url).pathname !== profile.path)
    fail("pi_network_path_denied");
  const credentialed =
    profile.credentialed ||
    Object.hasOwn(headers, "authorization") ||
    Object.hasOwn(headers, "x-api-key") ||
    Object.hasOwn(headers, "x-subscription-token");
  return requestPiBrokeredWebHttp(
    {
      url: facts.url,
      method: profile.method,
      headers,
      ...(operation.body !== undefined ? { body: operation.body } : {}),
      ...(operation.signal ? { signal: operation.signal } : {}),
      ...(operation.localNetworkApprovedOrigin
        ? { localNetworkApprovedOrigin: operation.localNetworkApprovedOrigin }
        : {}),
      credentialed,
      allowRedirects: profile.allowRedirects,
      ...(profile.sameOriginRedirects
        ? { redirectOrigin: profile.origin ?? facts.origin }
        : {}),
    },
    dependencies,
  );
}

/**
 * Classify one URL for Gateway admission: resolve every A/AAAA record through
 * the same native resolver and return the strongest location without
 * enforcing a local-network grant or opening a connection. Metadata and
 * unavailable evidence still fail closed.
 */
export async function inspectPiBrokeredWebUrl(
  url: string,
  dependencies: PiBrokeredWebHttpDependencies = {},
): Promise<{ origin: string; location: PiOutboundUrlLocation }> {
  const transport = dependencies.transport ?? defaultTransport();
  if (!transport) fail("pi_network_transport_unavailable");
  const now = dependencies.now ?? (() => Date.now());
  const facts = classifyPiOutboundUrl(url);
  const addresses = await bounded(
    transport.resolve(facts.hostname),
    PI_OUTBOUND_TOTAL_TIMEOUT_MS,
    newAbortSignal(),
    "pi_network_timeout",
  );
  const location = classifyPiOutboundResolvedLocation({ facts, addresses });
  return { origin: facts.origin, location };
}

/**
 * Source-origin-bound `fetch` adapter for the admitted MCP Streamable HTTP
 * transport. It preserves the SDK's request/response semantics (GET/POST/DELETE
 * with headers, streaming response bodies) while reusing the brokered native
 * channel and denying any cross-origin request or redirect.
 */
export function createPiBrokeredMcpFetch(
  options: {
    origin: string;
    localNetworkApprovedOrigin?: string;
    credentialed?: boolean;
  },
  dependencies: PiBrokeredWebHttpDependencies = {},
): typeof fetch {
  let origin: string;
  try {
    origin = new URL(options.origin).origin;
  } catch {
    fail("pi_network_invalid_url");
  }
  const transport = dependencies.transport ?? defaultTransport();
  const now = dependencies.now ?? (() => Date.now());
  return async function piBrokeredFetch(input, init) {
    if (!transport) fail("pi_network_transport_unavailable");
    const url = String(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url,
    );
    const requestInit = (init || {}) as RequestInit;
    const method = String(
      requestInit.method || (input as Request)?.method || "GET",
    ).toUpperCase();
    const headers: Record<string, string> = {};
    const rawHeaders = requestInit.headers;
    if (rawHeaders) {
      const headerBag = rawHeaders as unknown as Headers;
      if (typeof headerBag.forEach === "function")
        headerBag.forEach((value, name) => {
          headers[name] = value;
        });
      else if (Array.isArray(rawHeaders))
        for (const [name, value] of rawHeaders) headers[name] = String(value);
      else
        for (const [name, value] of Object.entries(
          rawHeaders as Record<string, string>,
        ))
          headers[name] = String(value);
    }
    const body = await fetchBodyBytes(requestInit.body);
    const facts = classifyPiOutboundUrl(url);
    if (facts.origin !== origin) fail("pi_network_origin_denied");
    const policy = {
      facts,
      credentialed: options.credentialed === true,
      localNetworkApprovedOrigin: options.localNetworkApprovedOrigin,
    };
    assertPiOutboundUrlShapeAllowed(facts);
    const signal = requestInit.signal ?? newAbortSignal();
    const deadline = now() + PI_OUTBOUND_TOTAL_TIMEOUT_MS;
    const addresses = await bounded(
      transport.resolve(facts.hostname),
      deadline - now(),
      signal,
      "pi_network_timeout",
    );
    const location = assertPiOutboundResolvedAllowed({ ...policy, addresses });
    const exchange = transport.open({
      url: facts.url,
      method,
      headers,
      body,
      signal,
      maxBodyBytes: PI_OUTBOUND_MAX_BODY_BYTES,
      idleTimeoutMs: PI_OUTBOUND_IDLE_TIMEOUT_MS,
      totalTimeoutMs: Math.max(1, deadline - now()),
    });
    let head: PiNativeResponseHead;
    try {
      head = await bounded(
        exchange.head,
        Math.max(1, deadline - now()),
        signal,
        "pi_network_timeout",
      );
      assertPiOutboundPeerAllowed({
        ...policy,
        peerAddress: head.peerAddress,
        expected: location,
      });
    } catch (error) {
      exchange.abort();
      throw error;
    }
    if (REDIRECT_STATUSES.has(head.status)) {
      exchange.abort();
      fail("pi_network_redirect_denied");
    }
    const responseInit: ResponseInit = {
      status: head.status || 502,
      headers: responseHeaders(head.headers),
    };
    if (head.status === 204 || head.status === 205 || head.status === 304) {
      exchange.abort();
      return new Response(null, responseInit);
    }
    return new Response(exchange.body, responseInit);
  };
}

async function fetchBodyBytes(
  body: BodyInit | null | undefined,
): Promise<Uint8Array | undefined> {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body))
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  fail("pi_network_body_unsupported");
}

// ---------------------------------------------------------------------------
// Mozilla native transport
// ---------------------------------------------------------------------------

type MozillaRuntime = {
  classes?: Record<string, any>;
  interfaces?: Record<string, any>;
  services?: any;
  utils?: any;
  results?: any;
};

function mozilla(): MozillaRuntime {
  const runtime = globalThis as any;
  const services =
    runtime.Services ||
    runtime.ChromeUtils?.importESModule?.(
      "resource://gre/modules/Services.sys.mjs",
    )?.Services;
  return {
    classes: runtime.Components?.classes || runtime.Cc,
    interfaces: runtime.Components?.interfaces || runtime.Ci,
    services,
    utils: runtime.Components?.utils || runtime.Cu || runtime.ChromeUtils,
    results: runtime.Components?.results || runtime.Cr,
  };
}

let cachedTransport: PiNativeHttpTransport | undefined;

function defaultTransport(): PiNativeHttpTransport | undefined {
  if (cachedTransport) return cachedTransport;
  const { services, interfaces, classes } = mozilla();
  if (!services?.io?.newChannelFromURI || !services?.dns || !interfaces)
    return undefined;
  cachedTransport = createMozillaPiNativeTransport({
    services,
    interfaces,
    classes,
  });
  return cachedTransport;
}

/** Reset the cached default transport; tests only. */
export function resetPiBrokeredWebHttpTransportForTests(): void {
  cachedTransport = undefined;
}

// nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL; the literal keeps the
// module independent of whether the runtime exposes the nsILoadInfo constants.
const SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL = 8;
const CONTENT_POLICY_TYPE_OTHER = 1;
const FETCH_CACHE_MODE_NO_STORE = 1;

export function createMozillaPiNativeTransport(runtimeInput?: {
  services: any;
  interfaces: any;
  classes: any;
}): PiNativeHttpTransport {
  const runtime = runtimeInput
    ? { ...runtimeInput }
    : (() => {
        const resolved = mozilla();
        return {
          services: resolved.services,
          interfaces: resolved.interfaces,
          classes: resolved.classes,
        };
      })();
  const { services, interfaces, classes } = runtime;

  function generateQI(interfacesList: any[]): unknown {
    const utils = (globalThis as any).ChromeUtils || mozilla().utils;
    if (typeof utils?.generateQI === "function")
      return utils.generateQI(interfacesList);
    return function (this: unknown) {
      return this;
    };
  }

  function systemPrincipal(): unknown {
    const factory = classes?.["@mozilla.org/scriptsecuritymanager;1"];
    const principal = factory?.getService?.(
      interfaces?.nsIScriptSecurityManager,
    );
    if (!principal?.getSystemPrincipal)
      fail("pi_network_transport_unavailable");
    return principal.getSystemPrincipal();
  }

  function resolve(hostname: string): Promise<string[]> {
    // A literal host has no DNS records; the literal is the whole address set.
    try {
      const literal = classifyPiOutboundAddress(hostname);
      return Promise.resolve([literal.address]);
    } catch {
      /* Not an address literal; resolve it through the network. */
    }
    const dns = services?.dns;
    if (!dns?.asyncResolve) fail("pi_network_transport_unavailable");
    return new Promise<string[]>((resolvePromise, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const unavailable = () =>
        finish(() =>
          reject(new PiOutboundNetworkError("pi_network_address_unavailable")),
        );
      const listener = {
        QueryInterface: generateQI([interfaces?.nsIDNSListener]),
        onLookupComplete(_request: unknown, record: any) {
          finish(() => {
            const addresses: string[] = [];
            try {
              // The callback exposes the empty nsIDNSRecord base; the address
              // iteration methods live on nsIDNSAddrRecord.
              let addresses$ = record;
              try {
                addresses$ = record.QueryInterface(
                  interfaces?.nsIDNSAddrRecord,
                );
              } catch {
                /* Fall back to the callback's own wrapper. */
              }
              addresses$?.rewind?.();
              while (addresses$?.hasMore?.()) {
                const value =
                  typeof addresses$.getNextAddrAsString === "function"
                    ? addresses$.getNextAddrAsString()
                    : addresses$.getNextAddr?.(0, 0)?.address;
                if (!value) break;
                addresses.push(String(value));
              }
            } catch {
              /* hasMore() throws at the end of some records. */
            }
            if (!addresses.length) {
              reject(
                new PiOutboundNetworkError("pi_network_address_unavailable"),
              );
              return;
            }
            resolvePromise(addresses);
          });
        },
      };
      // nsIDNSService.asyncResolve gained a resolver-type parameter in later
      // Firefox versions; Zotero 7 ships the earlier signature.
      const invocations: Array<() => void> = [
        () => dns.asyncResolve(hostname, 0, 0, null, listener, null),
        () => dns.asyncResolve(hostname, 0, listener, null),
        () => dns.asyncResolve(hostname, 0, listener, null, undefined),
      ];
      for (const invoke of invocations)
        try {
          invoke();
          return;
        } catch {
          /* Try the next supported signature. */
        }
      unavailable();
    });
  }

  function createTimer(fire: (code: string) => void): {
    schedule: (ms: number, code: string) => void;
    clear: () => void;
  } {
    const factory = classes?.["@mozilla.org/timer;1"];
    const timer = factory?.createInstance?.(interfaces?.nsITimer);
    let code = "pi_network_timeout";
    return {
      schedule(ms, nextCode) {
        if (!timer?.initWithCallback) return;
        code = nextCode;
        timer.initWithCallback(
          {
            QueryInterface: generateQI([interfaces?.nsITimerCallback]),
            notify: () => fire(code),
          },
          Math.max(1, Math.floor(ms)),
          0,
        );
      },
      clear() {
        try {
          timer?.cancel?.();
        } catch {
          /* Already fired. */
        }
      },
    };
  }

  function open(options: PiNativeHttpOptions): PiNativeExchange {
    const io = services?.io;
    const uri = io.newURI(options.url, null, null);
    const principal = systemPrincipal();
    const channel = io.newChannelFromURI(
      uri,
      null,
      principal,
      principal,
      SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      CONTENT_POLICY_TYPE_OTHER,
    );
    channel.loadFlags |=
      (interfaces?.nsIRequest?.LOAD_ANONYMOUS ?? 16384) |
      (interfaces?.nsIRequest?.LOAD_BYPASS_CACHE ?? 512) |
      (interfaces?.nsIRequest?.INHIBIT_CACHING ?? 128) |
      (interfaces?.nsIRequest?.INHIBIT_PERSISTENT_CACHING ?? 256) |
      // Request a fresh connection; validate the observed peer independently.
      (interfaces?.nsIRequest?.LOAD_FRESH_CONNECTION ?? 32768);
    const http = channel.QueryInterface(interfaces?.nsIHttpChannel);
    if (http) {
      http.requestMethod = options.method;
      for (const [name, value] of Object.entries(options.headers)) {
        try {
          http.setRequestHeader(name, value, false);
        } catch {
          fail("pi_network_invalid_url");
        }
      }
    }
    const internal = channel.QueryInterface?.(
      interfaces?.nsIHttpChannelInternal,
    );
    if (internal) {
      try {
        internal.fetchCacheMode = FETCH_CACHE_MODE_NO_STORE;
        // The peer must be the origin, not an interposed proxy.
        internal.bypassProxy = true;
      } catch {
        /* Older channels expose fewer knobs; load flags still apply. */
      }
    }
    if (options.body?.byteLength) {
      const streamFactory = classes?.["@mozilla.org/io/string-input-stream;1"];
      const stream = streamFactory?.createInstance?.(
        interfaces?.nsIStringInputStream,
      );
      if (!stream?.setData) fail("pi_network_transport_unavailable");
      stream.setData(binaryString(options.body), options.body.byteLength);
      const upload = channel.QueryInterface?.(interfaces?.nsIUploadChannel);
      if (!upload?.setUploadStream) fail("pi_network_transport_unavailable");
      upload.setUploadStream(
        stream,
        options.headers["content-type"] || "application/json",
        options.body.byteLength,
      );
      if (http) http.requestMethod = options.method;
    }

    let controllerRef: any;
    let settled = false;
    let canceled = false;
    let headResolved = false;
    let total = 0;
    let pendingHeadReject: ((error: unknown) => void) | undefined;

    const abort = () => {
      if (canceled) return;
      canceled = true;
      try {
        channel.cancel?.(0x804b0002); // NS_BINDING_ABORTED
      } catch {
        /* Channel already finished. */
      }
      timers.clear();
    };

    const finishError = (code: string) => {
      if (settled) return;
      settled = true;
      timers.clear();
      abort();
      const error = new PiOutboundNetworkError(code);
      pendingHeadReject?.(error);
      pendingHeadReject = undefined;
      try {
        controllerRef?.error(error);
      } catch {
        /* Stream already closed. */
      }
    };

    const timers = {
      clear() {
        idleTimer.clear();
        totalTimer.clear();
      },
    };
    const idleTimer = createTimer((code) => finishError(code));
    const totalTimer = createTimer((code) => finishError(code));

    let resolveHead: (head: PiNativeResponseHead) => void = () => undefined;
    let rejectHead: (error: unknown) => void = () => undefined;
    const head = new Promise<PiNativeResponseHead>((resolvePromise, reject) => {
      resolveHead = resolvePromise;
      rejectHead = reject;
    });

    const Stream =
      globalThis.ReadableStream ||
      (
        resolveRuntimeWindowCandidates().find(
          (candidate) =>
            typeof (candidate as typeof globalThis).ReadableStream ===
            "function",
        ) as typeof globalThis | undefined
      )?.ReadableStream;
    if (!Stream) fail("pi_network_transport_unavailable");
    const body = new Stream({
      start(controller: any) {
        controllerRef = controller;
      },
      cancel() {
        abort();
      },
    });

    const listener = {
      QueryInterface: generateQI([
        interfaces?.nsIStreamListener,
        interfaces?.nsIRequestObserver,
      ]),
      onStartRequest(request: any) {
        if (settled || headResolved) return;
        let status: number;
        try {
          status = Number(http?.responseStatus || 0);
        } catch {
          finishError("pi_network_failed");
          return;
        }
        if (!status) {
          finishError("pi_network_failed");
          return;
        }
        const headers: Record<string, string> = {};
        try {
          http.visitResponseHeaders?.({
            QueryInterface: generateQI([interfaces?.nsIHttpHeaderVisitor]),
            visitHeader(name: string, value: string) {
              if (headers[name.toLowerCase()] === undefined)
                headers[name.toLowerCase()] = value;
            },
          });
        } catch {
          /* Missing headers never fail the response. */
        }
        let peerAddress: string | undefined;
        try {
          peerAddress = internal?.remoteAddress || undefined;
        } catch {
          peerAddress = undefined;
        }
        headResolved = true;
        idleTimer.clear();
        idleTimer.schedule(options.idleTimeoutMs, "pi_network_idle_timeout");
        resolveHead({
          status,
          headers,
          ...(peerAddress ? { peerAddress } : {}),
          url: String(request?.name || options.url),
        });
      },
      onDataAvailable(
        _request: any,
        inputStream: any,
        _offset: number,
        count: number,
      ) {
        if (settled || canceled) return;
        let chunk: Uint8Array;
        try {
          const scriptable = classes?.[
            "@mozilla.org/scriptableinputstream;1"
          ]?.createInstance?.(interfaces?.nsIScriptableInputStream);
          if (!scriptable?.read) throw new Error("no stream");
          scriptable.init(inputStream);
          const raw = scriptable.read(count) as string;
          chunk = new Uint8Array(raw.length);
          for (let index = 0; index < raw.length; index += 1)
            chunk[index] = raw.charCodeAt(index) & 0xff;
        } catch {
          finishError("pi_network_failed");
          return;
        }
        total += chunk.byteLength;
        if (total > options.maxBodyBytes) {
          finishError("pi_network_body_too_large");
          return;
        }
        idleTimer.clear();
        idleTimer.schedule(options.idleTimeoutMs, "pi_network_idle_timeout");
        try {
          controllerRef?.enqueue(chunk);
        } catch {
          /* Consumer canceled. */
        }
      },
      onStopRequest(_request: any, status: number) {
        if (settled) return;
        settled = true;
        timers.clear();
        if (!headResolved) {
          const error = new PiOutboundNetworkError("pi_network_failed");
          rejectHead(error);
          try {
            controllerRef?.error(error);
          } catch {
            /* Stream already errored. */
          }
          return;
        }
        if (status) {
          const error = new PiOutboundNetworkError("pi_network_failed");
          try {
            controllerRef?.error(error);
          } catch {
            /* Stream already errored. */
          }
          return;
        }
        try {
          controllerRef?.close();
        } catch {
          /* Stream already closed. */
        }
      },
    };
    // redirectMode is Fetch metadata, not channel enforcement. Veto every
    // automatic replacement before it opens; the broker admits the next hop.
    channel.notificationCallbacks = {
      QueryInterface: generateQI([
        interfaces?.nsIInterfaceRequestor,
        interfaces?.nsIChannelEventSink,
      ]),
      getInterface(this: any, iid: unknown) {
        return this.QueryInterface(iid);
      },
      asyncOnChannelRedirect(
        oldChannel: any,
        _newChannel: any,
        _flags: number,
        callback: any,
      ) {
        try {
          listener.onStartRequest(oldChannel);
        } finally {
          callback.onRedirectVerifyCallback(0x804b0002);
        }
      },
    };
    pendingHeadReject = rejectHead;
    // Arm both budgets before the channel starts so a connect or header stall
    // cannot outlive the operation deadline.
    totalTimer.schedule(options.totalTimeoutMs, "pi_network_timeout");
    idleTimer.schedule(options.idleTimeoutMs, "pi_network_idle_timeout");
    if (options.signal.aborted) {
      finishError("pi_network_aborted");
      return { head, body, abort };
    }
    options.signal.addEventListener?.(
      "abort",
      () => finishError("pi_network_aborted"),
      { once: true },
    );
    try {
      channel.asyncOpen(listener);
    } catch {
      finishError("pi_network_failed");
    }
    return { head, body, abort };
  }

  return { resolve, open };
}

function binaryString(bytes: Uint8Array): string {
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    result += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + 8192, bytes.length)),
    );
  }
  return result;
}
