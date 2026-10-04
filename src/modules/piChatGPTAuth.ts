import { getPluginMetaValue, setPluginMetaValue } from "./pluginStateStore";
import { getPref, setPref } from "../utils/prefs";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import {
  deletePiCredential,
  getPiCredentialRevision,
  getPiCredentialIdentityRevision,
  listPiCredentials,
  putPiCredential,
  readPiCredential,
} from "./piCredentialStore";
import type {
  PiCredentialMaterial,
  PiCredentialMetadata,
} from "../shared/piProviderContract";

const ISSUER = "https://auth.openai.com";
const TOKEN_ENDPOINT = `${ISSUER}/api/accounts/oauth/token`;
const JWKS_ENDPOINT = `${ISSUER}/.well-known/jwks.json`;
const DISCOVERY_ENDPOINT = `${ISSUER}/.well-known/openid-configuration`;
const RESOURCE = "https://api.openai.com/v1";
const DIRECT_SCOPE = "chatgpt.tokens.use.direct";
const DOCUMENT_KEY = "pi.chatgpt.auth.v1";
const HOST_KEY = "pi.chatgpt.host.v1";
const CLIENTS_KEY = "pi.chatgpt.clients.v1";
const HTTP_LIMIT = 128 * 1024;
const encoder = new TextEncoder();
type Material = Extract<PiCredentialMaterial, { kind: "chatgpt" }>;
type JsonWebKey = {
  kty?: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  key_ops?: string[];
  ext?: boolean;
};
type AuthResponse = Pick<Response, "ok" | "status" | "json">;
export type PiChatGPTAuthFetch = (
  url: string,
  init: RequestInit,
) => Promise<AuthResponse>;
export type PiChatGPTAuthFailureCode =
  | "canceled"
  | "expired"
  | "auth_unavailable"
  | "auth_rejected"
  | "invalid_response"
  | "invalid_state"
  | "identity_mismatch"
  | "credential_missing"
  | "login_active"
  | "permission_missing"
  | "reauthorization_required"
  | "quota_paused"
  | "probe_active"
  | "welcome_required"
  | "auth_state_invalid";
export class PiChatGPTAuthFailure extends Error {
  constructor(
    readonly code: PiChatGPTAuthFailureCode,
    readonly phase?:
      | "authorize"
      | "exchange"
      | "validate"
      | "refresh"
      | "revoke",
  ) {
    super(code);
  }
}
export type PiChatGPTRegistration = {
  id: string;
  label: string;
  email?: string;
  clientId: string;
  signedIn: boolean;
  planEnabled: boolean;
  paused: boolean;
  reauthorizationRequired: boolean;
  welcomeAccepted: boolean;
};
type Registration = Omit<PiChatGPTRegistration, "signedIn"> & {
  issuer: string;
  subject: string;
  rotation?: { revision: string; identityRevision: string };
  pauseGeneration?: number;
};
type Document = { version: 1; registrations: Record<string, Registration> };
type Listener = { redirectUri: string; close(): void };
export type PiChatGPTLoginProgress = {
  requestId: string;
  status: "waiting_browser" | "exchanging" | "validating";
};
type ConnectInput = {
  id: string;
  label: string;
  requestId?: string;
  signal: AbortSignal;
  onProgress?: (progress: PiChatGPTLoginProgress) => void;
  reconsent?: boolean;
  fetch?: PiChatGPTAuthFetch;
};

function controller() {
  const Constructor = resolveNativeAbortControllerConstructor();
  if (!Constructor) throw new PiChatGPTAuthFailure("auth_unavailable");
  return new Constructor();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PiChatGPTAuthFailure("invalid_response");
  return value as Record<string, unknown>;
}
function text(value: unknown, limit = 16_384): string {
  return typeof value === "string" && value.length <= limit ? value : "";
}
function encode(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new PiChatGPTAuthFailure("invalid_response", "validate");
  const base = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base.padEnd(Math.ceil(base.length / 4) * 4, "="));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
