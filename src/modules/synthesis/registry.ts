import { listNotePayloadBlocks } from "../notePayloadCodec";
import { getRuntimePersistencePaths } from "../runtimePersistence";
import { hashCanonicalJson, hashMarkdown } from "./foundation";

export type ReferenceSidecarArtifactType =
  | "digest"
  | "references"
  | "citation_analysis";

export type ReferenceSidecarArtifactStatus =
  | "available"
  | "missing"
  | "error";

export type ReferenceSidecarDiagnostic = {
  code:
    | "payload_missing"
    | "payload_decode_failed"
    | "unsupported_payload_version"
    | "duplicate_payload_candidates";
  artifact_type: ReferenceSidecarArtifactType;
  message: string;
};

export type ReferenceSidecarArtifact = {
  type: ReferenceSidecarArtifactType;
  payload_type: string;
  status: ReferenceSidecarArtifactStatus;
  note_key?: string;
  note_title?: string;
  hash?: string;
  updated_at?: string;
  diagnostics: ReferenceSidecarDiagnostic[];
};

export type ReferenceSidecarFacetStatus =
  | "ready"
  | "partial"
  | "missing"
  | "stale"
  | "deleted"
  | "unknown";

export type ReferenceSidecarFacet = {
  hash: string;
  status: ReferenceSidecarFacetStatus;
  updated_at?: string;
};

export type ReferenceSidecarFacets = {
  identity: ReferenceSidecarFacet;
  metadata: ReferenceSidecarFacet;
  artifact: ReferenceSidecarFacet;
  reference: ReferenceSidecarFacet;
  topic_usage: ReferenceSidecarFacet;
};

export type ReferenceSidecarMetadataFingerprintPayload = {
  title: string;
  year: string;
  item_type: string;
  creators: string[];
  tags: string[];
  collections: string[];
  doi: string;
  arxiv: string;
  isbn: string;
  url: string;
};

export type ReferenceSidecarInputNote = {
  key: string;
  title?: string;
  html: string;
  updatedAt?: string;
  payloadBlocks?: ReturnType<typeof listNotePayloadBlocks>;
};

export type ReferenceSidecarInput = {
  libraryId: number;
  itemKey: string;
  title: string;
  year?: string;
  itemType?: string;
  tags?: string[];
  collections?: string[];
  notes?: ReferenceSidecarInputNote[];
  creators?: string[];
  doi?: string;
  arxiv?: string;
  isbn?: string;
  url?: string;
  citekey?: string;
  dateAdded?: string;
};

export type ReferenceSidecarIndexRow = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year: string;
  item_type: string;
  tags: string[];
  collections: string[];
  artifacts: Record<ReferenceSidecarArtifactType, ReferenceSidecarArtifact> & {
    citation_analysis: ReferenceSidecarArtifact;
  };
  artifactCoverage: "complete" | "partial" | "missing";
  diagnostics: ReferenceSidecarDiagnostic[];
  facets: ReferenceSidecarFacets;
  row_hash: string;
};

