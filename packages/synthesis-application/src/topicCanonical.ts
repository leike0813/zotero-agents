import {
  byteLengthSynthesisEngineText,
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../synthesis-engine/src/canonicalJson.js";
import {
  SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
  SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicManifestValidationRequest,
  type SynthesisTopicJsonObject,
  type SynthesisTopicJsonValue,
} from "../../synthesis-engine/src/topicStructuredArtifact.js";
import {
  SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
  rebuildSynthesisTopicCanonicalStoreSnapshot,
  type SynthesisTopicCanonicalStoreSnapshot,
} from "../../synthesis-contracts/src/sidecarCanonicalStore.js";

export {
  SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
  rebuildSynthesisTopicCanonicalStoreSnapshot,
};
export type { SynthesisTopicCanonicalStoreSnapshot };

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SECTION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const TOPIC_ID_MAX_LENGTH = 512;

export const SYNTHESIS_TOPIC_CANONICAL_DIAGNOSTICS = [
  "topic_current_missing_file",
  "unknown_current_entry",
  "symlink_forbidden",
  "invalid_json",
  "snapshot_invalid",
  "hash_mismatch",
  "duplicate_section_filename",
  "path_identity_mismatch",
] as const;

export type SynthesisTopicCanonicalDiagnostic =
  (typeof SYNTHESIS_TOPIC_CANONICAL_DIAGNOSTICS)[number];

export type SynthesisTopicCanonicalSnapshot = {
  topicId: string;
  pathId: string;
  manifest: SynthesisTopicJsonObject;
  artifact: SynthesisTopicJsonObject;
  metadata: SynthesisTopicJsonObject;
  sections: Record<string, SynthesisTopicJsonValue>;
};

export type SynthesisTopicCanonicalHashes = {
  manifestHash: string;
  structuredHash: string;
  artifactHash: string;
  metadataHash: string;
  sectionHashes: Record<string, string>;
};

export type SynthesisTopicCanonicalSectionDescriptor = {
  name: string;
  fileName: string;
  sha256: string;
  byteLength: number;
};

export type SynthesisTopicCanonicalInspectRequest = {
  topicId: string;
};

export type SynthesisTopicCanonicalInspectResult = {
  status: "absent" | "ready" | "invalid";
  topicId: string;
  pathId: string;
  manifestHash: string | null;
  artifactHash: string | null;
  metadataHash: string | null;
  sections: SynthesisTopicCanonicalSectionDescriptor[];
  diagnostics: SynthesisTopicCanonicalDiagnostic[];
};

export type SynthesisTopicCanonicalBasis = {
  manifestHash: string;
  artifactHash: string;
};

export type SynthesisTopicCanonicalPromoteStatus =
  | "promoted"
  | "basis_mismatch"
  | "canonical_store_busy"
  | "failed_recovered"
  | "repair_required";

export type SynthesisTopicCanonicalPromoteResult = {
  status: SynthesisTopicCanonicalPromoteStatus;
};

export interface SynthesisTopicCanonicalStore {
  inspect(
    request: SynthesisTopicCanonicalInspectRequest,
  ): SynthesisTopicCanonicalInspectResult;
  promote(args: {
    expectedBasis: SynthesisTopicCanonicalBasis | null;
    snapshot: SynthesisTopicCanonicalSnapshot;
  }): SynthesisTopicCanonicalPromoteResult;
  snapshot(): SynthesisTopicCanonicalStoreSnapshot;
  stopAdmission(): void;
  close(): void;
}

export class SynthesisTopicCanonicalContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisTopicCanonicalContractError";
  }
}

function invalid(message: string): never {
  throw new SynthesisTopicCanonicalContractError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function strictRecord(
  value: unknown,
  fields: readonly string[],
  location: string,
): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${location} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    invalid(`${location} fields are invalid`);
  }
  return value;
}

function strictTopicId(value: unknown, location = "topicId") {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > TOPIC_ID_MAX_LENGTH ||
    /[\\/]/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32) ||
    value === "." ||
    value === ".."
  ) {
    invalid(`${location} is invalid`);
  }
  return value;
}

function strictHash(value: unknown, location: string) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    invalid(`${location} is invalid`);
  }
  return value;
}

function strictNullableHash(value: unknown, location: string) {
  return value === null ? null : strictHash(value, location);
}

function canonicalClone<T extends SynthesisTopicJsonValue>(value: T): T {
  return JSON.parse(canonicalizeSynthesisEngineJson(value)) as T;
}

export function canonicalSynthesisTopicPathId(topicId: string) {
  const identity = strictTopicId(topicId);
  const slug = identity
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return (
    slug ||
    hashSynthesisEngineCanonicalJson({ topic_id: identity }).slice(
      "sha256:".length,
      16,
    )
  );
}

export function canonicalSynthesisTopicSectionFileName(section: string) {
  if (typeof section !== "string" || !SECTION_NAME_PATTERN.test(section)) {
    invalid("section name is invalid");
  }
  return `${section.replace(/_/g, "-")}.json`;
}

