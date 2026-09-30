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

type Envelope = PiCredentialMetadata & {
  iv: string;
  ciphertext: string;
  identityRevision?: string;
};
type PiCredentialNamespace = PiCredentialMetadata["namespace"];
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
    (material?.kind === "api-key" ||
      material?.kind === "mcp-secret" ||
      material?.kind === "web-secret") &&
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

function materialNamespace(
  material: PiCredentialMaterial,
): PiCredentialNamespace {
  return material.kind === "web-secret"
    ? "web-source"
    : material.kind === "mcp-secret"
      ? "mcp-source"
      : "model-provider";
}

export function listPiCredentials(
  namespace: PiCredentialNamespace = "model-provider",
): PiCredentialMetadata[] {
  try {
    return Object.values(load().records)
      .filter((record) => (record.namespace || "model-provider") === namespace)
      .map(({ id, label, kind, masked, updatedAt }) => ({
        id,
        label,
        kind,
        namespace,
        masked,
        updatedAt,
      }));
  } catch {
    return [];
  }
}

export function getPiCredentialRevision(
  idRaw: string,
  namespace: PiCredentialNamespace,
): string | null {
  try {
    const envelope = load().records[idText(idRaw)];
    return envelope &&
      (envelope.namespace || "model-provider") === namespace &&
      typeof envelope.iv === "string"
      ? envelope.iv
      : null;
  } catch {
    return null;
  }
}

export function putPiCredential(args: {
  id: string;
  label: string;
  material: PiCredentialMaterial;
  namespace?: PiCredentialNamespace;
  expectedRevision?: string | null;
  preserveIdentity?: boolean;
  signal?: AbortSignal;
}): Promise<PiCredentialMetadata> {
  return enqueue(async () => {
    const id = idText(args.id);
    const label = String(args.label || "").trim();
    if (!label || label.length > 128)
      throw new Error("Pi credential label is required");
    validateMaterial(args.material);
    const namespace = args.namespace || "model-provider";
    if (materialNamespace(args.material) !== namespace)
      throw new Error("Pi credential namespace mismatch");
    const doc = load();
    const existing = doc.records[id];
    if (existing && (existing.namespace || "model-provider") !== namespace)
      throw new Error("Pi credential namespace mismatch");
    if (
      args.expectedRevision !== undefined &&
      (existing?.iv || null) !== args.expectedRevision
    )
      throw new Error("Pi credential changed");
    if (args.preserveIdentity) {
      const previous = await readPiCredential(id, namespace);
      if (
        !args.expectedRevision ||
        !previous.ok ||
        previous.material.kind !== "openai-codex" ||
        args.material.kind !== "openai-codex" ||
        previous.material.accountId !== args.material.accountId
      )
        throw new Error("Pi credential identity changed");
    }
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
      namespace,
      masked:
        args.material.kind !== "openai-codex"
          ? "••••"
          : `••••${args.material.accountId.slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };
    doc.records[id] = {
      ...metadata,
      iv: encode(iv),
      identityRevision:
        args.preserveIdentity && existing
          ? existing.identityRevision || existing.iv
          : encode(iv),
      ciphertext: encode(new Uint8Array(ciphertext)),
    };
    if (args.signal?.aborted) throw new Error("Pi credential write canceled");
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    return metadata;
  });
}

/** Account replacement identity; authenticated token refresh preserves it. */
export function getPiCredentialIdentityRevision(
  idRaw: string,
  namespace: PiCredentialNamespace,
): string | null {
  try {
    const record = load().records[idText(idRaw)];
    return record && (record.namespace || "model-provider") === namespace
      ? record.identityRevision || record.iv
      : null;
  } catch {
    return null;
  }
}

export async function readPiCredential(
  idRaw: string,
  namespace: PiCredentialNamespace = "model-provider",
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
  if ((envelope.namespace || "model-provider") !== namespace)
    return { ok: false, code: "missing" };
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
    if (
      material.kind !== envelope.kind ||
      materialNamespace(material) !== namespace
    )
      throw new Error("Pi credential kind mismatch");
    return { ok: true, material };
  } catch {
    return { ok: false, code: "decrypt_failed" };
  }
}

export function deletePiCredential(
  idRaw: string,
  namespace: PiCredentialNamespace = "model-provider",
): Promise<void> {
  return enqueue(async () => {
    const id = idText(idRaw);
    const doc = load();
    if (
      doc.records[id] &&
      (doc.records[id].namespace || "model-provider") !== namespace
    )
      throw new Error("Pi credential namespace mismatch");
    delete doc.records[id];
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
  });
}
