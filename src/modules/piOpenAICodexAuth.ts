import {
  getPiCredentialRevision,
  listPiCredentials,
  putPiCredential,
  readPiCredential,
  type PiCredentialMetadata,
} from "./piCredentialStore";

const AUTH = "https://auth.openai.com";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEVICE_TIMEOUT_MS = 15 * 60_000;
const ACCOUNT_CLAIM = "https://api.openai.com/auth";

type AuthResponse = Pick<Response, "ok" | "status" | "json">;
type AuthFetch = (url: string, init: RequestInit) => Promise<AuthResponse>;

async function zoteroAuthFetch(
  url: string,
  init: RequestInit,
): Promise<AuthResponse> {
  const signal = init.signal;
  let cancel: (() => void) | undefined;
  const abort = () => cancel?.();
  if (signal?.aborted) throw new Error("Canceled");
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const options = {
      body: String(init.body || ""),
      headers: init.headers,
      anon: true,
      noCache: true,
      followRedirects: false,
      successCodes: false as const,
      logBodyLength: 0,
      timeout: 30_000,
      errorDelayMax: 0,
      cancellerReceiver: (stop: () => void) => {
        cancel = stop;
        if (signal?.aborted) stop();
      },
    };
    const xhr = await Zotero.HTTP.request("POST", url, options);
    return {
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      json: async () => JSON.parse(xhr.responseText || ""),
    };
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

function defaultAuthFetch(): AuthFetch {
  return typeof Zotero !== "undefined" &&
    typeof Zotero.HTTP?.request === "function"
    ? zoteroAuthFetch
    : globalThis.fetch;
}

export class PiCodexAuthFailure extends Error {
  constructor(
    readonly code:
      | "canceled"
      | "expired"
      | "auth_unavailable"
      | "auth_rejected"
      | "invalid_response"
      | "account_missing"
      | "credential_missing",
    readonly phase?: "start" | "poll" | "exchange" | "refresh",
  ) {
    super(code);
  }
}

const refreshes = new Map<string, Promise<string>>();

function aborted(signal: AbortSignal): void {
  if (signal.aborted) throw new PiCodexAuthFailure("canceled");
}

async function request(
  url: string,
  body: Record<string, string>,
  signal: AbortSignal,
  fetcher: AuthFetch,
  phase: "start" | "poll" | "refresh",
): Promise<AuthResponse> {
  aborted(signal);
  try {
    return await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new PiCodexAuthFailure(
      signal.aborted ? "canceled" : "auth_unavailable",
      phase,
    );
  }
}

async function json(response: AuthResponse): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    if (value && typeof value === "object" && !Array.isArray(value))
      return value as Record<string, unknown>;
  } catch {
    // A malformed Provider response is never returned to the caller.
  }
  throw new PiCodexAuthFailure("invalid_response");
}

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tokenClaims(access: string): Record<string, unknown> | undefined {
  try {
    const payload = access.split(".")[1];
    if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) return undefined;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    );
    return claims && typeof claims === "object" && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : undefined;
  } catch {
    // The token is opaque except for the claims needed by Pi.
    return undefined;
  }
}

function accountId(access: string): string {
  const auth = tokenClaims(access)?.[ACCOUNT_CLAIM];
  const id =
    auth && typeof auth === "object"
      ? string((auth as Record<string, unknown>).chatgpt_account_id)
      : "";
  if (id) return id;
  throw new PiCodexAuthFailure("account_missing");
}