export function canonicalSynthesisTopicJsonText(value: unknown) {
  return `${canonicalizeSynthesisEngineJson(value)}\n`;
}

export function computeSynthesisTopicCurrentHashes(args: {
  manifest: unknown;
  artifact: unknown;
  metadata: unknown;
  sections: Record<string, unknown>;
}): SynthesisTopicCanonicalHashes {
  if (!isRecord(args.sections)) invalid("sections must be an object");
  const sectionHashes = Object.fromEntries(
    Object.entries(args.sections)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => [name, hashSynthesisEngineCanonicalJson(value)]),
  );
  const artifactHash = hashSynthesisEngineCanonicalJson(args.artifact);
  return {
    manifestHash: hashSynthesisEngineCanonicalJson(args.manifest),
    structuredHash: artifactHash,
    artifactHash,
    metadataHash: hashSynthesisEngineCanonicalJson(args.metadata),
    sectionHashes,
  };
}

function rebuildBoundedSnapshotJson(input: Record<string, unknown>) {
  const assembled = rebuildSynthesisTopicArtifactAssemblyRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    manifest: input.manifest,
    sections: input.sections,
  });
  const artifactRequest = rebuildSynthesisTopicArtifactValidationRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
    artifact: input.artifact,
  });
  const metadataRequest = rebuildSynthesisTopicManifestValidationRequest({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
    manifest: input.metadata,
  });
  if (
    !isRecord(artifactRequest.artifact) ||
    !isRecord(metadataRequest.manifest)
  ) {
    invalid("artifact and metadata must be objects");
  }
  return {
    manifest: assembled.manifest,
    artifact: artifactRequest.artifact as SynthesisTopicJsonObject,
    metadata: metadataRequest.manifest as SynthesisTopicJsonObject,
    sections: assembled.sections,
  };
}

function validateMetadataEnvelope(
  metadata: SynthesisTopicJsonObject,
  topicId: string,
) {
  const envelope = strictRecord(
    metadata,
    ["schema_id", "schema_version", "created_at", "updated_at", "data"],
    "metadata",
  );
  if (
    envelope.schema_id !== "synthesis.topic_artifact_metadata" ||
    typeof envelope.schema_version !== "string" ||
    !envelope.schema_version ||
    typeof envelope.created_at !== "string" ||
    !envelope.created_at ||
    typeof envelope.updated_at !== "string" ||
    !envelope.updated_at ||
    !isRecord(envelope.data) ||
    envelope.data.topic_id !== topicId
  ) {
    invalid("metadata envelope is invalid");
  }
}

function validateSectionIdentity(
  manifest: SynthesisTopicJsonObject,
  sections: Record<string, SynthesisTopicJsonValue>,
) {
  const names = Object.keys(sections).sort();
  const fileNames = new Set<string>();
  for (const name of names) {
    const fileName = canonicalSynthesisTopicSectionFileName(name);
    if (fileNames.has(fileName)) invalid("section filenames collide");
    fileNames.add(fileName);
  }
  if (!isRecord(manifest.sections)) invalid("manifest.sections is required");
  const declaredNames = Object.keys(manifest.sections).sort();
  if (
    names.length === 0 ||
    names.length !== declaredNames.length ||
    names.some((name, index) => name !== declaredNames[index])
  ) {
    invalid("manifest sections are incomplete");
  }
}

function validateDeclaredHashes(
  manifest: SynthesisTopicJsonObject,
  hashes: SynthesisTopicCanonicalHashes,
) {
  if (manifest.artifact_hash !== hashes.artifactHash) {
    invalid("manifest artifact hash does not match");
  }
  if (manifest.metadata_hash !== hashes.metadataHash) {
    invalid("manifest metadata hash does not match");
  }
  if (!isRecord(manifest.section_hashes)) {
    invalid("manifest section hashes are required");
  }
  const declared = manifest.section_hashes;
  const names = Object.keys(hashes.sectionHashes).sort();
  if (
    Object.keys(declared).sort().join("\0") !== names.join("\0") ||
    names.some((name) => declared[name] !== hashes.sectionHashes[name])
  ) {
    invalid("manifest section hashes do not match");
  }
}

export function rebuildSynthesisTopicCanonicalSnapshot(
  value: unknown,
): SynthesisTopicCanonicalSnapshot {
  const input = strictRecord(
    value,
    ["topicId", "pathId", "manifest", "artifact", "metadata", "sections"],
    "topicCanonicalSnapshot",
  );
  const topicId = strictTopicId(input.topicId);
  const pathId = canonicalSynthesisTopicPathId(topicId);
  if (input.pathId !== pathId) invalid("pathId does not match topicId");
  const bounded = rebuildBoundedSnapshotJson(input);
  const canonical = {
    topicId,
    pathId,
    manifest: canonicalClone(bounded.manifest),
    artifact: canonicalClone(bounded.artifact),
    metadata: canonicalClone(bounded.metadata),
    sections: canonicalClone(bounded.sections),
  };
  validateMetadataEnvelope(canonical.metadata, topicId);
  validateSectionIdentity(canonical.manifest, canonical.sections);
  validateDeclaredHashes(
    canonical.manifest,
    computeSynthesisTopicCurrentHashes(canonical),
  );
  return canonical;
}

