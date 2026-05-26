import { getHostBridgeToken } from "../hostBridgeAuth";
import { getPref, setPref } from "../../utils/prefs";

const TOKEN_SCHEMA_ID = "synthesis.git_sync_token";
const TOKEN_SCHEMA_VERSION = "1.0.0";
const PBKDF2_ITERATIONS = 100000;
const TOKEN_MASK_PREFIX = 6;
const TOKEN_MASK_SUFFIX = 4;

export type SynthesisGitSyncTokenEnvelope = {
  schema_id: typeof TOKEN_SCHEMA_ID;
  schema_version: typeof TOKEN_SCHEMA_VERSION;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  created_at: string;
};

export type SynthesisGitSyncTokenReadResult =
  | { ok: true; token: string }
  | {
      ok: false;
      code:
        | "git_sync_token_missing"
        | "git_sync_token_crypto_unavailable"
        | "git_sync_token_decrypt_failed";
      message: string;
    };

function nowIso() {
  return new Date().toISOString();
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

function maskToken(token: string) {
  const value = String(token || "").trim();
  if (!value) {
    return "";
  }
  if (value.length <= TOKEN_MASK_PREFIX + TOKEN_MASK_SUFFIX) {
    return "****";
  }
  return `${value.slice(0, TOKEN_MASK_PREFIX)}...${value.slice(-TOKEN_MASK_SUFFIX)}`;
}

async function deriveKey(salt: Uint8Array) {
  const crypto = cryptoLike();
  if (!crypto?.subtle || !crypto.getRandomValues) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(getHostBridgeToken()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function storeSynthesisGitSyncToken(tokenRaw: string) {
  const token = String(tokenRaw || "").trim();
  if (!token) {
    setPref("synthesisGitSyncTokenEncryptedJson", "");
    setPref("synthesisGitSyncTokenMasked", "");
    setPref("synthesisGitSyncTokenUpdatedAt", "");
    return { stored: false, masked: "" };
  }
  const crypto = cryptoLike();
  if (!crypto?.subtle || !crypto.getRandomValues) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);
  const key = await deriveKey(salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder().encode(token),
  );
  const timestamp = nowIso();
  const envelope: SynthesisGitSyncTokenEnvelope = {
    schema_id: TOKEN_SCHEMA_ID,
    schema_version: TOKEN_SCHEMA_VERSION,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    created_at: timestamp,
  };
  const masked = maskToken(token);
  setPref("synthesisGitSyncTokenEncryptedJson", JSON.stringify(envelope));
  setPref("synthesisGitSyncTokenMasked", masked);
  setPref("synthesisGitSyncTokenUpdatedAt", timestamp);
  return { stored: true, masked, updatedAt: timestamp };
}

export async function readSynthesisGitSyncToken(): Promise<SynthesisGitSyncTokenReadResult> {
  const raw = String(
    getPref("synthesisGitSyncTokenEncryptedJson") || "",
  ).trim();
  if (!raw) {
    return {
      ok: false,
      code: "git_sync_token_missing",
      message: "Git Sync token is not configured.",
    };
  }
  const crypto = cryptoLike();
  if (!crypto?.subtle) {
    return {
      ok: false,
      code: "git_sync_token_crypto_unavailable",
      message: "WebCrypto AES-GCM is unavailable.",
    };
  }
  try {
    const envelope = JSON.parse(raw) as SynthesisGitSyncTokenEnvelope;
    if (
      envelope.schema_id !== TOKEN_SCHEMA_ID ||
      envelope.schema_version !== TOKEN_SCHEMA_VERSION ||
      envelope.algorithm !== "AES-GCM"
    ) {
      throw new Error("unsupported token envelope");
    }
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    return {
      ok: true,
      token: new TextDecoder().decode(plaintext),
    };
  } catch {
    return {
      ok: false,
      code: "git_sync_token_decrypt_failed",
      message: "Git Sync token could not be decrypted.",
    };
  }
}