function random(): string {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
function document(): Document {
  try {
    const raw = getPluginMetaValue(DOCUMENT_KEY);
    if (!raw) return { version: 1, registrations: Object.create(null) };
    const value = object(JSON.parse(raw));
    if (value.version !== 1) throw new Error();
    const records = object(value.registrations);
    for (const [id, value] of Object.entries(records)) {
      const r = object(value);
      if (
        r.id !== id ||
        !text(r.label, 128) ||
        r.issuer !== ISSUER ||
        !text(r.subject, 2048) ||
        !text(r.clientId, 512) ||
        [
          "planEnabled",
          "paused",
          "reauthorizationRequired",
          "welcomeAccepted",
        ].some((field) => typeof r[field] !== "boolean")
      )
        throw new Error();
      registrationId(id);
      if (r.email !== undefined && !text(r.email, 320)) throw new Error();
      if (
        r.pauseGeneration !== undefined &&
        (!Number.isSafeInteger(r.pauseGeneration) ||
          Number(r.pauseGeneration) < 0)
      )
        throw new Error();
      if (r.rotation !== undefined) {
        const rotation = object(r.rotation);
        if (
          !text(rotation.revision, 128) ||
          !text(rotation.identityRevision, 128)
        )
          throw new Error();
      }
    }
    return {
      version: 1,
      registrations: records as Record<string, Registration>,
    };
  } catch {
    throw new PiChatGPTAuthFailure("auth_state_invalid");
  }
}
function save(doc: Document) {
  setPluginMetaValue(DOCUMENT_KEY, JSON.stringify(doc));
}
function registrationId(value: string) {
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(value) ||
    ["__proto__", "constructor", "prototype"].includes(value)
  )
    throw new PiChatGPTAuthFailure("invalid_state");
  return value;
}
function pendingClientsDocument(): Record<string, string> {
  try {
    const values = object(JSON.parse(getPluginMetaValue(CLIENTS_KEY) || "{}"));
    for (const [id, client] of Object.entries(values))
      if (
        !registrationId(id) ||
        !text(client, 512) ||
        client === "dynamic_agent_client"
      )
        throw new Error();
    return values as Record<string, string>;
  } catch {
    throw new PiChatGPTAuthFailure("auth_state_invalid");
  }
}
function hostId(): string {
  let id = getPluginMetaValue(HOST_KEY);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    id = `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    setPluginMetaValue(HOST_KEY, id);
  }
  if (!/^urn:uuid:[a-f0-9-]{36}$/.test(id))
    throw new PiChatGPTAuthFailure("auth_state_invalid");
  return id;
}

async function nativeFetch(
  url: string,
  init: RequestInit,
): Promise<AuthResponse> {
  if (
    typeof Zotero === "undefined" ||
    typeof Zotero.HTTP?.request !== "function"
  )
    return fetch(url, init);
  let cancel: (() => void) | undefined;
  let oversized = false;
  const stop = () => cancel?.();
  init.signal?.addEventListener("abort", stop, { once: true });
  try {
    const xhr = await Zotero.HTTP.request(init.method || "GET", url, {
      body: init.body === undefined ? undefined : String(init.body),
      headers: init.headers,
      anon: true,
      noCache: true,
      followRedirects: false,
      successCodes: false,
      logBodyLength: 0,
      timeout: 30_000,
      errorDelayMax: 0,
      cancellerReceiver: (abort: () => void) => {
        cancel = abort;
        if (init.signal?.aborted) abort();
      },
      requestObserver: (request: XMLHttpRequest) =>
        request.addEventListener("progress", (event) => {
          if ((event as ProgressEvent).loaded > HTTP_LIMIT) {
            oversized = true;
            stop();
          }
        }),
    } as Parameters<typeof Zotero.HTTP.request>[2]);
    if (
      oversized ||
      encoder.encode(xhr.responseText || "").byteLength > HTTP_LIMIT
    )
      throw new PiChatGPTAuthFailure("invalid_response");
    return {
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      json: async () => JSON.parse(xhr.responseText || ""),
    };
  } finally {
    init.signal?.removeEventListener("abort", stop);
  }
}

/** The callback listener belongs to one authorization, not the Host Bridge. */
async function nativeListen(
  deliver: (url: string) => number,
): Promise<Listener> {
  const g = globalThis as any;
  const Cc = g.Components?.classes || g.Cc;
  const Ci = g.Components?.interfaces || g.Ci;
  if (!Cc || !Ci || !g.ChromeUtils?.generateQI)
    throw new PiChatGPTAuthFailure("auth_unavailable", "authorize");
  const tm = Cc["@mozilla.org/thread-manager;1"].getService(
    Ci.nsIThreadManager,
  ).mainThread;
  const make = () =>
    Cc["@mozilla.org/network/server-socket;1"].createInstance(
      Ci.nsIServerSocket,
    );
  let socket = make();
  try {
    socket.init(1455, true, 8);
  } catch {
    socket.close();
    socket = make();
    socket.init(0, true, 8);
  }
  const uri = `http://127.0.0.1:${Number(socket.port)}/auth/callback`;
  let closed = false;
  const transports = new Map<any, () => void>();
  socket.asyncListen({
    onSocketAccepted(_socket: unknown, transport: any) {
      if (closed || transports.size >= 8) {
        transport.close(0x804b0002);
        return;
      }
      const input = transport.openInputStream(0, 0, 0);
      const output = transport.openOutputStream(0, 0, 0);
      const reader = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
        Ci.nsIScriptableInputStream,
      );
      reader.init(input);
      const asyncInput = input.QueryInterface(Ci.nsIAsyncInputStream);
      let raw = "";
      let finished = false;
      const stop = (terminate = true) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          asyncInput.asyncWait(null, 0, 0, tm);
        } catch {
          /* closed input */
        }
        try {
          output.close();
        } catch {
          /* closed output */
        }
        try {
          input.close();
        } catch {
          /* closed input */
        }
        try {
          if (terminate) transport.close(0x804b0002);
        } catch {
          /* closed transport */
        }
        transports.delete(transport);
        raw = "";
      };
      transports.set(transport, stop);
      const pump = () => {
        if (finished) return;
        try {
          const available = Number(reader.available());
          if (available)
            raw += reader.read(Math.min(available, 8192 - raw.length));
          if (raw.includes("\r\n\r\n") || raw.length >= 8192) {
            const match = /^GET (\/\S*) HTTP\/1\.[01]\r\n/.exec(raw);
            const status =
              match && raw.length < 8192
                ? deliver(new URL(match[1], uri).href)
                : 400;
            const body =
              status === 200
                ? "Authorization received. Return to Zotero Agents."
                : "Authorization callback rejected.";
            const reply = `HTTP/1.1 ${status} Result\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${body.length}\r\nConnection: close\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\n\r\n${body}`;
            output.write(reply, reply.length);
            // Closing the output stream drains its buffered response. Killing
            // the transport here can make the browser retry a consumed code.
            stop(false);
            return;
          }
          asyncInput.asyncWait(
            {
              QueryInterface: g.ChromeUtils.generateQI([
                Ci.nsIInputStreamCallback,
              ]),
              onInputStreamReady: pump,
            },
            0,
            0,
            tm,
          );
        } catch {
          stop();
        }
      };
      const timer = setTimeout(stop, 2000);
      pump();
    },
    onStopListening() {
      closed = true;
      for (const stop of transports.values()) stop();
    },
  });
  return {
    redirectUri: uri,
    close() {
      if (closed) return;
      closed = true;
      socket.close();
      for (const stop of transports.values()) stop();
    },
  };
}

