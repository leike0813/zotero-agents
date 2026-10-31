import { getPref, setPref } from "../../utils/prefs";
import {
  decryptSynthesisCredentialContent,
  encryptSynthesisCredentialContent,
  synthesisCredentialCryptoAvailable,
  type SynthesisEncryptedCredentialEnvelope,
} from "./credentialEnvelope";

const CREDENTIAL_SCHEMA_ID = "synthesis.embedding_credential";
const CREDENTIAL_SCHEMA_VERSION = "1.0.0";
const CREDENTIALS_PREF = "synthesisEmbeddingCredentialsJson";

type EnvelopeMap = Record<string, SynthesisEncryptedCredentialEnvelope>;

export type SynthesisEmbeddingCredentialReadResult =
  | { ok: true; credential: string }
  | {
      ok: false;
      code:
        | "embedding_credential_missing"
        | "embedding_credential_crypto_unavailable"
        | "embedding_credential_decrypt_failed";
      message: string;
    };

function cleanId(connectionId: unknown) {
  return String(connectionId || "").trim();
}

function readMap(): EnvelopeMap {
  const raw = String(getPref(CREDENTIALS_PREF) || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as EnvelopeMap)
      : {};
  } catch {
    return {};
  }
}

function writeMap(map: EnvelopeMap) {
  setPref(CREDENTIALS_PREF, Object.keys(map).length ? JSON.stringify(map) : "");
}

export function listSynthesisEmbeddingCredentialConnectionIds(): string[] {
  return Object.keys(readMap()).sort();
}

export function hasSynthesisEmbeddingCredential(connectionId: string) {
  return Boolean(readMap()[cleanId(connectionId)]);
}

export function getSynthesisEmbeddingCredentialUpdatedAt(connectionId: string) {
  return readMap()[cleanId(connectionId)]?.created_at || undefined;
}

export async function storeSynthesisEmbeddingCredential(
  connectionId: string,
  credentialRaw: string,
): Promise<{ stored: boolean }> {
  const id = cleanId(connectionId);
  if (!id) {
    throw new Error("embedding connection id is required");
  }
  const map = readMap();
  const credential = String(credentialRaw || "").trim();
  if (!credential) {
    delete map[id];
    writeMap(map);
    return { stored: false };
  }
  map[id] = await encryptSynthesisCredentialContent({
    plaintext: credential,
    schemaId: CREDENTIAL_SCHEMA_ID,
    schemaVersion: CREDENTIAL_SCHEMA_VERSION,
  });
  writeMap(map);
  return { stored: true };
}

export async function clearSynthesisEmbeddingCredential(
  connectionId: string,
): Promise<{ cleared: boolean }> {
  return {
    cleared:
      (await storeSynthesisEmbeddingCredential(connectionId, "")).stored ===
      false,
  };
}

export async function readSynthesisEmbeddingCredential(
  connectionId: string,
): Promise<SynthesisEmbeddingCredentialReadResult> {
  const envelope = readMap()[cleanId(connectionId)];
  if (!envelope) {
    return {
      ok: false,
      code: "embedding_credential_missing",
      message: "Embedding credential is not configured.",
    };
  }
  if (!synthesisCredentialCryptoAvailable()) {
    return {
      ok: false,
      code: "embedding_credential_crypto_unavailable",
      message: "WebCrypto AES-GCM is unavailable.",
    };
  }
  try {
    const credential = await decryptSynthesisCredentialContent({
      envelope,
      schemaId: CREDENTIAL_SCHEMA_ID,
      schemaVersion: CREDENTIAL_SCHEMA_VERSION,
    });
    return { ok: true, credential };
  } catch {
    return {
      ok: false,
      code: "embedding_credential_decrypt_failed",
      message: "Embedding credential could not be decrypted.",
    };
  }
}
