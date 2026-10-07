import { getPref, setPref } from "../../utils/prefs";
import {
  decryptSynthesisCredentialContent,
  encryptSynthesisCredentialContent,
  synthesisCredentialCryptoAvailable,
  type SynthesisEncryptedCredentialEnvelope,
} from "./credentialEnvelope";

const CREDENTIAL_SCHEMA_ID = "synthesis.webdav_sync_credential";
const CREDENTIAL_SCHEMA_VERSION = "1.0.0";

export type SynthesisWebDavSyncCredentialEnvelope =
  SynthesisEncryptedCredentialEnvelope & {
    schema_id: typeof CREDENTIAL_SCHEMA_ID;
    schema_version: typeof CREDENTIAL_SCHEMA_VERSION;
  };

export type SynthesisWebDavSyncCredentialReadResult =
  | { ok: true; credential: string }
  | {
      ok: false;
      code:
        | "webdav_sync_credential_missing"
        | "webdav_sync_credential_crypto_unavailable"
        | "webdav_sync_credential_decrypt_failed";
      message: string;
    };

export async function storeSynthesisWebDavSyncCredential(
  credentialRaw: string,
) {
  const credential = String(credentialRaw || "").trim();
  if (!credential) {
    setPref("synthesisWebDavSyncCredentialEncryptedJson", "");
    setPref("synthesisWebDavSyncCredentialMasked", "");
    setPref("synthesisWebDavSyncCredentialUpdatedAt", "");
    return { stored: false };
  }
  const envelope = (await encryptSynthesisCredentialContent({
    plaintext: credential,
    schemaId: CREDENTIAL_SCHEMA_ID,
    schemaVersion: CREDENTIAL_SCHEMA_VERSION,
  })) as SynthesisWebDavSyncCredentialEnvelope;
  setPref(
    "synthesisWebDavSyncCredentialEncryptedJson",
    JSON.stringify(envelope),
  );
  setPref("synthesisWebDavSyncCredentialMasked", "");
  setPref("synthesisWebDavSyncCredentialUpdatedAt", envelope.created_at);
  return { stored: true, updatedAt: envelope.created_at };
}

export async function readSynthesisWebDavSyncCredential(): Promise<SynthesisWebDavSyncCredentialReadResult> {
  const raw = String(
    getPref("synthesisWebDavSyncCredentialEncryptedJson") || "",
  ).trim();
  if (!raw) {
    return {
      ok: false,
      code: "webdav_sync_credential_missing",
      message: "WebDAV Sync credential is not configured.",
    };
  }
  if (!synthesisCredentialCryptoAvailable()) {
    return {
      ok: false,
      code: "webdav_sync_credential_crypto_unavailable",
      message: "WebCrypto AES-GCM is unavailable.",
    };
  }
  try {
    const credential = await decryptSynthesisCredentialContent({
      envelope: JSON.parse(raw),
      schemaId: CREDENTIAL_SCHEMA_ID,
      schemaVersion: CREDENTIAL_SCHEMA_VERSION,
    });
    return { ok: true, credential };
  } catch {
    return {
      ok: false,
      code: "webdav_sync_credential_decrypt_failed",
      message: "WebDAV Sync credential could not be decrypted.",
    };
  }
}