export function createPiChatGPTAuth(
  options: {
    fetch?: PiChatGPTAuthFetch;
    listen?: (deliver: (url: string) => number) => Promise<Listener>;
    launchURL?: (url: string) => void;
    loginTimeoutMs?: number;
    now?: () => number;
  } = {},
) {
  const fetcher = options.fetch || nativeFetch;
  const now = options.now || Date.now;
  let closed = false;
  let active:
    | {
        id: string;
        requestId: string;
        abort(): void;
        promise: Promise<PiCredentialMetadata>;
      }
    | undefined;
  let jwks:
    | {
        expires: number;
        keys: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }>;
      }
    | undefined;
  let keyRefreshAt = 0;
  const pendingClients = new Map<string, string>(
    Object.entries(pendingClientsDocument()),
  );
  const savePendingClients = () =>
    setPluginMetaValue(
      CLIENTS_KEY,
      JSON.stringify(Object.fromEntries(pendingClients)),
    );
  const closingRegistrations = new Set<string>();
  const refreshes = new Map<
    string,
    {
      controller: ReturnType<typeof controller>;
      promise: Promise<string>;
      waiters: Set<object>;
      started: boolean;
    }
  >();
  const probes = new Set<string>();
  const permits = new WeakMap<
    object,
    { id: string; identityRevision: string; generation: number; used: boolean }
  >();
  const signouts = new Map<
    string,
    Promise<{
      status: "signed_out";
      revocation: "confirmed" | "unconfirmed" | "not_needed";
    }>
  >();
  const registrationListeners = new Set<
    (registrations: readonly PiChatGPTRegistration[]) => void
  >();

  function saveAndPublish(doc: Document) {
    save(doc);
    if (!registrationListeners.size) return;
    const snapshot = registrations();
    for (const listener of registrationListeners) {
      try {
        listener(snapshot.map((registration) => ({ ...registration })));
      } catch {
        /* UI observers cannot change authentication state. */
      }
    }
  }

  function subscribeRegistrations(
    listener: (registrations: readonly PiChatGPTRegistration[]) => void,
  ) {
    registrationListeners.add(listener);
    try {
      listener(registrations());
    } catch {
      /* UI observers cannot change authentication state. */
    }
    return () => registrationListeners.delete(listener);
  }

  async function request(
    url: string,
    init: RequestInit,
    useFetch = fetcher,
  ): Promise<AuthResponse> {
    if (closed || init.signal?.aborted)
      throw new PiChatGPTAuthFailure("canceled");
    try {
      return await waitBounded(
        useFetch(url, init),
        now() + 30_000,
        init.signal || undefined,
      );
    } catch (error) {
      throw error instanceof PiChatGPTAuthFailure
        ? error
        : new PiChatGPTAuthFailure(
            init.signal?.aborted ? "canceled" : "auth_unavailable",
          );
    }
  }
  async function json(
    response: AuthResponse,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    try {
      const data = object(
        await waitBounded(response.json(), now() + 30_000, signal),
      );
      if (encoder.encode(JSON.stringify(data)).byteLength > HTTP_LIMIT)
        throw new Error();
      return data;
    } catch (error) {
      throw error instanceof PiChatGPTAuthFailure
        ? error
        : new PiChatGPTAuthFailure("invalid_response");
    }
  }
  async function validate(
    idToken: string,
    clientId: string,
    nonce: string | undefined,
    signal: AbortSignal,
    useFetch: PiChatGPTAuthFetch,
  ) {
    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) throw new Error();
      const header = object(
        JSON.parse(new TextDecoder().decode(decode(parts[0]))),
      );
      const kid = text(header.kid, 512);
      if (header.alg !== "RS256" || !kid || header.crit !== undefined)
        throw new Error();
      const loadKeys = async () => {
        const response = await request(
          JWKS_ENDPOINT,
          { method: "GET", signal },
          useFetch,
        );
        if (!response.ok)
          throw new PiChatGPTAuthFailure("auth_unavailable", "validate");
        const data = await json(response, signal);
        if (!Array.isArray(data.keys) || data.keys.length > 32)
          throw new Error();
        jwks = {
          expires: now() + 300_000,
          keys: data.keys.map((key) => object(key) as JsonWebKey),
        };
      };
      if (!jwks || jwks.expires <= now()) await loadKeys();
      let key = jwks!.keys.find((key) => key.kid === kid);
      if (!key && now() - keyRefreshAt >= 1000) {
        keyRefreshAt = now();
        await loadKeys();
        key = jwks!.keys.find((key) => key.kid === kid);
      }
      if (
        !key ||
        key.kty !== "RSA" ||
        (key.alg !== undefined && key.alg !== "RS256") ||
        (key.use !== undefined && key.use !== "sig")
      )
        throw new Error();
      const imported = await crypto.subtle.importKey(
        "jwk",
        key,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      if (
        !(await crypto.subtle.verify(
          "RSASSA-PKCS1-v1_5",
          imported,
          decode(parts[2]),
          encoder.encode(`${parts[0]}.${parts[1]}`),
        ))
      )
        throw new Error();
      const claims = object(
        JSON.parse(new TextDecoder().decode(decode(parts[1]))),
      );
      const audience = claims.aud;
      if (
        claims.iss !== ISSUER ||
        !(
          audience === clientId ||
          (Array.isArray(audience) &&
            audience.includes(clientId) &&
            (audience.length === 1 || claims.azp === clientId))
        ) ||
        (claims.azp !== undefined && claims.azp !== clientId) ||
        typeof claims.exp !== "number" ||
        !Number.isFinite(claims.exp) ||
        claims.exp * 1000 <= now() ||
        (nonce !== undefined && claims.nonce !== nonce) ||
        !text(claims.sub, 2048)
      )
        throw new Error();
      return {
        issuer: ISSUER,
        subject: text(claims.sub, 2048),
        email: text(claims.email, 320) || undefined,
      };
    } catch (error) {
      throw error instanceof PiChatGPTAuthFailure
        ? error
        : new PiChatGPTAuthFailure("invalid_response", "validate");
    }
  }

  function registrations(): PiChatGPTRegistration[] {
    const credentials = listPiCredentials();
    return Object.values(document().registrations).map(
      ({
        issuer: _issuer,
        subject: _subject,
        rotation,
        pauseGeneration: _pauseGeneration,
        ...record
      }) => ({
        ...record,
        reauthorizationRequired:
          record.reauthorizationRequired ||
          !!(rotation && !refreshes.has(record.id)),
        signedIn: credentials.some(
          (credential) =>
            credential.id === record.id && credential.kind === "chatgpt",
        ),
      }),
    );
  }
  function connect(args: ConnectInput): Promise<PiCredentialMetadata> {
    registrationId(args.id);
    if (!text(args.label, 128)?.trim())
      return Promise.reject(new PiChatGPTAuthFailure("invalid_state"));
    if (closed || args.signal.aborted)
      return Promise.reject(new PiChatGPTAuthFailure("canceled"));
    if (closingRegistrations.has(args.id))
      return Promise.reject(new PiChatGPTAuthFailure("auth_unavailable"));
    const existingCredential = listPiCredentials().find(
      (credential) => credential.id === args.id,
    );
    if (existingCredential && existingCredential.kind !== "chatgpt")
      return Promise.reject(new PiChatGPTAuthFailure("credential_missing"));
    if (active)
      return active.id === args.id
        ? active.promise
        : Promise.reject(new PiChatGPTAuthFailure("login_active"));
    const abortController = controller();
    const requestId = args.requestId || random();
    const current = document().registrations[args.id];
    const issuedClient = current?.clientId || pendingClients.get(args.id);
    const expectedRevision = getPiCredentialRevision(args.id, "model-provider");
    const useFetch = args.fetch || fetcher;
    let listener: Listener | undefined;
    let callbackReceived = false;
    let timer: ReturnType<typeof setTimeout>;
    const progress = (status: PiChatGPTLoginProgress["status"]) => {
      try {
        args.onProgress?.({ requestId, status });
      } catch {
        /* UI observers cannot change authorization. */
      }
    };
    const abort = () => {
      abortController.abort();
      listener?.close();
    };
    args.signal.addEventListener("abort", abort, { once: true });
    const promise = (async () => {
      const state = random();
      const nonce = random();
      const verifier = random();
      const challenge = encode(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", encoder.encode(verifier)),
        ),
      );
      const host = hostId();
      let accepted!: (value: { code: string; clientId: string }) => void;
      let rejected!: (error: PiChatGPTAuthFailure) => void;
      const callback = new Promise<{ code: string; clientId: string }>(
        (resolve, reject) => {
          accepted = resolve;
          rejected = reject;
        },
      );
      void callback.catch(() => undefined);
      const canceled = () => rejected(new PiChatGPTAuthFailure("canceled"));
      abortController.signal.addEventListener("abort", canceled, {
        once: true,
      });
      timer = setTimeout(
        () => {
          rejected(new PiChatGPTAuthFailure("expired"));
          abort();
        },
        options.loginTimeoutMs || 15 * 60_000,
      );
      try {
        listener = await (options.listen || nativeListen)((raw) => {
          if (closed || abortController.signal.aborted || callbackReceived)
            return 409;
          try {
            const url = new URL(raw);
            const base = new URL(listener!.redirectUri);
            if (
              url.origin !== base.origin ||
              url.pathname !== base.pathname ||
              url.searchParams.getAll("state").length !== 1 ||
              url.searchParams.get("state") !== state
            )
              return 400;
            if (url.searchParams.has("error")) {
              callbackReceived = true;
              rejected(new PiChatGPTAuthFailure("auth_rejected", "authorize"));
              return 400;
            }
            const client =
              url.searchParams.get("client_id") || issuedClient || "";
            const code = text(url.searchParams.get("code"));
            if (
              !code ||
              !text(client, 512) ||
              client === "dynamic_agent_client" ||
              (issuedClient && client !== issuedClient) ||
              url.searchParams.getAll("client_id").length > 1 ||
              url.searchParams.getAll("code").length !== 1
            )
              return 400;
            callbackReceived = true;
            pendingClients.set(args.id, client);
            savePendingClients();
            accepted({ code, clientId: client });
            return 200;
          } catch {
            return 400;
          }
        });
        if (abortController.signal.aborted || closed)
          throw new PiChatGPTAuthFailure("canceled");
        const redirect = new URL(listener.redirectUri);
        if (
          redirect.protocol !== "http:" ||
          redirect.hostname !== "127.0.0.1" ||
          redirect.pathname !== "/auth/callback" ||
          !redirect.port ||
          redirect.search ||
          redirect.hash ||
          redirect.username ||
          redirect.password
        )
          throw new PiChatGPTAuthFailure("invalid_response", "authorize");
        const previous = current && (await readPiCredential(args.id));
        const query = new URLSearchParams({
          client_id: issuedClient || "dynamic_agent_client",
          ext_agent_host_id: host,
          response_type: "code",
          redirect_uri: listener.redirectUri,
          scope: `openid profile email offline_access resource.invoke ${DIRECT_SCOPE}`,
          resource: RESOURCE,
          state,
          nonce,
          code_challenge_method: "S256",
          code_challenge: challenge,
        });
        if (!issuedClient) query.set("agent_name_hint", "Zotero Agents");
        if (previous && previous.ok && previous.material.kind === "chatgpt")
          query.set("id_token_hint", previous.material.idToken);
        if (current?.email) query.set("login_hint", current.email);
        if (args.reconsent) query.set("prompt", "consent");
        progress("waiting_browser");
        (options.launchURL || ((url) => Zotero.launchURL(url)))(
          `${ISSUER}/api/accounts/authorize?${query}`,
        );
        const result = await callback;
        progress("exchanging");
        const response = await request(
          TOKEN_ENDPOINT,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: result.clientId,
              code: result.code,
              code_verifier: verifier,
              redirect_uri: listener.redirectUri,
              resource: RESOURCE,
            }),
            signal: abortController.signal,
          },
          useFetch,
        );
        if (!response.ok)
          throw new PiChatGPTAuthFailure("auth_rejected", "exchange");
        const data = await json(response, abortController.signal);
        const access = text(data.access_token);
        const refresh = text(data.refresh_token);
        const idToken = text(data.id_token);
        if (
          !access ||
          !refresh ||
          !idToken ||
          data.token_type !== "Bearer" ||
          typeof data.expires_in !== "number" ||
          !Number.isFinite(data.expires_in) ||
          data.expires_in <= 0
        )
          throw new PiChatGPTAuthFailure("invalid_response", "exchange");
        progress("validating");
        const identity = await validate(
          idToken,
          result.clientId,
          nonce,
          abortController.signal,
          useFetch,
        );
        if (
          current &&
          (current.issuer !== identity.issuer ||
            current.subject !== identity.subject ||
            current.clientId !== result.clientId)
        )
          throw new PiChatGPTAuthFailure("identity_mismatch", "validate");
        const grantedScope = text(data.scope, 4096)
          .split(/\s+/)
          .filter(Boolean);
        if (closed || abortController.signal.aborted)
          throw new PiChatGPTAuthFailure("canceled");
        const metadata = await putPiCredential({
          id: args.id,
          label: args.label,
          expectedRevision,
          preserveIdentity: !!(
            previous &&
            previous.ok &&
            previous.material.kind === "chatgpt"
          ),
          signal: abortController.signal,
          material: {
            kind: "chatgpt",
            access,
            refresh,
            idToken,
            expiresAt: now() + data.expires_in * 1000,
            ...identity,
            clientId: result.clientId,
            scope: grantedScope,
          },
        });
        const doc = document();
        doc.registrations[args.id] = {
          id: args.id,
          label: args.label,
          ...identity,
          clientId: result.clientId,
          planEnabled: grantedScope.includes(DIRECT_SCOPE),
          paused: current?.paused || false,
          pauseGeneration: current?.pauseGeneration || 0,
          reauthorizationRequired: false,
          welcomeAccepted: current?.welcomeAccepted || false,
        };
        saveAndPublish(doc);
        pendingClients.delete(args.id);
        savePendingClients();
        return metadata;
      } finally {
        clearTimeout(timer!);
        args.signal.removeEventListener("abort", abort);
        abortController.signal.removeEventListener("abort", canceled);
        listener?.close();
      }
    })().catch((error) => {
      throw error instanceof PiChatGPTAuthFailure
        ? error
        : new PiChatGPTAuthFailure(
            abortController.signal.aborted || closed
              ? "canceled"
              : "credential_missing",
          );
    });
    active = { id: args.id, requestId, abort, promise };
    void promise
      .finally(() => {
        if (active?.promise === promise) active = undefined;
      })
      .catch(() => undefined);
    return promise;
  }
  function cancel(requestId?: string) {
    if (!requestId || active?.requestId === requestId) active?.abort();
  }
  async function material(id: string) {
    const revision = getPiCredentialRevision(id, "model-provider");
    const result = await readPiCredential(id);
    if (
      !revision ||
      !result.ok ||
      result.material.kind !== "chatgpt" ||
      getPiCredentialRevision(id, "model-provider") !== revision
    )
      throw new PiChatGPTAuthFailure("credential_missing");
    const record = document().registrations[id];
    if (
      record &&
      (record.issuer !== result.material.issuer ||
        record.subject !== result.material.subject ||
        record.clientId !== result.material.clientId)
    )
      throw new PiChatGPTAuthFailure("identity_mismatch");
    return { revision, value: result.material, record };
  }
  function wait<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted)
      return Promise.reject(new PiChatGPTAuthFailure("canceled"));
    return new Promise((resolve, reject) => {
      const abort = () => {
        signal.removeEventListener("abort", abort);
        reject(new PiChatGPTAuthFailure("canceled"));
      };
      signal.addEventListener("abort", abort, { once: true });
      promise.then(
        (value) => {
          signal.removeEventListener("abort", abort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener("abort", abort);
          reject(error);
        },
      );
    });
  }
  function waitBounded<T>(
    promise: Promise<T>,
    deadline: number,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        reject(new PiChatGPTAuthFailure("canceled"));
      };
      const timer = setTimeout(
        () => {
          cleanup();
          reject(new PiChatGPTAuthFailure("expired"));
        },
        Math.max(0, deadline - now()),
      );
      signal?.addEventListener("abort", abort, { once: true });
      promise.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error) => {
          cleanup();
          reject(error);
        },
      );
      if (signal?.aborted) abort();
    });
  }
  function clearCommittedRotation(
    id: string,
    current: Awaited<ReturnType<typeof material>>,
  ) {
    const rotation = current.record?.rotation;
    if (!rotation) return;
    if (
      rotation.revision === current.revision ||
      rotation.identityRevision !==
        getPiCredentialIdentityRevision(id, "model-provider")
    )
      throw new PiChatGPTAuthFailure("reauthorization_required");
    const doc = document();
    if (doc.registrations[id]?.rotation?.revision === rotation.revision) {
      delete doc.registrations[id].rotation;
      saveAndPublish(doc);
    }
  }
  async function resolveAccess(
    id: string,
    signal: AbortSignal,
    useFetch = fetcher,
    expected?: { identityRevision: string },
  ): Promise<string> {
    if (closed || signal.aborted) throw new PiChatGPTAuthFailure("canceled");
    const check = () => {
      if (closed || signal.aborted) throw new PiChatGPTAuthFailure("canceled");
      if (
        closingRegistrations.has(id) ||
        (expected &&
          getPiCredentialIdentityRevision(id, "model-provider") !==
            expected.identityRevision)
      )
        throw new PiChatGPTAuthFailure("credential_missing");
    };
    check();
    let flight = refreshes.get(id);
    if (!flight) {
      const ownController = controller();
      const waiters = new Set<object>();
      const work = (async () => {
        const current = await material(id);
        if (
          closed ||
          ownController.signal.aborted ||
          closingRegistrations.has(id)
        )
          throw new PiChatGPTAuthFailure("canceled");
        if (
          expected &&
          getPiCredentialIdentityRevision(id, "model-provider") !==
            expected.identityRevision
        )
          throw new PiChatGPTAuthFailure("credential_missing");
        if (current.record?.reauthorizationRequired)
          throw new PiChatGPTAuthFailure("reauthorization_required");
        clearCommittedRotation(id, current);
        if (current.value.expiresAt > now() + 60_000)
          return current.value.access;
        if (!current.record)
          throw new PiChatGPTAuthFailure("credential_missing");
        if (!waiters.size) throw new PiChatGPTAuthFailure("canceled");
        const identityRevision = getPiCredentialIdentityRevision(
          id,
          "model-provider",
        )!;
        const doc = document();
        doc.registrations[id].rotation = {
          revision: current.revision,
          identityRevision,
        };
        saveAndPublish(doc);
        refreshes.get(id)!.started = true;
        try {
          const response = await request(
            TOKEN_ENDPOINT,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: current.value.clientId,
                refresh_token: current.value.refresh,
                resource: RESOURCE,
              }),
              signal: ownController.signal,
            },
            useFetch,
          );
          if (!response.ok)
            throw new PiChatGPTAuthFailure(
              response.status === 400 || response.status === 401
                ? "reauthorization_required"
                : "auth_unavailable",
              "refresh",
            );
          const data = await json(response, ownController.signal);
          const access = text(data.access_token);
          if (
            !access ||
            data.token_type !== "Bearer" ||
            typeof data.expires_in !== "number" ||
            !Number.isFinite(data.expires_in) ||
            data.expires_in <= 0
          )
            throw new PiChatGPTAuthFailure("invalid_response", "refresh");
          const next: Material = {
            ...current.value,
            access,
            refresh: text(data.refresh_token) || current.value.refresh,
            idToken: text(data.id_token) || current.value.idToken,
            expiresAt: now() + data.expires_in * 1000,
            scope:
              data.scope === undefined
                ? current.value.scope
                : text(data.scope, 4096).split(/\s+/).filter(Boolean),
          };
          if (data.id_token !== undefined) {
            const verified = await validate(
              next.idToken,
              current.value.clientId,
              undefined,
              ownController.signal,
              useFetch,
            );
            if (
              verified.issuer !== current.value.issuer ||
              verified.subject !== current.value.subject
            )
              throw new PiChatGPTAuthFailure("identity_mismatch", "refresh");
          }
          if (closed || ownController.signal.aborted)
            throw new PiChatGPTAuthFailure("canceled");
          await putPiCredential({
            id,
            label: current.record.label,
            material: next,
            expectedRevision: current.revision,
            preserveIdentity: true,
            signal: ownController.signal,
          });
          const nextDoc = document();
          if (
            nextDoc.registrations[id]?.rotation?.revision === current.revision
          ) {
            delete nextDoc.registrations[id].rotation;
            nextDoc.registrations[id].reauthorizationRequired = false;
            nextDoc.registrations[id].planEnabled =
              next.scope.includes(DIRECT_SCOPE);
            saveAndPublish(nextDoc);
          }
          return access;
        } catch (error) {
          if (!closed) {
            const failedDoc = document();
            if (
              failedDoc.registrations[id]?.rotation?.revision ===
              current.revision
            ) {
              failedDoc.registrations[id].reauthorizationRequired = true;
              saveAndPublish(failedDoc);
            }
          }
          throw error instanceof PiChatGPTAuthFailure
            ? error
            : new PiChatGPTAuthFailure("reauthorization_required", "refresh");
        }
      })();
      flight = {
        controller: ownController,
        promise: work,
        waiters,
        started: false,
      };
      refreshes.set(id, flight);
      void work
        .finally(() => {
          if (refreshes.get(id)?.promise === work) refreshes.delete(id);
        })
        .catch(() => undefined);
    }
    const waiter = {};
    flight.waiters.add(waiter);
    try {
      const access = await wait(flight.promise, signal);
      check();
      return access;
    } finally {
      flight.waiters.delete(waiter);
    }
  }
  async function assertAllowed(
    id: string,
    signal: AbortSignal,
    permit?: object,
    expectedIdentityRevision?: string,
  ) {
    if (closed || signal.aborted) throw new PiChatGPTAuthFailure("canceled");
    if (closingRegistrations.has(id))
      throw new PiChatGPTAuthFailure("credential_missing");
    const current = await material(id);
    const identityRevision = getPiCredentialIdentityRevision(
      id,
      "model-provider",
    );
    if (signal.aborted || closed) throw new PiChatGPTAuthFailure("canceled");
    if (
      !current.record ||
      !identityRevision ||
      (expectedIdentityRevision &&
        expectedIdentityRevision !== identityRevision)
    )
      throw new PiChatGPTAuthFailure("credential_missing");
    if (
      current.record.reauthorizationRequired ||
      (current.record.rotation && !refreshes.has(id))
    )
      throw new PiChatGPTAuthFailure("reauthorization_required");
    if (
      !current.record.planEnabled ||
      !current.value.scope.includes(DIRECT_SCOPE)
    )
      throw new PiChatGPTAuthFailure("permission_missing");
    if (!current.record.welcomeAccepted)
      throw new PiChatGPTAuthFailure("welcome_required");
    if (current.record.paused) {
      const authorization = permit && permits.get(permit);
      if (
        !authorization ||
        authorization.used ||
        authorization.id !== id ||
        authorization.identityRevision !== identityRevision ||
        authorization.generation !== (current.record.pauseGeneration || 0)
      )
        throw new PiChatGPTAuthFailure("quota_paused");
      authorization.used = true;
    }
  }
  async function acceptWelcome(id: string) {
    const current = await material(id);
    if (
      !current.record ||
      !current.record.planEnabled ||
      !current.value.scope.includes(DIRECT_SCOPE)
    )
      throw new PiChatGPTAuthFailure("permission_missing");
    const doc = document();
    doc.registrations[id].welcomeAccepted = true;
    saveAndPublish(doc);
  }
  async function pause(id: string, expectedIdentityRevision?: string) {
    if (closed || closingRegistrations.has(id)) return;
    const metadata = listPiCredentials().find(
      (entry) => entry.id === id && entry.kind === "chatgpt",
    );
    if (
      !metadata ||
      (expectedIdentityRevision &&
        getPiCredentialIdentityRevision(id, "model-provider") !==
          expectedIdentityRevision)
    )
      return;
    const doc = document();
    const record = doc.registrations[id];
    if (!record) return;
    record.paused = true;
    record.pauseGeneration = (record.pauseGeneration || 0) + 1;
    saveAndPublish(doc);
  }
  async function withResumeProbe<T>(
    id: string,
    work: (permit: object) => Promise<T>,
  ): Promise<T> {
    if (closed || closingRegistrations.has(id))
      throw new PiChatGPTAuthFailure("canceled");
    if (probes.has(id)) throw new PiChatGPTAuthFailure("probe_active");
    probes.add(id);
    const permit = Object.freeze({});
    try {
      const current = await material(id);
      const identityRevision = getPiCredentialIdentityRevision(
        id,
        "model-provider",
      );
      if (!current.record || !identityRevision)
        throw new PiChatGPTAuthFailure("credential_missing");
      if (!current.record.paused)
        throw new PiChatGPTAuthFailure("invalid_state");
      const authorization = {
        id,
        identityRevision,
        generation: current.record.pauseGeneration || 0,
        used: false,
      };
      permits.set(permit, authorization);
      const result = await work(permit);
      if (!authorization.used)
        throw new PiChatGPTAuthFailure("invalid_response");
      if (
        !closed &&
        !closingRegistrations.has(id) &&
        getPiCredentialIdentityRevision(id, "model-provider") ===
          identityRevision
      ) {
        const doc = document();
        const record = doc.registrations[id];
        if (
          record?.paused &&
          (record.pauseGeneration || 0) === authorization.generation
        ) {
          record.paused = false;
          saveAndPublish(doc);
        }
      }
      return result;
    } finally {
      permits.delete(permit);
      probes.delete(id);
    }
  }
  function signOut(
    id: string,
    input: { remove?: boolean; deadline?: number } = {},
  ) {
    registrationId(id);
    const credential = listPiCredentials().find((entry) => entry.id === id);
    if (credential && credential.kind !== "chatgpt")
      return Promise.reject(new PiChatGPTAuthFailure("credential_missing"));
    const identityRevision = getPiCredentialIdentityRevision(
      id,
      "model-provider",
    );
    const existing = signouts.get(id);
    if (existing) return existing;
    closingRegistrations.add(id);
    if (active?.id === id) active.abort();
    const deadline = input.deadline ?? now() + 15_000;
    const work = (async () => {
      let revocation: "confirmed" | "unconfirmed" | "not_needed" = "not_needed";
      const flight = refreshes.get(id);
      let rotationUnknown = false;
      if (flight) {
        try {
          await waitBounded(flight.promise, deadline);
        } catch {
          rotationUnknown = flight.started;
          flight.controller.abort();
        }
      }
      const revokeController = controller();
      const timer = setTimeout(
        () => revokeController.abort(),
        Math.max(0, deadline - now()),
      );
      try {
        const current = await waitBounded(material(id), deadline);
        revocation = "unconfirmed";
        const metadataResponse = await request(DISCOVERY_ENDPOINT, {
          signal: revokeController.signal,
        });
        if (!metadataResponse.ok)
          throw new PiChatGPTAuthFailure("auth_unavailable", "revoke");
        const metadata = await json(metadataResponse, revokeController.signal);
        if (
          metadata.issuer !== ISSUER ||
          metadata.revocation_endpoint !== `${ISSUER}/api/accounts/oauth/revoke`
        )
          throw new PiChatGPTAuthFailure("invalid_response", "revoke");
        const response = await request(String(metadata.revocation_endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: current.value.refresh,
            token_type_hint: "refresh_token",
            client_id: current.value.clientId,
          }),
          signal: revokeController.signal,
        });
        if (
          response.status === 200 &&
          !rotationUnknown &&
          !current.record?.rotation
        )
          revocation = "confirmed";
      } catch (error) {
        if (
          !(
            error instanceof PiChatGPTAuthFailure &&
            error.code === "credential_missing"
          )
        )
          revocation = "unconfirmed";
      } finally {
        clearTimeout(timer);
        revokeController.abort();
        flight?.controller.abort();
        await deletePiCredential(id, "model-provider", {
          kind: "chatgpt",
          ...(identityRevision ? { identityRevision } : {}),
        });
        const doc = document();
        if (input.remove) delete doc.registrations[id];
        else if (doc.registrations[id]) {
          const record = doc.registrations[id];
          record.planEnabled = false;
          record.welcomeAccepted = false;
          record.reauthorizationRequired = false;
          delete record.rotation;
          saveAndPublish(doc);
        }
        if (input.remove) saveAndPublish(doc);
        pendingClients.delete(id);
        savePendingClients();
      }
      return { status: "signed_out" as const, revocation };
    })();
    signouts.set(id, work);
    void work
      .finally(() => {
        signouts.delete(id);
        closingRegistrations.delete(id);
      })
      .catch(() => undefined);
    return work;
  }
  async function shutdown(deadline = now() + 15_000) {
    closed = true;
    cancel();
    for (const flight of refreshes.values()) flight.controller.abort();
    const pending = [...refreshes.values()].map((flight) => flight.promise);
    if (active) pending.push(active.promise.then(() => ""));
    try {
      await waitBounded(Promise.allSettled(pending), deadline);
    } catch {
      /* bounded shutdown */
    }
  }
  return {
    connect,
    cancel,
    registrations,
    subscribeRegistrations,
    resolveAccess,
    assertAllowed,
    acceptWelcome,
    pause,
    withResumeProbe,
    signOut,
    shutdown,
    get closed() {
      return closed;
    },
  };
}

