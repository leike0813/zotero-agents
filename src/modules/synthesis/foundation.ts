import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import { deflate, inflate } from "pako";
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
  escapeHtml,
} from "../notePayloadCodec";
import { joinPath } from "../../utils/path";

export const SYNTHESIS_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_SHARD_MARKER = "ZOTERO_SKILLS_SYNTHESIS_SHARD";
export const SYNTHESIS_ANCHOR_TITLE = "Zotero-Skills Synthesis Layer Anchor";

export type CanonicalEnvelope<T = unknown> = {
  schema_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  data: T;
  [key: string]: unknown;
};

export type CanonicalEnvelopeParseResult<T = unknown> = {
  envelope: CanonicalEnvelope<T>;
  data: T;
  warnings: string[];
};

export class SynthesisSchemaRegistry {
  private ajv = new Ajv({ allErrors: true, strict: false, logger: false });

  private validators = new Map<string, ValidateFunction>();

  registerDataSchema(schemaId: string, schema: AnySchema) {
    const normalized = String(schemaId || "").trim();
    if (!normalized) {
      throw new Error("schemaId must be non-empty");
    }
    this.validators.set(normalized, this.ajv.compile(schema));
  }

  parseEnvelope<T = unknown>(input: unknown, schemaId: string) {
    const validator = this.validators.get(schemaId);
    if (!validator) {
      throw new Error(`schema not registered: ${schemaId}`);
    }
    return parseCanonicalEnvelope<T>(input, {
      schemaId,
      validateData(data) {
        return Boolean(validator(data));
      },
    });
  }

  validateData(schemaId: string, data: unknown) {
    const validator = this.validators.get(schemaId);
    if (!validator) {
      throw new Error(`schema not registered: ${schemaId}`);
    }
    const ok = Boolean(validator(data));
    return {
      ok,
      errors: ok ? [] : (validator.errors || []).map((entry) => entry.message || ""),
    };
  }
}

export type ShardKind =
  | "manifest"
  | "topics"
  | "resolvers"
  | "paper_sets"
  | "artifact_index"
  | "artifact_state"
  | "topic_current"
  | "graph"
  | "layout"
  | string;

export type MirrorAssetContentType = "json" | "markdown" | "text";

export type NoteShardEnvelope = {
  schema_id: "synthesis.note_shard";
  schema_version: string;
  library_id: number;
  anchor_key: string;
  mirror_id: string;
  kind: ShardKind;
  asset_id: string;
  asset_path: string;
  content_type: MirrorAssetContentType;
  seq: number;
  total: number;
  encoding: "base64";
  compression: "gzip" | "none";
  payload_hash: string;
  encoded_hash: string;
  payload: string;
};

export type EncodedNoteShard = {
  title: string;
  html: string;
  envelope: NoteShardEnvelope;
};

export type DecodedNoteShard = {
  envelope: NoteShardEnvelope;
  payload: string;
};

export type MirrorManifestShard = {
  kind: ShardKind;
  asset_id: string;
  asset_path: string;
  content_type: MirrorAssetContentType;
  seq: number;
  total: number;
  note_key: string;
  title: string;
  payload_hash: string;
  encoded_hash: string;
};

export type MirrorManifest = {
  schema_id: "synthesis.zotero_anchor_manifest";
  schema_version: string;
  library_id: number;
  anchor_key: string;
  mirror_id: string;
  updated_at: string;
  shards: MirrorManifestShard[];
  manifest_hash: string;
};

export type FoundationPrefs = {
  autoWatchEnabled: boolean;
  autoRebuildRegistry: boolean;
  autoRebuildGraph: "off" | "idle" | "auto";
  autoScanStalenessEnabled: boolean;
  rebuildDebounceMs: number;
  rebuildMaxAutoGraphItems: number;
  graphLayoutDefaultPreset: "compact" | "balanced" | "expanded";
  graphLayoutComputeAllPresets: boolean;
  runHashCheckOnStartup: boolean;
};

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const ENVELOPE_KEYS = new Set([
  "schema_id",
  "schema_version",
  "created_at",
  "updated_at",
  "data",
]);

const SHARD_KIND_ORDER = [
  "manifest",
  "topics",
  "resolvers",
  "paper_sets",
  "artifact_index",
  "artifact_state",
  "topic_current",
  "graph",
  "layout",
];

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function normalizeNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeMarkdown(input: unknown) {
  return String(input ?? "").replace(/\r\n?/g, "\n");
}