function expiration(data: Record<string, unknown>, access: string): number {
  const expiresIn = data.expires_in;
  if (
    typeof expiresIn === "number" &&
    Number.isFinite(expiresIn) &&
    expiresIn > 0
  )
    return Date.now() + expiresIn * 1000;
  const exp = tokenClaims(access)?.exp;
  if (
    typeof exp === "number" &&
    Number.isFinite(exp) &&
    exp * 1000 > Date.now()
  )
    return exp * 1000;
  throw new PiCodexAuthFailure("invalid_response");
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new PiCodexAuthFailure("canceled"));
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    const cancel = () => {
      clearTimeout(timer);
      reject(new PiCodexAuthFailure("canceled"));
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function connectPiOpenAICodex(args: {
  id: string;
  label: string;
  signal: AbortSignal;
  onCode: (code: { verificationUrl: string; userCode: string }) => void;
  fetch?: typeof fetch;
}): Promise<PiCredentialMetadata> {
  const expectedRevision = getPiCredentialRevision(args.id, "model-provider");
  const fetcher = args.fetch || defaultAuthFetch();
  const start = await request(
    `${AUTH}/api/accounts/deviceauth/usercode`,
    { client_id: CLIENT_ID },
    args.signal,
    fetcher,
    "start",
  );
  if (!start.ok) throw new PiCodexAuthFailure("auth_unavailable", "start");
  const device = await json(start);
  const deviceId = string(device.device_auth_id);
  const userCode = string(device.user_code);
  const rawInterval =
    typeof device.interval === "string"
      ? Number(device.interval.trim())
      : device.interval;
  if (
    !deviceId ||
    !userCode ||
    typeof rawInterval !== "number" ||
    !Number.isFinite(rawInterval) ||
    rawInterval < 0
  )
    throw new PiCodexAuthFailure("invalid_response");
  args.onCode({
    verificationUrl: `${AUTH}/codex/device`,
    userCode,
  });
  const deadline = Date.now() + DEVICE_TIMEOUT_MS;
  let intervalMs = Math.max(1000, Math.floor(rawInterval * 1000));
  let authorizationCode = "";
  let verifier = "";
  let networkFailures = 0;
  while (Date.now() < deadline) {
    let poll: AuthResponse;
    try {
      poll = await request(
        `${AUTH}/api/accounts/deviceauth/token`,
        { device_auth_id: deviceId, user_code: userCode },
        args.signal,
        fetcher,
        "poll",
      );
      networkFailures = 0;
    } catch (error) {
      if (
        !(error instanceof PiCodexAuthFailure) ||
        error.code !== "auth_unavailable" ||
        ++networkFailures >= 3
      )
        throw error;
      await sleep(
        Math.min(intervalMs, Math.max(0, deadline - Date.now())),
        args.signal,
      );
      continue;
    }
    if (poll.ok) {
      const result = await json(poll);
      authorizationCode = string(result.authorization_code);
      verifier = string(result.code_verifier);
      if (!authorizationCode || !verifier)
        throw new PiCodexAuthFailure("invalid_response");
      break;
    }
    if (poll.status !== 403 && poll.status !== 404) {
      const error = await json(poll).catch((): Record<string, unknown> => ({}));
      const code =
        typeof error.error === "string"
          ? error.error
          : error.error && typeof error.error === "object"
            ? string((error.error as Record<string, unknown>).code)
            : "";
      if (code === "slow_down") intervalMs += 5000;
      else if (code !== "deviceauth_authorization_pending")
        throw new PiCodexAuthFailure("auth_rejected");
    }
    await sleep(
      Math.min(intervalMs, Math.max(0, deadline - Date.now())),
      args.signal,
    );
  }
  if (!authorizationCode) throw new PiCodexAuthFailure("expired");
  aborted(args.signal);
  let token: AuthResponse;
  try {
    token = await fetcher(`${AUTH}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code: authorizationCode,
        code_verifier: verifier,
        redirect_uri: `${AUTH}/deviceauth/callback`,
      }),
      signal: args.signal,
    });
  } catch {
    throw new PiCodexAuthFailure(
      args.signal.aborted ? "canceled" : "auth_unavailable",
      "exchange",
    );
  }
  if (!token.ok) throw new PiCodexAuthFailure("auth_rejected");
  const data = await json(token);
  const access = string(data.access_token);
  const refresh = string(data.refresh_token);
  if (!access || !refresh) throw new PiCodexAuthFailure("invalid_response");
  const expires = expiration(data, access);
  const id = accountId(access);
  aborted(args.signal);
  try {
    return await putPiCredential({
      id: args.id,
      label: args.label,
      expectedRevision,
      signal: args.signal,
      material: {
        kind: "openai-codex",
        access,
        refresh,
        expiresAt: expires,
        accountId: id,
      },
    });
  } catch {
    throw new PiCodexAuthFailure(
      args.signal.aborted ? "canceled" : "credential_missing",
    );
  }
}

export async function resolvePiOpenAICodexAccess(
  credentialId: string,
  signal: AbortSignal,
  fetcher: AuthFetch = defaultAuthFetch(),
): Promise<string> {
  aborted(signal);
  const active = refreshes.get(credentialId);
  if (active) {
    const access = await active;
    aborted(signal);
    return access;
  }
  const work = (async () => {
    const revision = getPiCredentialRevision(credentialId, "model-provider");
    const resolved = await readPiCredential(credentialId);
    if (
      !revision ||
      !resolved.ok ||
      resolved.material.kind !== "openai-codex" ||
      getPiCredentialRevision(credentialId, "model-provider") !== revision
    )
      throw new PiCodexAuthFailure("credential_missing");
    const current = resolved.material;
    if (current.expiresAt > Date.now() + 60_000) return current.access;
    const response = await request(
      `${AUTH}/oauth/token`,
      {
        grant_type: "refresh_token",
        refresh_token: current.refresh,
        client_id: CLIENT_ID,
      },
      signal,
      fetcher,
      "refresh",
    );
    if (!response.ok) throw new PiCodexAuthFailure("auth_rejected");
    const data = await json(response);
    const access = string(data.access_token);
    if (!access) throw new PiCodexAuthFailure("invalid_response");
    const refresh = string(data.refresh_token) || current.refresh;
    const expiresAt = expiration(data, access);
    if (accountId(access) !== current.accountId)
      throw new PiCodexAuthFailure("account_missing");
    aborted(signal);
    try {
      await putPiCredential({
        id: credentialId,
        label:
          listPiCredentials().find((item) => item.id === credentialId)?.label ||
          "OpenAI Codex",
        expectedRevision: revision,
        signal,
        material: {
          kind: "openai-codex",
          access,
          refresh,
          expiresAt,
          accountId: current.accountId,
        },
      });
    } catch {
      throw new PiCodexAuthFailure(
        signal.aborted ? "canceled" : "credential_missing",
      );
    }
    return access;
  })();
  refreshes.set(credentialId, work);
  try {
    const access = await work;
    aborted(signal);
    return access;
  } finally {
    if (refreshes.get(credentialId) === work) refreshes.delete(credentialId);
  }
}