let singleton: ReturnType<typeof createPiChatGPTAuth> | undefined;
function auth() {
  return (singleton ??= createPiChatGPTAuth());
}
export const connectPiChatGPT = (args: ConnectInput) => auth().connect(args);
export const cancelPiChatGPTLogin = (requestId?: string) =>
  auth().cancel(requestId);
export const listPiChatGPTRegistrations = () => auth().registrations();
export const subscribePiChatGPTRegistrations = (
  listener: (registrations: readonly PiChatGPTRegistration[]) => void,
) => auth().subscribeRegistrations(listener);
export const shutdownPiChatGPTAuth = (deadline?: number) =>
  auth().shutdown(deadline);
export const resolvePiChatGPTAccess = (
  id: string,
  signal: AbortSignal,
  fetcher?: PiChatGPTAuthFetch,
  expected?: { identityRevision: string },
) => auth().resolveAccess(id, signal, fetcher, expected);
export const assertPiChatGPTInferenceAllowed = (
  id: string,
  signal: AbortSignal,
  permit?: object,
  expectedIdentityRevision?: string,
) => auth().assertAllowed(id, signal, permit, expectedIdentityRevision);
export const pausePiChatGPTInference = (
  id: string,
  expectedIdentityRevision?: string,
) => auth().pause(id, expectedIdentityRevision);
export const acceptPiChatGPTWelcome = (id: string) => auth().acceptWelcome(id);
export const withPiChatGPTResumeProbe = <T>(
  id: string,
  work: (permit: object) => Promise<T>,
) => auth().withResumeProbe(id, work);
export const signOutPiChatGPT = (
  id: string,
  input?: { remove?: boolean; deadline?: number },
) => auth().signOut(id, input);