function utf8Bytes(input: string) {
  return new TextEncoder().encode(input);
}

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Hex(input: string) {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  const withOne = bytes.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(chunk + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rightRotate(words[index - 15], 7) ^
        rightRotate(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rightRotate(words[index - 2], 17) ^
        rightRotate(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] =
        (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

export function sha256(input: unknown) {
  return `sha256:${sha256Hex(String(input ?? ""))}`;
}

function normalizeJsonForCanonicalization(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonForCanonicalization(entry));
  }
  if (isObject(value)) {
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      if (value[key] !== undefined) {
        output[key] = normalizeJsonForCanonicalization(value[key]);
      }
    }
    return output;
  }
  return String(value);
}

export function canonicalizeJson(value: unknown) {
  return JSON.stringify(normalizeJsonForCanonicalization(value));
}

export function hashCanonicalJson(value: unknown) {
  return sha256(canonicalizeJson(value));
}

export function hashMarkdown(value: unknown) {
  return sha256(normalizeMarkdown(value));
}

export function createCanonicalEnvelope<T>(args: {
  schemaId: string;
  data: T;
  now?: string;
  schemaVersion?: string;
}): CanonicalEnvelope<T> {
  const timestamp = args.now || nowIso();
  return {
    schema_id: args.schemaId,
    schema_version: args.schemaVersion || SYNTHESIS_SCHEMA_VERSION,
    created_at: timestamp,
    updated_at: timestamp,
    data: args.data,
  };
}

export function parseCanonicalEnvelope<T = unknown>(
  input: unknown,
  args: {
    schemaId?: string;
    validateData?: (data: unknown) => boolean;
  } = {},
): CanonicalEnvelopeParseResult<T> {
  if (!isObject(input)) {
    throw new Error("canonical envelope must be an object");
  }
  const schemaId = String(input.schema_id || "");
  if (!schemaId) {
    throw new Error("canonical envelope missing schema_id");
  }
  if (args.schemaId && schemaId !== args.schemaId) {
    throw new Error(`unexpected schema_id: ${schemaId}`);
  }
  if (!String(input.schema_version || "")) {
    throw new Error("canonical envelope missing schema_version");
  }
  if (!String(input.created_at || "")) {
    throw new Error("canonical envelope missing created_at");
  }
  if (!String(input.updated_at || "")) {
    throw new Error("canonical envelope missing updated_at");
  }
  if (!Object.prototype.hasOwnProperty.call(input, "data")) {
    throw new Error("canonical envelope missing data");
  }
  if (args.validateData && !args.validateData(input.data)) {
    throw new Error(`schema validation failed for canonical envelope: ${schemaId}`);
  }
  const unknownFields = Object.keys(input)
    .filter((key) => !ENVELOPE_KEYS.has(key))
    .sort((left, right) => left.localeCompare(right));
  return {
    envelope: input as CanonicalEnvelope<T>,
    data: input.data as T,
    warnings: unknownFields.length
      ? [`unknown_top_level_fields: ${unknownFields.join(", ")}`]
      : [],
  };
}

export function formatShardTitle(args: {
  libraryId: number;
  kind: ShardKind;
  seq: number;
  total: number;
}) {
  const libraryId = normalizePositiveInteger(args.libraryId);
  const seq = normalizePositiveInteger(args.seq);
  const total = normalizePositiveInteger(args.total);
  if (!libraryId) {
    throw new Error("libraryId must be a positive integer");
  }
  if (!String(args.kind || "").trim()) {
    throw new Error("shard kind must be non-empty");
  }
  if (!seq || !total || seq > total) {
    throw new Error("invalid shard sequence");
  }
  return `ZS Synthesis Mirror [${libraryId}] ${args.kind} ${String(seq).padStart(3, "0")}/${String(total).padStart(3, "0")}`;
}

export function parseShardTitle(title: unknown) {
  const match = String(title || "").match(
    /^ZS Synthesis Mirror \[(\d+)] ([A-Za-z0-9_-]+) (\d{3})\/(\d{3})$/,
  );
  if (!match) {
    return null;
  }
  return {
    libraryId: Number(match[1]),
    kind: match[2],
    seq: Number(match[3]),
    total: Number(match[4]),
  };
}

function uint8ToBinary(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

function binaryToUint8(binary: string) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeBase64Bytes(bytes: Uint8Array) {
  const buffer = (globalThis as unknown as { Buffer?: any }).Buffer;
  if (buffer) {
    return buffer.from(bytes).toString("base64");
  }
  return btoa(uint8ToBinary(bytes));
}

function decodeBase64Bytes(value: string) {
  const buffer = (globalThis as unknown as { Buffer?: any }).Buffer;
  if (buffer) {
    return new Uint8Array(buffer.from(value, "base64"));
  }
  return binaryToUint8(atob(value));
}

function encodePayload(payload: string, compression: "gzip" | "none") {
  if (compression === "none") {
    return encodeBase64Utf8(payload);
  }
  return encodeBase64Bytes(deflate(utf8Bytes(payload)));
}

function decodePayload(encoded: string, compression: "gzip" | "none") {
  if (compression === "none") {
    return decodeBase64Utf8(encoded);
  }
  return new TextDecoder().decode(inflate(decodeBase64Bytes(encoded)));
}

function createMirrorId(args: { libraryId: number; anchorKey: string }) {
  return hashCanonicalJson({
    kind: "synthesis-mirror",
    library_id: args.libraryId,
    anchor_key: args.anchorKey,
  });
}

export function renderNoteShardHtml(args: {
  libraryId: number;
  kind: ShardKind;
  assetId: string;
  assetPath: string;
  contentType: MirrorAssetContentType;
  seq: number;
  total: number;
  updatedAt: string;
  envelope: NoteShardEnvelope;
}) {
  return [
    "<h2>Zotero-Skills Synthesis Mirror</h2>",
    `<p>Library: ${escapeHtml(args.libraryId)}</p>`,
    `<p>Kind: ${escapeHtml(args.kind)}</p>`,
    `<p>Asset: ${escapeHtml(args.assetId)}</p>`,
    `<p>Path: ${escapeHtml(args.assetPath)}</p>`,
    `<p>Content: ${escapeHtml(args.contentType)}</p>`,
    `<p>Shard: ${String(args.seq).padStart(3, "0")}/${String(args.total).padStart(3, "0")}</p>`,
    `<p>Updated: ${escapeHtml(args.updatedAt)}</p>`,
    "<p>This note is managed by Zotero-Skills. Do not edit manually.</p>",
    `<!-- ${SYNTHESIS_SHARD_MARKER}`,
    canonicalizeJson(args.envelope),
    "-->",
  ].join("\n");
}

export function extractNoteShardEnvelope(html: unknown): NoteShardEnvelope {
  const pattern = new RegExp(
    `<!--\\s*${SYNTHESIS_SHARD_MARKER}\\s*([\\s\\S]*?)\\s*-->`,
    "m",
  );
  const match = String(html || "").match(pattern);
  if (!match) {
    throw new Error("synthesis note shard payload not found");
  }
  const parsed = JSON.parse(match[1]);
  if (!isObject(parsed)) {
    throw new Error("synthesis note shard payload must be an object");
  }
  return parsed as NoteShardEnvelope;
}

export function encodeNoteShard(args: {
  libraryId: number;
  anchorKey: string;
  kind: ShardKind;
  assetId?: string;
  asset_id?: string;
  assetPath?: string;
  asset_path?: string;
  contentType?: MirrorAssetContentType;
  content_type?: MirrorAssetContentType;
  seq: number;
  total: number;
  payload: string;
  compression?: "gzip" | "none";
  updatedAt?: string;
}): EncodedNoteShard {
  const libraryId = normalizePositiveInteger(args.libraryId);
  const seq = normalizePositiveInteger(args.seq);
  const total = normalizePositiveInteger(args.total);
  const compression = args.compression || "gzip";
  const payload = normalizeMarkdown(args.payload);
  const assetId = String(args.assetId ?? args.asset_id ?? args.kind ?? "").trim();
  const assetPath = String(args.assetPath ?? args.asset_path ?? "").trim();
  const contentType = (args.contentType ?? args.content_type ?? "json") as MirrorAssetContentType;
  const encodedPayload = encodePayload(payload, compression);
  const envelope: NoteShardEnvelope = {
    schema_id: "synthesis.note_shard",
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    library_id: libraryId,
    anchor_key: String(args.anchorKey || "").trim(),
    mirror_id: createMirrorId({
      libraryId,
      anchorKey: String(args.anchorKey || "").trim(),
    }),
    kind: args.kind,
    asset_id: assetId,
    asset_path: assetPath,
    content_type: contentType,
    seq,
    total,
    encoding: "base64",
    compression,
    payload_hash: hashMarkdown(payload),
    encoded_hash: hashMarkdown(encodedPayload),
    payload: encodedPayload,
  };
  const title = formatShardTitle({ libraryId, kind: args.kind, seq, total });
  const html = renderNoteShardHtml({
    libraryId,
    kind: args.kind,
    assetId,
    assetPath,
    contentType,
    seq,
    total,
    updatedAt: args.updatedAt || nowIso(),
    envelope,
  });
  return { title, html, envelope };
}

export function decodeNoteShard(html: unknown): DecodedNoteShard {
  const envelope = extractNoteShardEnvelope(html);
  if (envelope.schema_id !== "synthesis.note_shard") {
    throw new Error(`unexpected shard schema_id: ${envelope.schema_id}`);
  }
  if (envelope.encoding !== "base64") {
    throw new Error(`unsupported shard encoding: ${envelope.encoding}`);
  }
  if (hashMarkdown(envelope.payload) !== envelope.encoded_hash) {
    throw new Error("synthesis note shard encoded_hash mismatch");
  }
  const payload = decodePayload(envelope.payload, envelope.compression);
  if (hashMarkdown(payload) !== envelope.payload_hash) {
    throw new Error("synthesis note shard payload_hash mismatch");
  }
  return { envelope, payload };
}

function shardKindRank(kind: string) {
  const index = SHARD_KIND_ORDER.indexOf(kind);
  return index >= 0 ? index : SHARD_KIND_ORDER.length;
}

function normalizeManifestShard(input: {
  kind: ShardKind;
  assetId?: string;
  asset_id?: string;
  assetPath?: string;
  asset_path?: string;
  contentType?: MirrorAssetContentType;
  content_type?: MirrorAssetContentType;
  seq: number;
  total: number;
  noteKey?: string;
  note_key?: string;
  title: string;
  payloadHash?: string;
  payload_hash?: string;
  encodedHash?: string;
  encoded_hash?: string;
}): MirrorManifestShard {
  return {
    kind: input.kind,
    asset_id: String(input.assetId ?? input.asset_id ?? "").trim(),
    asset_path: String(input.assetPath ?? input.asset_path ?? "").trim(),
    content_type: (input.contentType ?? input.content_type ?? "json") as MirrorAssetContentType,
    seq: normalizePositiveInteger(input.seq),
    total: normalizePositiveInteger(input.total),
    note_key: String(input.noteKey ?? input.note_key ?? "").trim(),
    title: String(input.title || ""),
    payload_hash: String(input.payloadHash ?? input.payload_hash ?? "").trim(),
    encoded_hash: String(input.encodedHash ?? input.encoded_hash ?? "").trim(),
  };
}

export function sortMirrorManifestShards(shards: MirrorManifestShard[]) {
  return [...shards].sort((left, right) => {
    const kind = shardKindRank(left.kind) - shardKindRank(right.kind);
    if (kind !== 0) {
      return kind;
    }
    const label = String(left.kind).localeCompare(String(right.kind));
    if (label !== 0) {
      return label;
    }
    return left.seq - right.seq;
  });
}

export function buildMirrorManifest(args: {
  libraryId?: number;
  library_id?: number;
  anchorKey?: string;
  anchor_key?: string;
  mirrorId?: string;
  mirror_id?: string;
  updatedAt?: string;
  updated_at?: string;
  shards: Array<Parameters<typeof normalizeManifestShard>[0]>;
  manifest_hash?: string;
}): MirrorManifest {
  const base: Omit<MirrorManifest, "manifest_hash"> = {
    schema_id: "synthesis.zotero_anchor_manifest",
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    library_id: normalizePositiveInteger(args.libraryId ?? args.library_id),
    anchor_key: String(args.anchorKey ?? args.anchor_key ?? "").trim(),
    mirror_id: String(args.mirrorId ?? args.mirror_id ?? "").trim(),
    updated_at: String(args.updatedAt ?? args.updated_at ?? nowIso()),
    shards: sortMirrorManifestShards(args.shards.map(normalizeManifestShard)),
  };
  return {
    ...base,
    manifest_hash: hashCanonicalJson(base),
  };
}

export class LibraryWriteLock {
  private tails = new Map<number, Promise<unknown>>();

  async runExclusive<T>(libraryIdRaw: number, operation: () => Promise<T> | T) {
    const libraryId = normalizePositiveInteger(libraryIdRaw);
    if (!libraryId) {
      throw new Error("libraryId must be a positive integer");
    }
    const previous = this.tails.get(libraryId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      libraryId,
      previous.then(() => current, () => current),
    );
    await previous.catch(() => {
      // A failed previous operation must not permanently poison the lock.
    });
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(libraryId) === current) {
        this.tails.delete(libraryId);
      }
    }
  }
}