const ARTIFACT_PAYLOAD_TYPES: Record<ReferenceSidecarArtifactType, string> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringList(values: unknown[] | undefined) {
  return Array.from(
    new Set(
      (values || []).map((entry) => normalizeString(entry)).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function pushNormalizedIsbn(
  values: string[],
  seen: Set<string>,
  candidate: unknown,
) {
  const normalized = normalizeString(candidate)
    .toLocaleUpperCase("en-US")
    .replace(/^ISBN(?:-1[03])?:/i, "")
    .replace(/[^0-9X]/g, "");
  if (
    (normalized.length === 10 || normalized.length === 13) &&
    !seen.has(normalized)
  ) {
    seen.add(normalized);
    values.push(normalized);
  }
}

export function normalizeIsbnValues(value: unknown) {
  const text = normalizeString(value).toLocaleUpperCase("en-US");
  const values: string[] = [];
  const seen = new Set<string>();
  if (!text) {
    return values;
  }
  const isbn13Pattern = /97[89](?:[-\s]?\d){10}/g;
  const remaining = text.replace(isbn13Pattern, (match) => {
    pushNormalizedIsbn(values, seen, match);
    return " ".repeat(match.length);
  });
  const isbn10Pattern = /(?:\d[-\s]?){9}[\dX]/g;
  remaining.replace(isbn10Pattern, (match) => {
    pushNormalizedIsbn(values, seen, match);
    return match;
  });
  if (!values.length) {
    pushNormalizedIsbn(values, seen, text);
  }
  return values.sort((left, right) => left.localeCompare(right));
}

export function normalizeIsbnValue(value: unknown) {
  return normalizeIsbnValues(value).join(" ");
}

function normalizeLibraryId(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function buildReferenceSidecarMetadataFingerprintPayload(input: {
  title?: unknown;
  year?: unknown;
  itemType?: unknown;
  item_type?: unknown;
  creators?: unknown[];
  tags?: unknown[];
  collections?: unknown[];
  doi?: unknown;
  arxiv?: unknown;
  isbn?: unknown;
  url?: unknown;
}): ReferenceSidecarMetadataFingerprintPayload {
  return {
    title: normalizeString(input.title),
    year: normalizeString(input.year),
    item_type: normalizeString(input.itemType ?? input.item_type),
    creators: normalizeStringList(input.creators),
    tags: normalizeStringList(input.tags),
    collections: normalizeStringList(input.collections),
    doi: normalizeString(input.doi),
    arxiv: normalizeString(input.arxiv),
    isbn: normalizeIsbnValue(input.isbn),
    url: normalizeString(input.url),
  };
}

function artifactLabel(type: ReferenceSidecarArtifactType) {
  if (type === "citation_analysis") {
    return "citation analysis";
  }
  return type;
}

function missingDiagnostic(
  type: ReferenceSidecarArtifactType,
): ReferenceSidecarDiagnostic {
  return {
    code: "payload_missing",
    artifact_type: type,
    message: `${artifactLabel(type)} payload is missing`,
  };
}

function decodeFailedDiagnostic(
  type: ReferenceSidecarArtifactType,
  message: string,
): ReferenceSidecarDiagnostic {
  return {
    code: "payload_decode_failed",
    artifact_type: type,
    message,
  };
}

function unsupportedVersionDiagnostic(
  type: ReferenceSidecarArtifactType,
  version: string,
): ReferenceSidecarDiagnostic {
  return {
    code: "unsupported_payload_version",
    artifact_type: type,
    message: `${artifactLabel(type)} payload version is unsupported: ${version}`,
  };
}

function duplicateDiagnostic(
  type: ReferenceSidecarArtifactType,
  count: number,
): ReferenceSidecarDiagnostic {
  return {
    code: "duplicate_payload_candidates",
    artifact_type: type,
    message: `${count} valid candidates found for ${type}`,
  };
}

function hashPayload(block: ReturnType<typeof listNotePayloadBlocks>[number]) {
  if (block.format === "markdown") {
    return hashMarkdown(block.markdown || block.decodedText || "");
  }
  if (block.format === "json") {
    return hashCanonicalJson(block.payload);
  }
  return hashMarkdown(block.decodedText || "");
}

function buildMissingArtifact(
  type: ReferenceSidecarArtifactType,
): ReferenceSidecarArtifact {
  const diagnostic = missingDiagnostic(type);
  return {
    type,
    payload_type: ARTIFACT_PAYLOAD_TYPES[type],
    status: "missing",
    diagnostics: [diagnostic],
  };
}

function discoverArtifact(
  type: ReferenceSidecarArtifactType,
  notes: ReferenceSidecarInputNote[],
): ReferenceSidecarArtifact {
  const payloadType = ARTIFACT_PAYLOAD_TYPES[type];
  const sortedNotes = [...notes].sort((left, right) =>
    normalizeString(left.key).localeCompare(normalizeString(right.key)),
  );
  const validCandidates: Array<{
    note: ReferenceSidecarInputNote;
    block: ReturnType<typeof listNotePayloadBlocks>[number];
  }> = [];
  const diagnostics: ReferenceSidecarDiagnostic[] = [];

  for (const note of sortedNotes) {
    const blocks = (
      note.payloadBlocks || listNotePayloadBlocks(note.html)
    ).filter((entry) => entry.payloadType === payloadType);
    for (const block of blocks) {
      if (block.version !== "1") {
        diagnostics.push(unsupportedVersionDiagnostic(type, block.version));
        continue;
      }
      if (block.errors?.length) {
        diagnostics.push(decodeFailedDiagnostic(type, block.errors.join("; ")));
        continue;
      }
      validCandidates.push({ note, block });
    }
  }

  if (validCandidates.length === 0) {
    const missing = buildMissingArtifact(type);
    return {
      ...missing,
      diagnostics: [...diagnostics, ...missing.diagnostics],
    };
  }

  if (validCandidates.length > 1) {
    diagnostics.push(duplicateDiagnostic(type, validCandidates.length));
  }

  const selected = validCandidates[0];
  return {
    type,
    payload_type: payloadType,
    status: "available",
    note_key: normalizeString(selected.note.key),
    note_title: normalizeString(selected.note.title),
    hash: hashPayload(selected.block),
    updated_at: normalizeString(selected.note.updatedAt),
    diagnostics,
  };
}

function artifactCoverageForArtifacts(
  artifacts: Record<ReferenceSidecarArtifactType, ReferenceSidecarArtifact>,
) {
  const statuses = Object.values(artifacts).map((entry) => entry.status);
  const available = statuses.filter((entry) => entry === "available").length;
  return available === statuses.length
    ? ("complete" as const)
    : available === 0
      ? ("missing" as const)
      : ("partial" as const);
}

function latestUpdatedAt(values: Array<string | undefined>) {
  return values
    .map(normalizeString)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
}

function buildFacet(
  value: unknown,
  status: ReferenceSidecarFacetStatus,
  updatedAt?: string,
): ReferenceSidecarFacet {
  return {
    hash: hashCanonicalJson(value),
    status,
    updated_at: normalizeString(updatedAt) || undefined,
  };
}

function facetStatusFromCoverage(
  coverage: ReferenceSidecarIndexRow["artifactCoverage"],
): ReferenceSidecarFacetStatus {
  if (coverage === "complete") {
    return "ready";
  }
  return coverage;
}

function buildRegistryFacets(args: {
  input: ReferenceSidecarInput;
  artifacts: Record<ReferenceSidecarArtifactType, ReferenceSidecarArtifact>;
  artifactCoverage: ReferenceSidecarIndexRow["artifactCoverage"];
}) {
  const identity = {
    library_id: normalizeLibraryId(args.input.libraryId),
    item_key: normalizeString(args.input.itemKey),
    paper_ref: `${normalizeLibraryId(args.input.libraryId)}:${normalizeString(args.input.itemKey)}`,
    citekey: normalizeString(args.input.citekey),
    date_added: normalizeString(args.input.dateAdded),
  };
  const metadata = buildReferenceSidecarMetadataFingerprintPayload(args.input);
  const artifact = Object.fromEntries(
    Object.entries(args.artifacts).map(([type, row]) => [
      type,
      {
        status: row.status,
        hash: normalizeString(row.hash),
        payload_type: row.payload_type,
        note_key: normalizeString(row.note_key),
      },
    ]),
  );
  const reference = {
    references_status: args.artifacts.references.status,
    references_hash: normalizeString(args.artifacts.references.hash),
    citation_analysis_status: args.artifacts.citation_analysis.status,
    citation_analysis_hash: normalizeString(
      args.artifacts.citation_analysis.hash,
    ),
  };
  const artifactUpdatedAt = latestUpdatedAt(
    Object.values(args.artifacts).map((row) => row.updated_at),
  );
  return {
    identity: buildFacet(identity, "ready", args.input.dateAdded),
    metadata: buildFacet(metadata, "ready"),
    artifact: buildFacet(
      artifact,
      facetStatusFromCoverage(args.artifactCoverage),
      artifactUpdatedAt,
    ),
    reference: buildFacet(
      reference,
      args.artifacts.references.status === "available" ? "ready" : "missing",
      latestUpdatedAt([
        args.artifacts.references.updated_at,
        args.artifacts.citation_analysis.updated_at,
      ]),
    ),
    topic_usage: buildFacet({ topic_ids: [] }, "unknown"),
  } satisfies ReferenceSidecarFacets;
}

export function buildReferenceSidecarIndexRow(
  input: ReferenceSidecarInput,
): ReferenceSidecarIndexRow {
  const libraryId = normalizeLibraryId(input.libraryId);
  const itemKey = normalizeString(input.itemKey);
  if (!libraryId) {
    throw new Error("libraryId must be a positive integer");
  }
  if (!itemKey) {
    throw new Error("itemKey must be non-empty");
  }
  const notes = input.notes || [];
  const artifacts = {
    digest: discoverArtifact("digest", notes),
    references: discoverArtifact("references", notes),
    citation_analysis: discoverArtifact("citation_analysis", notes),
  };
  const diagnostics = Object.values(artifacts).flatMap(
    (artifact) => artifact.diagnostics,
  );
  const artifactCoverage = artifactCoverageForArtifacts(artifacts);
  const facets = buildRegistryFacets({
    input,
    artifacts,
    artifactCoverage,
  });
  const rowWithoutHash = {
    paper_ref: `${libraryId}:${itemKey}`,
    library_id: libraryId,
    item_key: itemKey,
    title: normalizeString(input.title),
    year: normalizeString(input.year),
    item_type: normalizeString(input.itemType),
    tags: normalizeStringList(input.tags),
    collections: normalizeStringList(input.collections),
    artifacts,
    artifactCoverage,
    diagnostics,
    facets,
  };
  return {
    ...rowWithoutHash,
    row_hash: hashCanonicalJson(rowWithoutHash),
  };
}

export function buildReferenceSidecarIndexRows(
  inputs: ReferenceSidecarInput[],
) {
  return [...inputs]
    .sort((left, right) => {
      const library =
        normalizeLibraryId(left.libraryId) -
        normalizeLibraryId(right.libraryId);
      if (library !== 0) {
        return library;
      }
      return normalizeString(left.itemKey).localeCompare(
        normalizeString(right.itemKey),
      );
    })
    .map(buildReferenceSidecarIndexRow);
}

export function buildSynthesisLayerDbPath(runtimeRoot?: string) {
  return getRuntimePersistencePaths(runtimeRoot).stateDbPath;
}