/** Scope development-era cleanup to the retired credential and selection kinds. */
export async function initializePiChatGPTAuth() {
  if (singleton?.closed) singleton = undefined;
  const retired = listPiCredentials().filter(
    (entry) => String(entry.kind) === "openai-codex",
  );
  const raw = String(getPref("piProviderConfigurationJson") || "").trim();
  if (raw) {
    let parsed: Record<string, unknown>;
    try {
      parsed = object(JSON.parse(raw));
      if (
        parsed.version !== 2 ||
        !Array.isArray(parsed.connections) ||
        !Array.isArray(parsed.configurations)
      )
        throw new Error();
      const defaults = object(parsed.defaults);
      // The retired authentication lived on a connection, so the connection is
      // what goes: its cards and the purposes naming them follow, and every
      // other connection, card and purpose is left exactly as saved.
      const removedConnections = new Set<string>();
      const connections = parsed.connections.filter((value) => {
        const connection = object(value);
        const binding = connection.binding
          ? object(connection.binding)
          : undefined;
        if (
          connection.provider !== "openai-codex" &&
          connection.authVariant !== "openai-codex" &&
          connection.api !== "openai-codex-responses" &&
          binding?.api !== "openai-codex-responses"
        )
          return true;
        removedConnections.add(String(connection.id));
        return false;
      });
      const removed = new Set<string>();
      const configurations = parsed.configurations.filter((value) => {
        const card = object(value);
        if (!removedConnections.has(String(card.connectionId))) return true;
        removed.add(String(card.id));
        return false;
      });
      if (removedConnections.size) {
        for (const [key, selection] of Object.entries(defaults)) {
          if (
            selection &&
            typeof selection === "object" &&
            removed.has(
              String((selection as Record<string, unknown>).configurationId),
            )
          )
            delete defaults[key];
        }
        setPref(
          "piProviderConfigurationJson",
          JSON.stringify({ ...parsed, connections, configurations, defaults }),
        );
      }
    } catch {
      throw new PiChatGPTAuthFailure("auth_state_invalid");
    }
  }
  for (const entry of retired) {
    if (
      listPiCredentials().some(
        (current) =>
          current.id === entry.id && String(current.kind) === "openai-codex",
      )
    )
      await deletePiCredential(entry.id, "model-provider", {
        kind: "openai-codex",
      });
  }
  const { cleanupPiChatGPTLegacyCatalog } = await import("./piModelCatalog");
  await cleanupPiChatGPTLegacyCatalog();
  setPluginMetaValue("pi.chatgpt.development-cleanup.v1", "complete");
}