export function checkBaseHashes(args: {
  current: Record<string, string | undefined>;
  base: Record<string, string | undefined>;
}):
  | { ok: true; mismatches: [] }
  | {
      ok: false;
      mismatches: Array<{ name: string; base: string; current: string }>;
    } {
  const names = Array.from(
    new Set([...Object.keys(args.current || {}), ...Object.keys(args.base || {})]),
  ).sort((left, right) => left.localeCompare(right));
  const mismatches = names
    .filter((name) => String(args.current[name] || "") !== String(args.base[name] || ""))
    .map((name) => ({
      name,
      base: String(args.base[name] || ""),
      current: String(args.current[name] || ""),
    }));
  return mismatches.length ? { ok: false, mismatches } : { ok: true, mismatches: [] };
}

export function defaultSynthesisFoundationPrefs(): FoundationPrefs {
  return {
    autoWatchEnabled: true,
    autoRebuildRegistry: true,
    autoRebuildGraph: "idle",
    autoScanStalenessEnabled: true,
    rebuildDebounceMs: 1500,
    rebuildMaxAutoGraphItems: 500,
    graphLayoutDefaultPreset: "balanced",
    graphLayoutComputeAllPresets: false,
    runHashCheckOnStartup: true,
  };
}

export function buildSynthesisStoragePaths(root: string, topicId?: string) {
  const synthesisRoot = joinPath(root, "synthesis");
  const stateRoot = joinPath(synthesisRoot, "state");
  const topicRoot = topicId
    ? joinPath(synthesisRoot, "topics", topicId)
    : joinPath(synthesisRoot, "topics");
  return {
    synthesisRoot,
    topicsRoot: joinPath(synthesisRoot, "topics"),
    topicRoot,
    legacyCurrentMarkdown: topicId ? joinPath(topicRoot, "current.md") : "",
    legacyCurrentMetadata: topicId ? joinPath(topicRoot, "current.json") : "",
    currentRoot: topicId ? joinPath(topicRoot, "current") : "",
    currentManifest: topicId ? joinPath(topicRoot, "current", "manifest.json") : "",
    currentArtifact: topicId ? joinPath(topicRoot, "current", "artifact.json") : "",
    currentMetadata: topicId ? joinPath(topicRoot, "current", "metadata.json") : "",
    currentExportMarkdown: topicId ? joinPath(topicRoot, "current", "export.md") : "",
    currentSectionsRoot: topicId ? joinPath(topicRoot, "current", "sections") : "",
    stateRoot,
    index: joinPath(stateRoot, "index.json"),
    artifactState: joinPath(stateRoot, "artifact-state.json"),
    deletedRoot: joinPath(synthesisRoot, "deleted"),
    deletedArtifacts: joinPath(stateRoot, "deleted-topic-artifacts.json"),
    topicDefinitions: joinPath(stateRoot, "topic-definitions.json"),
    resolvers: joinPath(stateRoot, "resolvers.json"),
    resolvedPaperSets: joinPath(stateRoot, "resolved-paper-sets.json"),
    unifiedCitationGraph: joinPath(stateRoot, "unified-citation-graph.json"),
    unifiedCitationLayouts: joinPath(stateRoot, "unified-citation-layouts.json"),
    log: joinPath(stateRoot, "log.jsonl"),
  };
}

export function isValidHash(value: unknown) {
  return /^sha256:[a-f0-9]{64}$/.test(String(value || ""));
}

export function normalizeShardSize(value: unknown, fallback: number) {
  const parsed = normalizeNonNegativeInteger(value);
  return parsed || fallback;
}
