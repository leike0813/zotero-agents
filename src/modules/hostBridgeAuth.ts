import { getPref, setPref } from "../utils/prefs";

const TOKEN_BYTES = 24;
const MASK_PREFIX = 6;
const MASK_SUFFIX = 4;
const MASTER_TOKEN_SCHEMA_ID = "host_bridge.master_token";
const MASTER_TOKEN_SCHEMA_VERSION = "1.0.0";
const MASTER_KEY_BYTES = 32;
const MASTER_PBKDF2_ITERATIONS = 100000;

type HostBridgeMasterTokenEnvelope = {
  schema_id: typeof MASTER_TOKEN_SCHEMA_ID;
  schema_version: typeof MASTER_TOKEN_SCHEMA_VERSION;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  created_at: string;
};

export type HostBridgeMasterTokenReadResult =
  | {
      ok: true;
      token: string;
      tokenMasked: string;
      updatedAt: string;
    }
  | {
      ok: false;
      code:
        | "host_bridge_master_token_missing"
        | "host_bridge_master_token_crypto_unavailable"
        | "host_bridge_master_token_decrypt_failed";
      message: string;
    };

function nowIso() {
  return new Date().toISOString();
}

export function generateHostBridgeToken() {
  const cryptoLike = (globalThis as { crypto?: Crypto }).crypto;
  if (!cryptoLike?.getRandomValues) {
    throw new Error(
      "Secure random source is unavailable for Host Bridge token generation",
    );
  }
  const bytes = new Uint8Array(TOKEN_BYTES);
  cryptoLike.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function cryptoLike() {
  return (globalThis as { crypto?: Crypto }).crypto;
}

function textEncoder() {
  return new TextEncoder();
}

function bytesToBase64(bytes: Uint8Array) {
  const runtime = globalThis as {
    btoa?: (input: string) => string;
    Buffer?: {
      from: (
        input: Uint8Array | string,
        encoding?: string,
      ) => { toString: (encoding?: string) => string };
    };
  };
  if (typeof runtime.btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return runtime.btoa(binary);
  }
  if (runtime.Buffer) {
    return runtime.Buffer.from(bytes).toString("base64");
  }
  throw new Error("base64 encoder unavailable");
}

function base64ToBytes(input: string) {
  const runtime = globalThis as {
    atob?: (input: string) => string;
    Buffer?: { from: (input: string, encoding?: string) => Uint8Array };
  };
  if (typeof runtime.atob === "function") {
    const binary = runtime.atob(input);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  if (runtime.Buffer) {
    return Uint8Array.from(runtime.Buffer.from(input, "base64"));
  }
  throw new Error("base64 decoder unavailable");
}

export function redactHostBridgeToken(token: string) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= MASK_PREFIX + MASK_SUFFIX) {
    return "****";
  }
  return `${normalized.slice(0, MASK_PREFIX)}...${normalized.slice(-MASK_SUFFIX)}`;
}

function getOrCreateMasterKeyMaterial() {
  const existing = String(getPref("hostBridgeMasterTokenKeyMaterial") || "").trim();
  if (existing) {
    return existing;
  }
  const crypto = cryptoLike();
  if (!crypto?.getRandomValues) {
    throw new Error(
      "Secure random source is unavailable for Host Bridge master token key generation",
    );
  }
  const bytes = new Uint8Array(MASTER_KEY_BYTES);
  crypto.getRandomValues(bytes);
  const material = bytesToHex(bytes);
  setPref("hostBridgeMasterTokenKeyMaterial", material);
  return material;
}

