import { getHostBridgeToken } from "../hostBridge/server/hostBridgeAuth";
import { getPref, setPref } from "../../utils/prefs";
const CREDENTIAL_SCHEMA_ID = "synthesis.webdav_sync_credential";
const CREDENTIAL_SCHEMA_VERSION = "1.0.0";
const PBKDF2_ITERATIONS = 100000;
function nowIso() {
    return new Date().toISOString();
}
function cryptoLike() {
    return globalThis.crypto;
}
function bytesToBase64(bytes) {
    const runtime = globalThis;
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
function base64ToBytes(input) {
    const runtime = globalThis;
    if (typeof runtime.atob === "function") {
        const binary = runtime.atob(input);
        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    }
    if (runtime.Buffer) {
        return Uint8Array.from(runtime.Buffer.from(input, "base64"));
    }
    throw new Error("base64 decoder unavailable");
}
async function deriveKey(salt) {
    const crypto = cryptoLike();
    if (!crypto?.subtle || !crypto.getRandomValues) {
        throw new Error("WebCrypto AES-GCM is unavailable");
    }
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(getHostBridgeToken()), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
    }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function storeSynthesisWebDavSyncCredential(credentialRaw) {
    const credential = String(credentialRaw || "").trim();
    if (!credential) {
        setPref("synthesisWebDavSyncCredentialEncryptedJson", "");
        setPref("synthesisWebDavSyncCredentialMasked", "");
        setPref("synthesisWebDavSyncCredentialUpdatedAt", "");
        return { stored: false };
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
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(credential));
    const timestamp = nowIso();
    const envelope = {
        schema_id: CREDENTIAL_SCHEMA_ID,
        schema_version: CREDENTIAL_SCHEMA_VERSION,
        algorithm: "AES-GCM",
        kdf: "PBKDF2-SHA256",
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
        created_at: timestamp,
    };
    setPref("synthesisWebDavSyncCredentialEncryptedJson", JSON.stringify(envelope));
    setPref("synthesisWebDavSyncCredentialMasked", "");
    setPref("synthesisWebDavSyncCredentialUpdatedAt", timestamp);
    return { stored: true, updatedAt: timestamp };
}
export async function readSynthesisWebDavSyncCredential() {
    const raw = String(getPref("synthesisWebDavSyncCredentialEncryptedJson") || "").trim();
    if (!raw) {
        return {
            ok: false,
            code: "webdav_sync_credential_missing",
            message: "WebDAV Sync credential is not configured.",
        };
    }
    const crypto = cryptoLike();
    if (!crypto?.subtle) {
        return {
            ok: false,
            code: "webdav_sync_credential_crypto_unavailable",
            message: "WebCrypto AES-GCM is unavailable.",
        };
    }
    try {
        const envelope = JSON.parse(raw);
        if (envelope.schema_id !== CREDENTIAL_SCHEMA_ID ||
            envelope.schema_version !== CREDENTIAL_SCHEMA_VERSION ||
            envelope.algorithm !== "AES-GCM") {
            throw new Error("unsupported credential envelope");
        }
        const key = await deriveKey(base64ToBytes(envelope.salt));
        const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext));
        return {
            ok: true,
            credential: new TextDecoder().decode(plaintext),
        };
    }
    catch {
        return {
            ok: false,
            code: "webdav_sync_credential_decrypt_failed",
            message: "WebDAV Sync credential could not be decrypted.",
        };
    }
}
