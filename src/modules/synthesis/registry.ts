import { listNotePayloadBlocks } from "../notePayloadCodec";
import { getRuntimePersistencePaths } from "../runtimePersistence";
import { joinPath } from "../../utils/path";
import { hashCanonicalJson, hashMarkdown } from "./foundation";

export type RegistryArtifactType =
  | "digest"
  | "references"
  | "citation_analysis";

export type RegistryArtifactStatus = "available" | "missing" | "invalid";

export type PaperRegistryDiagnostic = {
  code:
    | "payload_missing"
    | "payload_decode_failed"
    | "unsupported_payload_version"
    | "duplicate_payload_candidates";
  artifact_type: RegistryArtifactType;
  message: string;
};

export type PaperRegistryArtifact = {
  type: RegistryArtifactType;
  payload_type: string;
  status: RegistryArtifactStatus;
  note_key?: string;
  note_title?: string;
  hash?: string;
  updated_at?: string;
  diagnostics: PaperRegistryDiagnostic[];
};

export type PaperRegistryInputNote = {
  key: string;
  title?: string;
  html: string;
  updatedAt?: string;
  payloadBlocks?: ReturnType<typeof listNotePayloadBlocks>;
};

export type PaperRegistryInput = {
  libraryId: number;
  itemKey: string;
  title: string;
  year?: string;
  itemType?: string;
  tags?: string[];
  collections?: string[];
  notes?: PaperRegistryInputNote[];
  creators?: string[];
  doi?: string;
  arxiv?: string;
  url?: string;
  citekey?: string;
  dateAdded?: string;
};

export type PaperRegistryRow = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year: string;
  item_type: string;
  tags: string[];
  collections: string[];
  artifacts: Record<RegistryArtifactType, PaperRegistryArtifact> & {
    citation_analysis: PaperRegistryArtifact;
  };
  readiness: "ready" | "partial";
  coverage: "complete" | "partial" | "missing";
  diagnostics: PaperRegistryDiagnostic[];
  row_hash: string;
};

const ARTIFACT_PAYLOAD_TYPES: Record<RegistryArtifactType, string> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringList(values: unknown[] | undefined) {
  return Array.from(
    new Set((values || []).map((entry) => normalizeString(entry)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeLibraryId(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function artifactLabel(type: RegistryArtifactType) {
  if (type === "citation_analysis") {
    return "citation analysis";
  }
  return type;
}

function missingDiagnostic(type: RegistryArtifactType): PaperRegistryDiagnostic {
  return {
    code: "payload_missing",
    artifact_type: type,
    message: `${artifactLabel(type)} payload is missing`,
  };
}

function decodeFailedDiagnostic(
  type: RegistryArtifactType,
  message: string,
): PaperRegistryDiagnostic {
  return {
    code: "payload_decode_failed",
    artifact_type: type,
    message,
  };
}

function unsupportedVersionDiagnostic(
  type: RegistryArtifactType,
  version: string,
): PaperRegistryDiagnostic {
  return {
    code: "unsupported_payload_version",
    artifact_type: type,
    message: `${artifactLabel(type)} payload version is unsupported: ${version}`,
  };
}

function duplicateDiagnostic(
  type: RegistryArtifactType,
  count: number,
): PaperRegistryDiagnostic {
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

function buildMissingArtifact(type: RegistryArtifactType): PaperRegistryArtifact {
  const diagnostic = missingDiagnostic(type);
  return {
    type,
    payload_type: ARTIFACT_PAYLOAD_TYPES[type],
    status: "missing",
    diagnostics: [diagnostic],
  };
}

function discoverArtifact(
  type: RegistryArtifactType,
  notes: PaperRegistryInputNote[],
): PaperRegistryArtifact {
  const payloadType = ARTIFACT_PAYLOAD_TYPES[type];
  const sortedNotes = [...notes].sort((left, right) =>
    normalizeString(left.key).localeCompare(normalizeString(right.key)),
  );
  const validCandidates: Array<{
    note: PaperRegistryInputNote;
    block: ReturnType<typeof listNotePayloadBlocks>[number];
  }> = [];
  const diagnostics: PaperRegistryDiagnostic[] = [];

  for (const note of sortedNotes) {
    const blocks = (note.payloadBlocks || listNotePayloadBlocks(note.html)).filter(
      (entry) => entry.payloadType === payloadType,
    );
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

function readinessForArtifacts(
  artifacts: Record<RegistryArtifactType, PaperRegistryArtifact>,
) {
  const statuses = Object.values(artifacts).map((entry) => entry.status);
  const available = statuses.filter((entry) => entry === "available").length;
  return {
    readiness: available === statuses.length ? ("ready" as const) : ("partial" as const),
    coverage:
      available === statuses.length
        ? ("complete" as const)
        : available === 0
          ? ("missing" as const)
          : ("partial" as const),
  };
}

export function buildPaperRegistryRow(input: PaperRegistryInput): PaperRegistryRow {
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
  const state = readinessForArtifacts(artifacts);
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
    readiness: state.readiness,
    coverage: state.coverage,
    diagnostics,
  };
  return {
    ...rowWithoutHash,
    row_hash: hashCanonicalJson(rowWithoutHash),
  };
}

export function buildPaperRegistryRows(inputs: PaperRegistryInput[]) {
  return [...inputs]
    .sort((left, right) => {
      const library = normalizeLibraryId(left.libraryId) - normalizeLibraryId(right.libraryId);
      if (library !== 0) {
        return library;
      }
      return normalizeString(left.itemKey).localeCompare(normalizeString(right.itemKey));
    })
    .map(buildPaperRegistryRow);
}

export function buildSynthesisLayerDbPath(runtimeRoot?: string) {
  const paths = getRuntimePersistencePaths(runtimeRoot);
  return joinPath(paths.stateDir, "synthesis-layer.db");
}