async function deriveMasterTokenKey(salt: Uint8Array) {
  const crypto = cryptoLike();
  if (!crypto?.subtle || !crypto.getRandomValues) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(getOrCreateMasterKeyMaterial()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: MASTER_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function getHostBridgeToken() {
  const existing = String(getPref("hostBridgeToken") || "").trim();
  if (existing) {
    return existing;
  }
  const token = generateHostBridgeToken();
  const createdAt = nowIso();
  setPref("hostBridgeToken", token);
  setPref("hostBridgeTokenCreatedAt", createdAt);
  setPref("hostBridgeTokenRotatedAt", "");
  return token;
}

export function getHostBridgeMasterTokenStatus() {
  return {
    configured: Boolean(String(getPref("hostBridgeMasterTokenEncryptedJson") || "").trim()),
    tokenMasked: String(getPref("hostBridgeMasterTokenMasked") || "").trim(),
    updatedAt: String(getPref("hostBridgeMasterTokenUpdatedAt") || "").trim(),
  };
}

export async function rotateHostBridgeMasterToken() {
  const crypto = cryptoLike();
  if (!crypto?.subtle || !crypto.getRandomValues) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const token = generateHostBridgeToken();
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);
  const key = await deriveMasterTokenKey(salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder().encode(token),
  );
  const timestamp = nowIso();
  const envelope: HostBridgeMasterTokenEnvelope = {
    schema_id: MASTER_TOKEN_SCHEMA_ID,
    schema_version: MASTER_TOKEN_SCHEMA_VERSION,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: MASTER_PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    created_at: timestamp,
  };
  const tokenMasked = redactHostBridgeToken(token);
  setPref("hostBridgeMasterTokenEncryptedJson", JSON.stringify(envelope));
  setPref("hostBridgeMasterTokenMasked", tokenMasked);
  setPref("hostBridgeMasterTokenUpdatedAt", timestamp);
  return {
    token,
    tokenMasked,
    rotatedAt: timestamp,
  };
}

export async function readHostBridgeMasterToken(): Promise<HostBridgeMasterTokenReadResult> {
  const raw = String(getPref("hostBridgeMasterTokenEncryptedJson") || "").trim();
  if (!raw) {
    return {
      ok: false,
      code: "host_bridge_master_token_missing",
      message: "Host Bridge master token is not configured.",
    };
  }
  const crypto = cryptoLike();
  if (!crypto?.subtle) {
    return {
      ok: false,
      code: "host_bridge_master_token_crypto_unavailable",
      message: "WebCrypto AES-GCM is unavailable.",
    };
  }
  try {
    const envelope = JSON.parse(raw) as HostBridgeMasterTokenEnvelope;
    if (
      envelope.schema_id !== MASTER_TOKEN_SCHEMA_ID ||
      envelope.schema_version !== MASTER_TOKEN_SCHEMA_VERSION ||
      envelope.algorithm !== "AES-GCM"
    ) {
      throw new Error("unsupported master token envelope");
    }
    const key = await deriveMasterTokenKey(base64ToBytes(envelope.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    const token = new TextDecoder().decode(plaintext);
    return {
      ok: true,
      token,
      tokenMasked: redactHostBridgeToken(token),
      updatedAt: String(
        getPref("hostBridgeMasterTokenUpdatedAt") || envelope.created_at || "",
      ),
    };
  } catch {
    return {
      ok: false,
      code: "host_bridge_master_token_decrypt_failed",
      message: "Host Bridge master token could not be decrypted.",
    };
  }
}

export function rotateHostBridgeToken() {
  const token = generateHostBridgeToken();
  const now = nowIso();
  if (!String(getPref("hostBridgeTokenCreatedAt") || "").trim()) {
    setPref("hostBridgeTokenCreatedAt", now);
  }
  setPref("hostBridgeToken", token);
  setPref("hostBridgeTokenRotatedAt", now);
  return {
    token,
    tokenMasked: redactHostBridgeToken(token),
    rotatedAt: now,
  };
}

function timingSafeEqualString(a: string, b: string) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export async function isHostBridgeAuthorizationValid(
  headers: Record<string, string>,
  expectedToken = getHostBridgeToken(),
) {
  const authorization = String(headers.authorization || "").trim();
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    return false;
  }
  const token = authorization.slice(prefix.length).trim();
  if (!token) {
    return false;
  }
  if (timingSafeEqualString(token, expectedToken)) {
    return true;
  }
  const masterToken = await readHostBridgeMasterToken();
  return masterToken.ok && timingSafeEqualString(token, masterToken.token);
}
