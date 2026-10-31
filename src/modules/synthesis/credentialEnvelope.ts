import { getHostBridgeToken } from "../hostBridge/server/hostBridgeAuth";

export const SYNTHESIS_CREDENTIAL_ALGORITHM = "AES-GCM" as const;
export const SYNTHESIS_CREDENTIAL_KDF = "PBKDF2-SHA256" as const;
export const SYNTHESIS_CREDENTIAL_ITERATIONS = 100000;

export type SynthesisEncryptedCredentialEnvelope = {
  schema_id: string;
  schema_version: string;
  algorithm: typeof SYNTHESIS_CREDENTIAL_ALGORITHM;
  kdf: typeof SYNTHESIS_CREDENTIAL_KDF;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function cryptoLike() {
  return (globalThis as { crypto?: Crypto }).crypto;
}

export function synthesisCredentialCryptoAvailable() {
  const crypto = cryptoLike();
  return Boolean(crypto?.subtle && crypto.getRandomValues);
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

async function deriveKey(salt: Uint8Array) {
  const crypto = cryptoLike();
  if (!crypto?.subtle || !crypto.getRandomValues) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getHostBridgeToken()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: SYNTHESIS_CREDENTIAL_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: SYNTHESIS_CREDENTIAL_ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSynthesisCredentialContent(args: {
  plaintext: string;
  schemaId: string;
  schemaVersion: string;
}): Promise<SynthesisEncryptedCredentialEnvelope> {
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
    { name: SYNTHESIS_CREDENTIAL_ALGORITHM, iv },
    key,
    new TextEncoder().encode(args.plaintext),
  );
  return {
    schema_id: args.schemaId,
    schema_version: args.schemaVersion,
    algorithm: SYNTHESIS_CREDENTIAL_ALGORITHM,
    kdf: SYNTHESIS_CREDENTIAL_KDF,
    iterations: SYNTHESIS_CREDENTIAL_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    created_at: nowIso(),
  };
}

export async function decryptSynthesisCredentialContent(args: {
  envelope: unknown;
  schemaId: string;
  schemaVersion: string;
}): Promise<string> {
  const crypto = cryptoLike();
  if (!crypto?.subtle) {
    throw new Error("WebCrypto AES-GCM is unavailable");
  }
  const envelope = args.envelope as SynthesisEncryptedCredentialEnvelope;
  if (
    !envelope ||
    typeof envelope !== "object" ||
    envelope.schema_id !== args.schemaId ||
    envelope.schema_version !== args.schemaVersion ||
    envelope.algorithm !== SYNTHESIS_CREDENTIAL_ALGORITHM
  ) {
    throw new Error("unsupported credential envelope");
  }
  const key = await deriveKey(base64ToBytes(envelope.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: SYNTHESIS_CREDENTIAL_ALGORITHM, iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
