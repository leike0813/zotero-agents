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
const identityListeners = new Set<
  (id: string, namespace: PiCredentialNamespace) => void
>();
export function subscribePiCredentialIdentityChange(
  listener: (id: string, namespace: PiCredentialNamespace) => void,
) {
  identityListeners.add(listener);
  return () => {
    identityListeners.delete(listener);
  };
}
function notifyIdentityChange(id: string, namespace: PiCredentialNamespace) {
  for (const listener of identityListeners) {
    try {
      listener(id, namespace);
    } catch {
      /* Observers cannot change credential persistence. */
    }
  }
}

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
    material?.kind === "chatgpt" &&
    typeof material.access === "string" &&
    material.access &&
    typeof material.refresh === "string" &&
    material.refresh &&
    Number.isFinite(material.expiresAt) &&
    typeof material.idToken === "string" &&
    material.idToken &&
    material.issuer === "https://auth.openai.com" &&
    typeof material.subject === "string" &&
    material.subject &&
    typeof material.clientId === "string" &&
    material.clientId &&
    material.clientId !== "dynamic_agent_client" &&
    Array.isArray(material.scope) &&
    material.scope.every(
      (scope) => typeof scope === "string" && scope.length > 0,
    )
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
    const doc = load();
    const written = await writeRecord(doc, args);
    if (args.signal?.aborted) throw new Error("Pi credential write canceled");
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    if (!args.preserveIdentity)
      notifyIdentityChange(args.id, args.namespace || "model-provider");
    return written;
  });
}

async function writeRecord(
  doc: CredentialDocument,
  args: {
    id: string;
    label: string;
    material: PiCredentialMaterial;
    namespace?: PiCredentialNamespace;
    expectedRevision?: string | null;
    preserveIdentity?: boolean;
  },
): Promise<PiCredentialMetadata> {
  const id = idText(args.id);
  const label = String(args.label || "").trim();
  if (!label || label.length > 128)
    throw new Error("Pi credential label is required");
  validateMaterial(args.material);
  const namespace = args.namespace || "model-provider";
  if (materialNamespace(args.material) !== namespace)
    throw new Error("Pi credential namespace mismatch");
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
      previous.material.kind !== "chatgpt" ||
      args.material.kind !== "chatgpt" ||
      previous.material.issuer !== args.material.issuer ||
      previous.material.subject !== args.material.subject ||
      previous.material.clientId !== args.material.clientId
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
    masked: "••••",
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
  return metadata;
}

/**
 * The one write boundary for a credential that is saved together with an
 * owner document. Both writes happen inside this owner's existing
 * serialization, so a concurrent save cannot interleave and lose an update.
 *
 * The identity notification is published once, after the document write
 * succeeded. Observers therefore never invalidate a catalog or a connection
 * for a change that was rolled back. A document write that fails restores the
 * previous credential state — or removes a credential this commit created — so
 * a failed save never leaves an orphan key behind.
 */
export function commitPiCredentialChange(args: {
  credential?: {
    id: string;
    label: string;
    material: PiCredentialMaterial;
    namespace?: PiCredentialNamespace;
    expectedRevision?: string | null;
    preserveIdentity?: boolean;
  };
  /** Removes the named credential inside the same committed write. */
  release?: {
    id: string;
    namespace?: PiCredentialNamespace;
    expected?: { kind?: string; identityRevision?: string };
  };
  signal?: AbortSignal;
  /** The owner's document write. It runs after the credential write. */
  apply: () => void;
}): Promise<PiCredentialMetadata | undefined> {
  return commitPiCredentialChanges({
    ...(args.credential
      ? { credentials: [args.credential] }
      : args.release
        ? { releases: [args.release] }
        : {}),
    apply: args.apply,
    signal: args.signal,
  }).then((written) => written[0]);
}

/**
 * The batch form of the coordinated write boundary. One queued commit carries
 * every credential record a coordinated owner change needs plus that owner's
 * document write, so concurrent saves cannot interleave and a failed document
 * write leaves no partially applied key set behind.
 */
export function commitPiCredentialChanges(args: {
  credentials?: Array<{
    id: string;
    label: string;
    material: PiCredentialMaterial;
    namespace?: PiCredentialNamespace;
    expectedRevision?: string | null;
    preserveIdentity?: boolean;
  }>;
  /** Removes the named credentials inside the same committed write. */
  releases?: Array<{
    id: string;
    namespace?: PiCredentialNamespace;
    expected?: { kind?: string; identityRevision?: string };
  }>;
  signal?: AbortSignal;
  /** The owner's document write. It runs after the credential write. */
  apply: () => void;
}): Promise<PiCredentialMetadata[]> {
  return enqueue(async () => {
    const doc = load();
    const prior = JSON.parse(JSON.stringify(doc)) as CredentialDocument;
    const written: PiCredentialMetadata[] = [];
    const touched = new Set<string>();
    const changed = new Map<string, PiCredentialNamespace>();
    for (const release of args.releases || []) {
      const id = idText(release.id);
      touched.add(id);
      const current = doc.records[id];
      const expected = release.expected;
      const namespace = release.namespace || "model-provider";
      if (!current) continue;
      if (
        expected &&
        ((expected.kind !== undefined && current.kind !== expected.kind) ||
          (expected.identityRevision !== undefined &&
            (current.identityRevision || current.iv) !==
              expected.identityRevision))
      )
        continue;
      if ((current.namespace || "model-provider") !== namespace)
        throw new Error("Pi credential namespace mismatch");
      delete doc.records[id];
      changed.set(id, namespace);
    }
    for (const credential of args.credentials || []) {
      const id = idText(credential.id);
      if (touched.has(id)) throw new Error("Pi credential committed twice");
      touched.add(id);
      written.push(await writeRecord(doc, credential));
      changed.set(id, credential.namespace || "model-provider");
    }
    if (args.credentials?.length || args.releases?.length)
      setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    try {
      if (args.signal?.aborted) throw new Error("Pi credential write canceled");
      args.apply();
    } catch (error) {
      // Restore the credential document this commit changed; the owner's
      // document write already failed and left its own prior state in place.
      setPref("piCredentialEncryptedJson", JSON.stringify(prior));
      throw error;
    }
    for (const [id, namespace] of changed) notifyIdentityChange(id, namespace);
    return written;
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
  expected?: { kind?: string; identityRevision?: string },
): Promise<void> {
  return enqueue(async () => {
    const id = idText(idRaw);
    const doc = load();
    const current = doc.records[id];
    if (
      expected &&
      (!current ||
        (expected.kind !== undefined && current.kind !== expected.kind) ||
        (expected.identityRevision !== undefined &&
          (current.identityRevision || current.iv) !==
            expected.identityRevision))
    )
      return;
    if (
      doc.records[id] &&
      (doc.records[id].namespace || "model-provider") !== namespace
    )
      throw new Error("Pi credential namespace mismatch");
    delete doc.records[id];
    setPref("piCredentialEncryptedJson", JSON.stringify(doc));
    notifyIdentityChange(id, namespace);
  });
}
