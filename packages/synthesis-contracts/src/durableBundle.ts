import { SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS } from "./conceptKbApplication.js";
import { SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS } from "./referenceMatchingReviewApplication.js";
import { SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS } from "./referenceRefreshApplication.js";
import { SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS } from "./tagVocabularyApplication.js";
import { SYNTHESIS_TOPIC_APPLICATION_LIMITS } from "./topicApplication.js";
import { SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS } from "./topicGraphApplication.js";

export const SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_DURABLE_MANIFEST_SCHEMA_VERSION = "2.0.0";
export const SYNTHESIS_DURABLE_ASSET_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID =
  "synthesis.durable_asset_bundle";
export const SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION = "2.0.0";

export const SYNTHESIS_DURABLE_ENTITY_KINDS = [
  "concept",
  "concept_sense",
  "concept_alias",
  "concept_relation",
  "concept_review_item",
  "topic_current_asset",
  "topic_concept_links",
  "topic_graph_node",
  "topic_graph_edge",
  "topic_graph_review_item",
  "canonical_reference",
  "canonical_reference_redirect",
  "reference_binding",
  "reference_match_proposal",
  "review_item",
  "topic_interest_metadata",
  "topic_discovery_hint",
  "tag_vocabulary",
  "tag_aliases",
  "tag_abbrev",
  "tag_protocol",
  "related_items_sync_effect",
  "tombstone",
] as const;

export type SynthesisDurableEntityKind =
  (typeof SYNTHESIS_DURABLE_ENTITY_KINDS)[number];

const REFERENCE_LIMIT =
  SYNTHESIS_REFERENCE_MATCHING_REVIEW_APPLICATION_LIMITS.papers +
  SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.scopedSources;
const TOPIC_ASSET_LIMIT =
  SYNTHESIS_TOPIC_APPLICATION_LIMITS.assets *
  SYNTHESIS_TOPIC_APPLICATION_LIMITS.listMax;

export const SYNTHESIS_DURABLE_ENTITY_LIMITS: Readonly<
  Record<SynthesisDurableEntityKind, number>
> = Object.freeze({
  concept: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.concepts,
  concept_sense: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.senses,
  concept_alias: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.aliases,
  concept_relation: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.relations,
  concept_review_item: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.reviewItems,
  topic_current_asset: TOPIC_ASSET_LIMIT,
  topic_concept_links: SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.topicLinks,
  topic_graph_node: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.nodes,
  topic_graph_edge: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.edges,
  topic_graph_review_item: SYNTHESIS_TOPIC_GRAPH_APPLICATION_LIMITS.reviewItems,
  canonical_reference: REFERENCE_LIMIT,
  canonical_reference_redirect: REFERENCE_LIMIT,
  reference_binding: REFERENCE_LIMIT,
  reference_match_proposal: REFERENCE_LIMIT,
  review_item: REFERENCE_LIMIT,
  topic_interest_metadata: SYNTHESIS_TOPIC_APPLICATION_LIMITS.listMax,
  topic_discovery_hint: REFERENCE_LIMIT,
  tag_vocabulary: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.entries,
  tag_aliases: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.aliases,
  tag_abbrev: SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.abbrev,
  tag_protocol: 1,
  related_items_sync_effect: REFERENCE_LIMIT,
  tombstone: REFERENCE_LIMIT,
});

const TOTAL_ENTITY_LIMIT = Object.values(
  SYNTHESIS_DURABLE_ENTITY_LIMITS,
).reduce((sum, value) => sum + value, 0);

export const SYNTHESIS_DURABLE_BUNDLE_LIMITS = Object.freeze({
  bundleText: 4 * 1024 * 1024,
  entries: TOTAL_ENTITY_LIMIT,
  manifestAssets: TOTAL_ENTITY_LIMIT,
  path: 1024,
  string: 4096,
} as const);

export type SynthesisDurableAssetEnvelope<T = unknown> = {
  schema_id: string;
  schema_version: string;
  entity_kind: SynthesisDurableEntityKind;
  entity_id: string;
  base_hash: string;
  content_hash: string;
  updated_at: string;
  data: T;
};

