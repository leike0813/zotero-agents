import { getPref, setPref } from "../utils/prefs";
import { getPluginMetaValue, setPluginMetaValue } from "./pluginStateStore";
import type {
  PiCredentialMaterial,
  PiCredentialMetadata,
} from "../shared/piProviderContract";
export type {
  PiCredentialMaterial,
  PiCredentialMetadata,
} from "../shared/piProviderContract";

type Envelope = PiCredentialMetadata & { iv: string; ciphertext: string };
type CredentialDocument = { version: 1; records: Record<string, Envelope> };
export type PiCredentialReadResult =
  | { ok: true; material: PiCredentialMaterial }
  | { ok: false; code: "missing" | "crypto_unavailable" | "decrypt_failed" };

const KEY_META = "pi.credential.key.v1";
const EMPTY: CredentialDocument = { version: 1, records: {} };
let writeQueue: Promise<unknown> = Promise.resolve();

function encode(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  if (typeof btoa !== "function") throw new Error("Base64 unavailable");
  return btoa(raw);
}
function decode(value: string): Uint8Array {
  if (typeof atob !== "function") throw new Error("Base64 unavailable");
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function cryptoApi() {
  const api = globalThis.crypto;
  if (!api?.subtle || !api.getRandomValues)
    throw new Error("Pi credential crypto unavailable");
  return api;
}
function load(): CredentialDocument {
  const raw = String(getPref("piCredentialEncryptedJson") || "").trim();
  if (!raw) return { version: 1, records: {} };
  const doc = JSON.parse(raw) as CredentialDocument;
  if (
    doc.version !== 1 ||
    !doc.records ||
    typeof doc.records !== "object" ||
    Array.isArray(doc.records)
  )
    throw new Error("Invalid Pi credential envelope");
  return doc;
}
function idText(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (
    !/^[A-Za-z0-9._-]{1,128}$/.test(id) ||
    ["__proto__", "constructor", "prototype"].includes(id)
  )
    throw new Error("Invalid Pi credential ID");
  return id;
}
async function key(create: boolean) {
  const api = cryptoApi();
  let encoded = getPluginMetaValue(KEY_META);
  if (!encoded && create) {
    const bytes = new Uint8Array(32);
    api.getRandomValues(bytes);
    encoded = encode(bytes);
    setPluginMetaValue(KEY_META, encoded);
  }
  if (!encoded) throw new Error("Pi credential profile key missing");
  const bytes = decode(encoded);
  if (bytes.length !== 32) throw new Error("Invalid Pi credential profile key");
  return api.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
function validateMaterial(material: PiCredentialMaterial): void {
  if (
    material?.kind === "api-key" &&
    typeof material.secret === "string" &&
    material.secret.trim()
  )
    return;
  if (
    material?.kind === "openai-codex" &&
    typeof material.access === "string" &&
    material.access &&
    typeof material.refresh === "string" &&
    material.refresh &&
    Number.isFinite(material.expiresAt) &&
    typeof material.accountId === "string" &&
    material.accountId
  )
    return;
  throw new Error("Invalid Pi credential material");
}
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

export function listPiCredentials(): PiCredentialMetadata[] {
  try {
    return Object.values(load().records).map(
      ({ id, label, kind, masked, updatedAt }) => ({
        id,
        label,
        kind,
        masked,
        updatedAt,
      }),
    );
  } catch {
    return [];
  }
}

export function putPiCredential(args: {
  id: string;
  label: string;
  material: PiCredentialMaterial;
}): Promise<PiCredentialMetadata> {
  return enqueue(async () => {
    const id = idText(args.id);
    const label = String(args.label || "").trim();
    if (!label || label.length > 128)
      throw new Error("Pi credential label is required");
    validateMaterial(args.material);
    const doc = load();
    const api = cryptoApi();
    const iv = new Uint8Array(12);
    api.getRandomValues(iv);
    const secret = await key(true);
    const ciphertext = await api.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(`pi-credential:${id}`),
      },
      secret,
      new TextEncoder().encode(JSON.stringify(args.material)),
    );
    const metadata: PiCredentialMetadata = {
      id,
      label,
      kind: args.material.kind,
      masked:
        args.material.kind === "api-key"
          ? "••••"
          : `••••${args.material.accountId.slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };
    doc.records[id] = {
      ...metadata,
      iv: encode(iv),
      ciphertext: encode(new Uint8Array(ciphertext)),
    };
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    return metadata;
  });
}

export async function readPiCredential(
  idRaw: string,
): Promise<PiCredentialReadResult> {
  let envelope: Envelope | undefined;
  let id: string;
  try {
    id = idText(idRaw);
    envelope = load().records[id];
  } catch {
    return { ok: false, code: "decrypt_failed" };
  }
  if (!envelope) return { ok: false, code: "missing" };
  if (!globalThis.crypto?.subtle)
    return { ok: false, code: "crypto_unavailable" };
  try {
    const secret = await key(false);
    const bytes = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(envelope.iv),
        additionalData: new TextEncoder().encode(`pi-credential:${id}`),
      },
      secret,
      decode(envelope.ciphertext),
    );
    const material = JSON.parse(
      new TextDecoder().decode(bytes),
    ) as PiCredentialMaterial;
    validateMaterial(material);
    if (material.kind !== envelope.kind)
      throw new Error("Pi credential kind mismatch");
    return { ok: true, material };
  } catch {
    return { ok: false, code: "decrypt_failed" };
  }
}

export function deletePiCredential(idRaw: string): Promise<void> {
  return enqueue(async () => {
    const id = idText(idRaw);
    const doc = load();
    delete doc.records[id];
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
  });
}