export function rebuildSynthesisTopicCanonicalInspectRequest(
  value: unknown,
): SynthesisTopicCanonicalInspectRequest {
  const input = strictRecord(
    value,
    ["topicId"],
    "topicCanonicalInspectRequest",
  );
  return { topicId: strictTopicId(input.topicId) };
}

function rebuildSectionDescriptor(
  value: unknown,
  location: string,
): SynthesisTopicCanonicalSectionDescriptor {
  const input = strictRecord(
    value,
    ["name", "fileName", "sha256", "byteLength"],
    location,
  );
  if (
    typeof input.name !== "string" ||
    canonicalSynthesisTopicSectionFileName(input.name) !== input.fileName ||
    typeof input.byteLength !== "number" ||
    !Number.isSafeInteger(input.byteLength) ||
    input.byteLength < 0
  ) {
    invalid(`${location} is invalid`);
  }
  return {
    name: input.name,
    fileName: input.fileName,
    sha256: strictHash(input.sha256, `${location}.sha256`),
    byteLength: input.byteLength,
  };
}

export function rebuildSynthesisTopicCanonicalInspectResult(
  value: unknown,
): SynthesisTopicCanonicalInspectResult {
  const input = strictRecord(
    value,
    [
      "status",
      "topicId",
      "pathId",
      "manifestHash",
      "artifactHash",
      "metadataHash",
      "sections",
      "diagnostics",
    ],
    "topicCanonicalInspectResult",
  );
  if (
    input.status !== "absent" &&
    input.status !== "ready" &&
    input.status !== "invalid"
  ) {
    invalid("topicCanonicalInspectResult.status is invalid");
  }
  const topicId = strictTopicId(input.topicId);
  const pathId = canonicalSynthesisTopicPathId(topicId);
  if (input.pathId !== pathId) invalid("inspect path identity is invalid");
  if (!Array.isArray(input.sections) || !Array.isArray(input.diagnostics)) {
    invalid("inspect arrays are invalid");
  }
  const sections = input.sections.map((entry, index) =>
    rebuildSectionDescriptor(entry, `sections[${index}]`),
  );
  if (
    sections.some(
      (entry, index) => index > 0 && sections[index - 1]!.name >= entry.name,
    )
  ) {
    invalid("inspect sections are not uniquely sorted");
  }
  const diagnostics = input.diagnostics.map((entry) => {
    if (
      typeof entry !== "string" ||
      !(SYNTHESIS_TOPIC_CANONICAL_DIAGNOSTICS as readonly string[]).includes(
        entry,
      )
    ) {
      invalid("inspect diagnostic is invalid");
    }
    return entry as SynthesisTopicCanonicalDiagnostic;
  });
  if (new Set(diagnostics).size !== diagnostics.length) {
    invalid("inspect diagnostics are duplicated");
  }
  const result = {
    status: input.status,
    topicId,
    pathId,
    manifestHash: strictNullableHash(input.manifestHash, "manifestHash"),
    artifactHash: strictNullableHash(input.artifactHash, "artifactHash"),
    metadataHash: strictNullableHash(input.metadataHash, "metadataHash"),
    sections,
    diagnostics,
  } as SynthesisTopicCanonicalInspectResult;
  if (
    (result.status === "absent" &&
      (result.manifestHash !== null ||
        result.artifactHash !== null ||
        result.metadataHash !== null ||
        result.sections.length > 0 ||
        result.diagnostics.length > 0)) ||
    (result.status === "ready" &&
      (!result.manifestHash ||
        !result.artifactHash ||
        !result.metadataHash ||
        result.diagnostics.length > 0)) ||
    (result.status === "invalid" && result.diagnostics.length === 0)
  ) {
    invalid("inspect status fields are inconsistent");
  }
  return result;
}

export function projectSynthesisTopicCanonicalInspectResult(
  snapshot: SynthesisTopicCanonicalSnapshot,
): SynthesisTopicCanonicalInspectResult {
  const canonical = rebuildSynthesisTopicCanonicalSnapshot(snapshot);
  const hashes = computeSynthesisTopicCurrentHashes(canonical);
  return rebuildSynthesisTopicCanonicalInspectResult({
    status: "ready",
    topicId: canonical.topicId,
    pathId: canonical.pathId,
    manifestHash: hashes.manifestHash,
    artifactHash: hashes.artifactHash,
    metadataHash: hashes.metadataHash,
    sections: Object.entries(canonical.sections)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => {
        const text = canonicalSynthesisTopicJsonText(value);
        return {
          name,
          fileName: canonicalSynthesisTopicSectionFileName(name),
          sha256: hashes.sectionHashes[name],
          byteLength: byteLengthSynthesisEngineText(text),
        };
      }),
    diagnostics: [],
  });
}