export type SynthesisDurableManifestEntity = {
  path: string;
  entity_kind: SynthesisDurableEntityKind;
  entity_id: string;
  schema_id: string;
  schema_version: string;
  hash: string;
  content_hash?: string;
  bytes?: number;
};

export type SynthesisDurableManifestAsset = {
  path: string;
  schema_id?: string;
  schema_version?: string;
  hash: string;
  bytes: number;
  bundle_kind?: string;
  entry_count?: number;
  entries?: SynthesisDurableManifestEntity[];
  entity_kind?: SynthesisDurableEntityKind;
  entity_id?: string;
};

export type SynthesisDurableSyncManifest = {
  manifest_schema_version: string;
  producer_version: string;
  min_reader_version: string;
  required_capabilities: string[];
  domain_versions: Record<string, string>;
  generated_at: string;
  asset_count: number;
  assets: SynthesisDurableManifestAsset[];
  manifest_hash: string;
};

export type SynthesisDurableAssetBundle = {
  schema_id: typeof SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION;
  bundle_kind: string;
  entries: SynthesisDurableAssetEnvelope[];
};

export type SynthesisDurableBundleDraft = {
  entityKind: SynthesisDurableEntityKind;
  entityId: string;
  schemaId: string;
  schemaVersion?: string;
  data: unknown;
  baseHash?: string;
  updatedAt?: string;
};

export type SynthesisDurableBundleSource = {
  readManifestText(): string | null | Promise<string | null>;
  readAssetText(path: string): string | null | Promise<string | null>;
};

export type SynthesisDurableBundleSink = {
  writeAssetText(path: string, text: string): void | Promise<void>;
  writeManifestText(text: string): void | Promise<void>;
};

export type SynthesisDurableBundleDiagnostic = {
  code: string;
  severity: "error";
  path?: string;
  location?: string;
};

export type SynthesisDurableBundleExport = {
  manifest: SynthesisDurableSyncManifest;
  manifestText: string;
  assets: Array<{
    path: string;
    text: string;
    bundle: SynthesisDurableAssetBundle;
  }>;
  entries: SynthesisDurableAssetEnvelope[];
};

export type SynthesisDurableBundleVerification = {
  value?: SynthesisDurableBundleExport;
  diagnostics: SynthesisDurableBundleDiagnostic[];
};

export class SynthesisDurableBundleContractError extends Error {
  readonly severity = "error" as const;

  constructor(
    readonly code: string,
    readonly location?: string,
    readonly path?: string,
  ) {
    super(code);
    this.name = "SynthesisDurableBundleContractError";
  }
}

type CodecOptions = {
  canonicalizeJson(value: unknown): string;
  hashCanonicalJson(value: unknown): string;
  validatePath?(path: string): string;
};

const ENTITY_KIND_SET = new Set<string>(SYNTHESIS_DURABLE_ENTITY_KINDS);
const MANIFEST_FIELDS = [
  "manifest_schema_version",
  "producer_version",
  "min_reader_version",
  "required_capabilities",
  "domain_versions",
  "generated_at",
  "asset_count",
  "assets",
  "manifest_hash",
] as const;
const V2_ASSET_FIELDS = [
  "path",
  "schema_id",
  "schema_version",
  "hash",
  "bytes",
  "bundle_kind",
  "entry_count",
  "entries",
] as const;
const V1_ASSET_FIELDS = [
  "path",
  "schema_id",
  "schema_version",
  "hash",
  "bytes",
  "entity_kind",
  "entity_id",
] as const;
const ENTRY_FIELDS = [
  "path",
  "entity_kind",
  "entity_id",
  "schema_id",
  "schema_version",
  "hash",
  "content_hash",
  "bytes",
] as const;
const ENVELOPE_FIELDS = [
  "schema_id",
  "schema_version",
  "entity_kind",
  "entity_id",
  "base_hash",
  "content_hash",
  "updated_at",
  "data",
] as const;
const BUNDLE_FIELDS = ["schema_id", "schema_version", "bundle_kind", "entries"];
const HASH = /^sha256:[a-f0-9]{64}$/;

function fail(code: string, location?: string, path?: string): never {
  throw new SynthesisDurableBundleContractError(code, location, path);
}

function record(value: unknown, code: string, location?: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(code, location);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail(code, location);
  }
  return value as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  fields: readonly string[],
  code: string,
  location?: string,
) {
  const allowed = new Set(fields);
  if (Object.keys(value).some((field) => !allowed.has(field))) {
    fail(code, location);
  }
}

function string(
  value: unknown,
  code: string,
  location?: string,
  allowEmpty = false,
) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    (!allowEmpty && !value) ||
    value.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.string ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
  ) {
    return fail(code, location);
  }
  return value;
}

function integer(value: unknown, code: string, location?: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    return fail(code, location);
  }
  return Number(value);
}

function hash(value: unknown, code: string, location?: string) {
  if (typeof value !== "string" || !HASH.test(value)) {
    return fail(code, location);
  }
  return value;
}

function entityKind(value: unknown, location?: string) {
  const result = string(value, "durable_entity_kind_invalid", location);
  if (!ENTITY_KIND_SET.has(result)) {
    return fail("durable_entity_kind_invalid", location);
  }
  return result as SynthesisDurableEntityKind;
}

function defaultValidatePath(value: string) {
  if (
    !value ||
    value !== value.trim() ||
    value.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.path ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    fail("durable_path_invalid", "path", value);
  }
  return value;
}

function entityKey(kind: SynthesisDurableEntityKind, id: string) {
  return `${kind}:${id}`;
}

function bundleKindFor(kind: SynthesisDurableEntityKind) {
  if (kind.startsWith("concept_") || kind === "concept") return "concepts";
  if (
    kind === "canonical_reference" ||
    kind === "canonical_reference_redirect" ||
    kind === "reference_binding" ||
    kind === "reference_match_proposal"
  )
    return "references";
  if (kind === "topic_current_asset" || kind === "topic_concept_links")
    return "topics";
  if (kind.startsWith("topic_graph_")) return "topic-graph";
  if (kind === "review_item") return "reviews";
  if (kind === "topic_interest_metadata" || kind === "topic_discovery_hint")
    return "discovery";
  if (kind.startsWith("tag_")) return "tags";
  if (kind === "related_items_sync_effect") return "related-items";
  if (kind === "tombstone") return "tombstones";
  return fail("durable_entity_kind_invalid", "entity_kind");
}

function topicIdFor(envelope: SynthesisDurableAssetEnvelope) {
  const data =
    envelope.data &&
    typeof envelope.data === "object" &&
    !Array.isArray(envelope.data)
      ? (envelope.data as Record<string, unknown>)
      : {};
  return (
    String(data.topic_id ?? "").trim() ||
    String(data.topicId ?? "").trim() ||
    envelope.entity_id.split(":")[1] ||
    "topic"
  );
}

export function createSynthesisDurableBundleCodec(options: CodecOptions) {
  const validatePath = (value: unknown, location = "path") => {
    const path = string(value, "durable_path_invalid", location);
    try {
      const normalized = (options.validatePath ?? defaultValidatePath)(path);
      if (normalized !== path) fail("durable_path_invalid", location, path);
      return normalized;
    } catch (error) {
      if (error instanceof SynthesisDurableBundleContractError) throw error;
      return fail("durable_path_invalid", location, path);
    }
  };

  const canonicalText = (value: unknown) =>
    `${JSON.stringify(JSON.parse(options.canonicalizeJson(value)), null, 2)}\n`;

  const contentHash = (
    envelope: Pick<
      SynthesisDurableAssetEnvelope,
      "schema_id" | "schema_version" | "entity_kind" | "entity_id" | "data"
    >,
  ) =>
    options.hashCanonicalJson({
      schema_id: envelope.schema_id,
      schema_version: envelope.schema_version,
      entity_kind: envelope.entity_kind,
      entity_id: envelope.entity_id,
      data: envelope.data,
    });

  const createEnvelope = (
    draft: SynthesisDurableBundleDraft & { updatedAt?: string },
  ): SynthesisDurableAssetEnvelope => {
    const kind = entityKind(draft.entityKind, "draft.entityKind");
    const id = string(
      draft.entityId,
      "durable_entity_id_invalid",
      "draft.entityId",
    );
    const envelope = {
      schema_id: string(
        draft.schemaId,
        "durable_schema_id_invalid",
        "draft.schemaId",
      ),
      schema_version: string(
        draft.schemaVersion ?? SYNTHESIS_DURABLE_ASSET_SCHEMA_VERSION,
        "durable_schema_version_invalid",
        "draft.schemaVersion",
      ),
      entity_kind: kind,
      entity_id: id,
      base_hash: string(
        draft.baseHash ?? "",
        "durable_base_hash_invalid",
        "draft.baseHash",
        true,
      ),
      content_hash: "",
      updated_at: string(
        draft.updatedAt,
        "durable_updated_at_invalid",
        "draft.updatedAt",
      ),
      data: draft.data,
    } satisfies SynthesisDurableAssetEnvelope;
    envelope.content_hash = contentHash(envelope);
    return envelope;
  };

  const rebuildEnvelope = (value: unknown, location: string) => {
    const row = record(value, "durable_envelope_invalid", location);
    exact(row, ENVELOPE_FIELDS, "durable_envelope_fields_invalid", location);
    const envelope: SynthesisDurableAssetEnvelope = {
      schema_id: string(
        row.schema_id,
        "durable_schema_id_invalid",
        `${location}.schema_id`,
      ),
      schema_version: string(
        row.schema_version,
        "durable_schema_version_invalid",
        `${location}.schema_version`,
      ),
      entity_kind: entityKind(row.entity_kind, `${location}.entity_kind`),
      entity_id: string(
        row.entity_id,
        "durable_entity_id_invalid",
        `${location}.entity_id`,
      ),
      base_hash: string(
        row.base_hash,
        "durable_base_hash_invalid",
        `${location}.base_hash`,
        true,
      ),
      content_hash: hash(
        row.content_hash,
        "durable_content_hash_invalid",
        `${location}.content_hash`,
      ),
      updated_at: string(
        row.updated_at,
        "durable_updated_at_invalid",
        `${location}.updated_at`,
      ),
      data: row.data,
    };
    if (envelope.content_hash !== contentHash(envelope)) {
      fail("durable_content_hash_mismatch", `${location}.content_hash`);
    }
    return envelope;
  };

  const manifestBase = (manifest: SynthesisDurableSyncManifest) => ({
    manifest_schema_version: manifest.manifest_schema_version,
    producer_version: manifest.producer_version,
    min_reader_version: manifest.min_reader_version,
    required_capabilities: manifest.required_capabilities,
    domain_versions: manifest.domain_versions,
    generated_at: manifest.generated_at,
    asset_count: manifest.asset_count,
    assets: manifest.assets,
  });

  const hashManifest = (manifest: SynthesisDurableSyncManifest) =>
    options.hashCanonicalJson(manifestBase(manifest));

  const safePrefix = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "asset";

  const canonicalAssetFileName = (prefix: string, stableId: string) => {
    const digest = options
      .hashCanonicalJson(String(stableId ?? ""))
      .slice("sha256:".length, "sha256:".length + 24);
    return `${safePrefix(prefix)}_${digest}.json`;
  };

  const bundlePathFor = (envelope: SynthesisDurableAssetEnvelope) => {
    const kind = bundleKindFor(envelope.entity_kind);
    if (kind !== "topics") return `bundles/${kind}.json`;
    return `bundles/topics/${canonicalAssetFileName("topic", topicIdFor(envelope)).replace(/\.json$/i, "")}.json`;
  };

  const bundlePathMatches = (
    path: string,
    kind: string,
    entries: readonly SynthesisDurableAssetEnvelope[],
  ) => {
    const basePath = path.replace(/\.part-\d{4}\.json$/i, ".json");
    if (kind === "topics") {
      return (
        /^bundles\/topics\/topic_[a-f0-9]{24}(?:\.part-\d{4})?\.json$/.test(
          path,
        ) && entries.every((entry) => bundlePathFor(entry) === basePath)
      );
    }
    return basePath === `bundles/${kind}.json`;
  };

  const createBundle = (entries: SynthesisDurableAssetEnvelope[]) =>
    ({
      schema_id: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID,
      schema_version: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION,
      bundle_kind: bundleKindFor(entries[0].entity_kind),
      entries: [...entries].sort((left, right) =>
        entityKey(left.entity_kind, left.entity_id).localeCompare(
          entityKey(right.entity_kind, right.entity_id),
        ),
      ),
    }) satisfies SynthesisDurableAssetBundle;

  const chunkPath = (basePath: string, index: number) =>
    index === 0
      ? basePath
      : basePath.replace(
          /\.json$/i,
          `.part-${String(index + 1).padStart(4, "0")}.json`,
        );

  const createManifest = (args: {
    assets: SynthesisDurableManifestAsset[];
    generatedAt: string;
    producerVersion?: string;
  }) => {
    const manifest = {
      manifest_schema_version: SYNTHESIS_DURABLE_MANIFEST_SCHEMA_VERSION,
      producer_version: args.producerVersion ?? "zotero-skills",
      min_reader_version: "1.0.0",
      required_capabilities: [
        "durable-state.v1",
        "durable-bundles.v2",
        "webdav-sync.v1",
      ],
      domain_versions: {
        concept: "1.0.0",
        discovery: "1.0.0",
        reference: "1.0.0",
        review: "1.0.0",
        tag: "1.0.0",
        topic: "1.0.0",
        topic_graph: "1.0.0",
      },
      generated_at: args.generatedAt,
      asset_count: args.assets.length,
      assets: [...args.assets].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
      manifest_hash: "",
    } satisfies SynthesisDurableSyncManifest;
    manifest.manifest_hash = hashManifest(manifest);
    return manifest;
  };

  const buildExport = (args: {
    drafts: readonly SynthesisDurableBundleDraft[];
    generatedAt: string;
    producerVersion?: string;
  }): SynthesisDurableBundleExport => {
    string(args.generatedAt, "durable_generated_at_invalid", "generatedAt");
    if (args.drafts.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.entries) {
      fail("durable_entry_limit_exceeded", "drafts");
    }
    const seen = new Set<string>();
    const perKind = new Map<SynthesisDurableEntityKind, number>();
    const entries = args.drafts
      .map((draft) =>
        createEnvelope({
          ...draft,
          updatedAt: draft.updatedAt ?? args.generatedAt,
        }),
      )
      .sort((left, right) =>
        entityKey(left.entity_kind, left.entity_id).localeCompare(
          entityKey(right.entity_kind, right.entity_id),
        ),
      );
    for (const entry of entries) {
      const key = entityKey(entry.entity_kind, entry.entity_id);
      if (seen.has(key)) fail("durable_entity_duplicate", key);
      seen.add(key);
      const count = (perKind.get(entry.entity_kind) ?? 0) + 1;
      if (count > SYNTHESIS_DURABLE_ENTITY_LIMITS[entry.entity_kind]) {
        fail("durable_entity_limit_exceeded", entry.entity_kind);
      }
      perKind.set(entry.entity_kind, count);
    }
    const groups = new Map<string, SynthesisDurableAssetEnvelope[]>();
    for (const entry of entries) {
      const path = bundlePathFor(entry);
      groups.set(path, [...(groups.get(path) ?? []), entry]);
    }
    const packed: Array<{
      path: string;
      text: string;
      bundle: SynthesisDurableAssetBundle;
      manifestAsset: SynthesisDurableManifestAsset;
    }> = [];
    const append = (
      basePath: string,
      group: SynthesisDurableAssetEnvelope[],
      index: { value: number },
    ) => {
      const path = validatePath(chunkPath(basePath, index.value));
      const bundle = createBundle(group);
      const text = canonicalText(bundle);
      if (text.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.bundleText) {
        if (group.length === 1) fail("durable_bundle_too_large", path, path);
        const split = Math.max(1, Math.floor(group.length / 2));
        append(basePath, group.slice(0, split), index);
        append(basePath, group.slice(split), index);
        return;
      }
      index.value += 1;
      packed.push({
        path,
        text,
        bundle,
        manifestAsset: {
          path,
          schema_id: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID,
          schema_version: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION,
          hash: options.hashCanonicalJson(text),
          bytes: text.length,
          bundle_kind: bundle.bundle_kind,
          entry_count: bundle.entries.length,
          entries: bundle.entries.map((entry) => {
            const entryText = canonicalText(entry);
            return {
              path,
              entity_kind: entry.entity_kind,
              entity_id: entry.entity_id,
              schema_id: entry.schema_id,
              schema_version: entry.schema_version,
              hash: entry.content_hash,
              content_hash: entry.content_hash,
              bytes: entryText.length,
            };
          }),
        },
      });
    };
    for (const [path, group] of [...groups].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      append(path, group, { value: 0 });
    }
    packed.sort((left, right) => left.path.localeCompare(right.path));
    if (packed.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.manifestAssets) {
      fail("durable_manifest_asset_limit_exceeded", "assets");
    }
    const manifest = createManifest({
      assets: packed.map((item) => item.manifestAsset),
      generatedAt: args.generatedAt,
      producerVersion: args.producerVersion,
    });
    return {
      manifest,
      manifestText: canonicalText(manifest),
      assets: packed.map(({ path, text, bundle }) => ({ path, text, bundle })),
      entries,
    };
  };

  const rebuildManifest = (value: unknown) => {
    const row = record(value, "durable_manifest_invalid", "manifest");
    exact(row, MANIFEST_FIELDS, "durable_manifest_fields_invalid", "manifest");
    const version = string(
      row.manifest_schema_version,
      "durable_manifest_schema_invalid",
      "manifest.manifest_schema_version",
    );
    if (
      version !== SYNTHESIS_DURABLE_MANIFEST_SCHEMA_VERSION &&
      version !== SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION
    ) {
      fail(
        "durable_manifest_schema_invalid",
        "manifest.manifest_schema_version",
      );
    }
    if (
      !Array.isArray(row.required_capabilities) ||
      !Array.isArray(row.assets)
    ) {
      fail("durable_manifest_invalid", "manifest");
    }
    if (row.assets.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.manifestAssets) {
      fail("durable_manifest_asset_limit_exceeded", "manifest.assets");
    }
    const domains = record(
      row.domain_versions,
      "durable_domain_versions_invalid",
      "manifest.domain_versions",
    );
    const manifest: SynthesisDurableSyncManifest = {
      manifest_schema_version: version,
      producer_version: string(
        row.producer_version,
        "durable_manifest_invalid",
        "manifest.producer_version",
      ),
      min_reader_version: string(
        row.min_reader_version,
        "durable_manifest_invalid",
        "manifest.min_reader_version",
      ),
      required_capabilities: row.required_capabilities.map((value, index) =>
        string(
          value,
          "durable_manifest_invalid",
          `manifest.required_capabilities.${index}`,
        ),
      ),
      domain_versions: Object.fromEntries(
        Object.entries(domains).map(([key, value]) => [
          string(
            key,
            "durable_domain_versions_invalid",
            "manifest.domain_versions.key",
          ),
          string(
            value,
            "durable_domain_versions_invalid",
            `manifest.domain_versions.${key}`,
          ),
        ]),
      ),
      generated_at: string(
        row.generated_at,
        "durable_manifest_invalid",
        "manifest.generated_at",
      ),
      asset_count: integer(
        row.asset_count,
        "durable_manifest_count_invalid",
        "manifest.asset_count",
      ),
      assets: row.assets as SynthesisDurableManifestAsset[],
      manifest_hash: hash(
        row.manifest_hash,
        "durable_manifest_hash_invalid",
        "manifest.manifest_hash",
      ),
    };
    if (manifest.asset_count !== manifest.assets.length) {
      fail("durable_manifest_count_mismatch", "manifest.asset_count");
    }
    if (manifest.manifest_hash !== hashManifest(manifest)) {
      fail("durable_manifest_hash_mismatch", "manifest.manifest_hash");
    }
    return manifest;
  };

  const rebuildManifestEntry = (value: unknown, location: string) => {
    const row = record(value, "durable_manifest_entry_invalid", location);
    exact(row, ENTRY_FIELDS, "durable_manifest_entry_fields_invalid", location);
    const entry: SynthesisDurableManifestEntity = {
      path: validatePath(row.path, `${location}.path`),
      entity_kind: entityKind(row.entity_kind, `${location}.entity_kind`),
      entity_id: string(
        row.entity_id,
        "durable_entity_id_invalid",
        `${location}.entity_id`,
      ),
      schema_id: string(
        row.schema_id,
        "durable_schema_id_invalid",
        `${location}.schema_id`,
      ),
      schema_version: string(
        row.schema_version,
        "durable_schema_version_invalid",
        `${location}.schema_version`,
      ),
      hash: hash(row.hash, "durable_entry_hash_invalid", `${location}.hash`),
      content_hash: hash(
        row.content_hash,
        "durable_content_hash_invalid",
        `${location}.content_hash`,
      ),
      bytes: integer(
        row.bytes,
        "durable_entry_bytes_invalid",
        `${location}.bytes`,
      ),
    };
    if (entry.hash !== entry.content_hash) {
      fail("durable_entry_hash_mismatch", location);
    }
    return entry;
  };

  const readAndVerify = async (
    source: SynthesisDurableBundleSource,
  ): Promise<SynthesisDurableBundleVerification> => {
    try {
      const manifestText = await source.readManifestText();
      if (typeof manifestText !== "string")
        fail("durable_manifest_missing", "manifest");
      let manifestValue: unknown;
      try {
        manifestValue = JSON.parse(manifestText);
      } catch {
        fail("durable_manifest_json_invalid", "manifest");
      }
      const manifest = rebuildManifest(manifestValue);
      const legacy =
        manifest.manifest_schema_version ===
        SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION;
      const seenPaths = new Set<string>();
      const seenEntities = new Set<string>();
      const entries: SynthesisDurableAssetEnvelope[] = [];
      const assets: SynthesisDurableBundleExport["assets"] = [];
      const perKind = new Map<SynthesisDurableEntityKind, number>();
      for (
        let assetIndex = 0;
        assetIndex < manifest.assets.length;
        assetIndex += 1
      ) {
        const location = `manifest.assets.${assetIndex}`;
        const raw = record(
          manifest.assets[assetIndex],
          "durable_manifest_asset_invalid",
          location,
        );
        exact(
          raw,
          legacy ? V1_ASSET_FIELDS : V2_ASSET_FIELDS,
          "durable_manifest_asset_fields_invalid",
          location,
        );
        const path = validatePath(raw.path, `${location}.path`);
        if (seenPaths.has(path)) fail("durable_path_duplicate", location, path);
        seenPaths.add(path);
        const declaredHash = hash(
          raw.hash,
          "durable_asset_hash_invalid",
          `${location}.hash`,
        );
        const declaredBytes = integer(
          raw.bytes,
          "durable_asset_bytes_invalid",
          `${location}.bytes`,
        );
        const text = await source.readAssetText(path);
        if (typeof text !== "string")
          fail("durable_asset_missing", location, path);
        if (text.length !== declaredBytes)
          fail("durable_asset_bytes_mismatch", location, path);
        if (options.hashCanonicalJson(text) !== declaredHash) {
          fail("durable_asset_hash_mismatch", location, path);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          fail("durable_asset_json_invalid", location, path);
        }
        if (legacy) {
          const envelope = rebuildEnvelope(parsed, path);
          if (
            raw.entity_kind !== envelope.entity_kind ||
            raw.entity_id !== envelope.entity_id ||
            raw.schema_id !== envelope.schema_id ||
            raw.schema_version !== envelope.schema_version
          ) {
            fail("durable_manifest_entry_mismatch", location, path);
          }
          const key = entityKey(envelope.entity_kind, envelope.entity_id);
          if (seenEntities.has(key))
            fail("durable_entity_duplicate", key, path);
          seenEntities.add(key);
          entries.push(envelope);
          const count = (perKind.get(envelope.entity_kind) ?? 0) + 1;
          if (count > SYNTHESIS_DURABLE_ENTITY_LIMITS[envelope.entity_kind]) {
            fail("durable_entity_limit_exceeded", envelope.entity_kind, path);
          }
          perKind.set(envelope.entity_kind, count);
          continue;
        }
        if (text.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.bundleText) {
          fail("durable_bundle_too_large", location, path);
        }
        if (
          raw.schema_id !== SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID ||
          raw.schema_version !== SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION
        ) {
          fail("durable_bundle_schema_invalid", location, path);
        }
        const bundleRow = record(parsed, "durable_bundle_invalid", path);
        exact(bundleRow, BUNDLE_FIELDS, "durable_bundle_fields_invalid", path);
        if (
          bundleRow.schema_id !== SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID ||
          bundleRow.schema_version !==
            SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION ||
          typeof bundleRow.bundle_kind !== "string" ||
          !Array.isArray(bundleRow.entries)
        ) {
          fail("durable_bundle_schema_invalid", path, path);
        }
        if (bundleRow.bundle_kind !== raw.bundle_kind) {
          fail("durable_bundle_kind_mismatch", path, path);
        }
        const indexed = Array.isArray(raw.entries)
          ? raw.entries.map((entry, index) =>
              rebuildManifestEntry(entry, `${location}.entries.${index}`),
            )
          : fail("durable_manifest_entries_invalid", location, path);
        if (
          integer(
            raw.entry_count,
            "durable_entry_count_invalid",
            `${location}.entry_count`,
          ) !== bundleRow.entries.length ||
          indexed.length !== bundleRow.entries.length
        ) {
          fail("durable_entry_count_mismatch", location, path);
        }
        const indexByKey = new Map<string, SynthesisDurableManifestEntity>();
        for (const item of indexed) {
          if (item.path !== path)
            fail("durable_manifest_entry_path_mismatch", location, path);
          const key = entityKey(item.entity_kind, item.entity_id);
          if (indexByKey.has(key)) fail("durable_entity_duplicate", key, path);
          indexByKey.set(key, item);
        }
        const bundleEntries = bundleRow.entries.map((entry, index) =>
          rebuildEnvelope(entry, `${path}.entries.${index}`),
        );
        if (!bundlePathMatches(path, bundleRow.bundle_kind, bundleEntries)) {
          fail("durable_bundle_path_mismatch", path, path);
        }
        for (const envelope of bundleEntries) {
          if (bundleKindFor(envelope.entity_kind) !== bundleRow.bundle_kind) {
            fail("durable_bundle_kind_mismatch", path, path);
          }
          const key = entityKey(envelope.entity_kind, envelope.entity_id);
          const index = indexByKey.get(key);
          if (!index) fail("durable_manifest_entry_missing", key, path);
          const envelopeText = canonicalText(envelope);
          if (
            index.schema_id !== envelope.schema_id ||
            index.schema_version !== envelope.schema_version ||
            index.hash !== envelope.content_hash ||
            index.content_hash !== envelope.content_hash ||
            index.bytes !== envelopeText.length
          ) {
            fail("durable_manifest_entry_mismatch", key, path);
          }
          if (seenEntities.has(key))
            fail("durable_entity_duplicate", key, path);
          seenEntities.add(key);
          entries.push(envelope);
          const count = (perKind.get(envelope.entity_kind) ?? 0) + 1;
          if (count > SYNTHESIS_DURABLE_ENTITY_LIMITS[envelope.entity_kind]) {
            fail("durable_entity_limit_exceeded", envelope.entity_kind, path);
          }
          perKind.set(envelope.entity_kind, count);
        }
        assets.push({
          path,
          text,
          bundle: {
            schema_id: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID,
            schema_version: SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION,
            bundle_kind: bundleRow.bundle_kind,
            entries: bundleEntries,
          },
        });
      }
      if (entries.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.entries) {
        fail("durable_entry_limit_exceeded", "entries");
      }
      entries.sort((left, right) =>
        entityKey(left.entity_kind, left.entity_id).localeCompare(
          entityKey(right.entity_kind, right.entity_id),
        ),
      );
      assets.sort((left, right) => left.path.localeCompare(right.path));
      return {
        value: { manifest, manifestText, assets, entries },
        diagnostics: [],
      };
    } catch (error) {
      const diagnostic =
        error instanceof SynthesisDurableBundleContractError
          ? {
              code: error.code,
              severity: error.severity,
              ...(error.path ? { path: error.path } : {}),
              ...(error.location ? { location: error.location } : {}),
            }
          : { code: "durable_source_read_failed", severity: "error" as const };
      return { diagnostics: [diagnostic] };
    }
  };

  return {
    canonicalText,
    contentHash,
    createEnvelope,
    createManifest,
    hashManifest,
    buildExport,
    readAndVerify,
  };
}
