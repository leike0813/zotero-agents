import {
  ensureSourceReferenceId,
  generateSourceReferenceId,
  parseCitationAnalysisArtifact,
  parseSourceReferenceArtifact,
  type CitationAnalysisArtifact,
  type CitationFunction,
  type CitationItem,
  type CitationMention,
  type CitationUnresolvedMention,
  type SourceReference,
  type SourceReferenceArtifact,
} from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import type {
  JsonObject,
  JsonValue,
  LiteratureArtifactApplyAnalysisResultDto,
  MutationExecutionResult,
  PortableItemRef,
  WorkflowCallControl,
} from "../workflows/types";
import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import {
  getZoteroManagedNoteLocalControl,
  type LegacyMigrationNoteTransfer,
  type LegacyMigrationCleanupPlan,
  type ManagedParentSetSemanticInput,
  type ZoteroManagedNoteLocalControl,
} from "./zoteroHost/zoteroManagedNotes";
import type { ZoteroHostCapabilityBroker } from "./zoteroHostCapabilityBroker";
import type { ZoteroHostMutationCallerScope } from "./zoteroHostMutationAuthority";
import {
  getLiteratureArtifactMigrationRun,
  listLiteratureArtifactMigrationRuns,
  listLiteratureArtifactMigrationSets,
  upsertLiteratureArtifactMigrationRun,
  upsertLiteratureArtifactMigrationSet,
  type LiteratureArtifactMigrationRunEntry,
  type LiteratureArtifactMigrationSetEntry,
} from "./pluginStateStore";

export const LITERATURE_ARTIFACT_MIGRATION_ID = "literature-artifacts" as const;
export const LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION = 2 as const;

export type LiteratureArtifactMigrationClassification =
  | "ready"
  | "review_required"
  | "blocked";

export type LiteratureArtifactMigrationReasonCode =
  | "citation_only"
  | "duplicate_reference"
  | "conflicting_evidence"
  | "damaged_input"
  | "data_loss"
  | "read_only_library"
  | "unresolved_linkage"
  | "ambiguous_linkage"
  | "citation_snapshot_recovery"
  | "no_references"
  | "invalid_canonical_artifact"
  | "canonical_conflict"
  | "unsupported_input";

export type MigrationPortableItemRef = PortableItemRef;

export type LegacyReferenceInput = Record<string, unknown>;
export type LegacyCitationInput = Record<string, unknown>;

/**
 * Adapter input deliberately accepts legacy storage-shaped values. The
 * converter owns their one-way normalization; no ordinary reader imports
 * this type or falls back to it.
 */
export type LegacyArtifactSetInput = {
  libraryId: number;
  parentRef: MigrationPortableItemRef;
  references?: unknown;
  citation?: unknown;
  legacyPayload?: unknown;
  noteContent?: string;
  noteContents?: string[];
  filePayload?: unknown;
  filePayloads?: unknown[];
  /** Transient source note refs; never persisted in the conversion basis. */
  legacyNoteRefs?: MigrationPortableItemRef[];
  /** Raw note facts retained only in the process-local scan plan. */
  legacyNotes?: LegacyMigrationNote[];
  /** Existing canonical pair facts retained so same-kind legacy data blocks. */
  canonicalNotes?: CanonicalMigrationNote[];
  existingReferences?: SourceReference[];
  readErrors?: string[];
  writable?: boolean;
  readOnly?: boolean;
  artifactKind?: string;
};

export type LiteratureArtifactMigrationConverterOptions = {
  idFactory?: () => string;
  mentionIdFactory?: (index: number) => string;
  /** Offline import may link Citation to an already canonical References set. */
  allowCitationOnlyWithExistingReferences?: boolean;
};

export type LiteratureArtifactMigrationConversion = {
  classification: LiteratureArtifactMigrationClassification;
  reasonCodes: LiteratureArtifactMigrationReasonCode[];
  diagnostics: string[];
  references: SourceReferenceArtifact;
  citation: CitationAnalysisArtifact | null;
  basisHash: string;
  verifiedCount: number;
  unresolvedCount: number;
  recoveredCount: number;
  droppedCount: number;
  originalReferenceCount: number;
  originalMentionCount: number;
};

export type LiteratureArtifactMigrationCandidate = Pick<
  LiteratureArtifactMigrationConversion,
  | "classification"
  | "reasonCodes"
  | "diagnostics"
  | "verifiedCount"
  | "unresolvedCount"
  | "recoveredCount"
  | "droppedCount"
  | "originalReferenceCount"
  | "originalMentionCount"
> & {
  candidateId: string;
  ordinal: number;
  parentRef: MigrationPortableItemRef;
  libraryId: number;
  outcome:
    | "preview"
    | "applied"
    | "skipped"
    | "changed_since_scan"
    | "repair_required"
    | "blocked"
    | "failed";
};

type RuntimeCandidate = {
  candidate: LiteratureArtifactMigrationCandidate;
  conversion: LiteratureArtifactMigrationConversion;
  input: LegacyArtifactSetInput;
};

type LiteratureArtifactMigrationApplyCandidate =
  LiteratureArtifactMigrationCandidate & {
    conversion: LiteratureArtifactMigrationConversion;
  };

export type LiteratureArtifactMigrationPreview = {
  ok: true;
  runId: string;
  operationId: string;
  migrationId: typeof LITERATURE_ARTIFACT_MIGRATION_ID;
  definitionVersion: typeof LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION;
  libraryId: number;
  candidates: LiteratureArtifactMigrationCandidate[];
};

export type LiteratureArtifactMigrationFailureCode =
  | "busy"
  | "fresh_scan_required"
  | "stale_plan"
  | "version_mismatch"
  | "unknown_candidate"
  | "not_found"
  | "invalid_scope";

export type LiteratureArtifactMigrationFailure = {
  ok: false;
  code: LiteratureArtifactMigrationFailureCode;
  message: string;
  activeRunId?: string;
  runId?: string;
};

export type LiteratureArtifactMigrationRunResult = {
  ok: true;
  runId: string;
  operationId: string;
  state: "completed" | "completed_with_attention" | "failed";
  reason: string;
  processedCount: number;
  remainingCount: number;
  setCount: number;
};

export type LiteratureArtifactMigrationHost = {
  scanLibrary: (args: {
    libraryId: number;
    candidateIds?: string[];
    parentRefs?: MigrationPortableItemRef[];
  }) => Promise<LegacyArtifactSetInput[]>;
  applySet: (args: {
    libraryId: number;
    parentRef: MigrationPortableItemRef;
    candidate: LiteratureArtifactMigrationApplyCandidate;
    operationId: string;
  }) => Promise<{
    outcome: "applied" | "changed_since_scan" | "repair_required";
    reason?: string;
    diagnostics?: string[];
  }>;
};

/** Narrow bridge for the Broker-owned trusted parent-set writer. */
export type LiteratureArtifactMigrationBrokerControl = {
  scanLibrary: LiteratureArtifactMigrationHost["scanLibrary"];
  applyParentSet: (args: {
    libraryId: number;
    parentRef: MigrationPortableItemRef;
    operationId: string;
    references: SourceReferenceArtifact;
    citation: CitationAnalysisArtifact | null;
  }) => Promise<{
    outcome: "applied" | "changed_since_scan" | "repair_required";
    reason?: string;
    diagnostics?: string[];
  }>;
};

type LiteratureArtifactMigrationLocalControl = Pick<
  ZoteroManagedNoteLocalControl,
  "readLegacyForMigration"
> & {
  isLibraryWritable?: (
    libraryId: number,
    control?: WorkflowCallControl,
  ) => Promise<boolean>;
  applyParentSet: ZoteroManagedNoteLocalControl["applyParentSet"];
};

type MigrationBrokerLibrary = Pick<
  ZoteroHostCapabilityBroker["library"],
  "listItems" | "getItemNotes"
>;

type MigrationBroker = Pick<ZoteroHostCapabilityBroker, "library">;

type LegacyMigrationPayload = {
  payloadType: string;
  value?: unknown;
  error?: string;
  attachmentRef?: MigrationPortableItemRef;
  sourceStorage?: string;
  payloadStorageVersion?: number;
  payloadHash?: string;
};

type LegacyMigrationNote = {
  ref: MigrationPortableItemRef;
  html: string;
  revision: string;
  payloads: LegacyMigrationPayload[];
};

type CanonicalMigrationNote = {
  ref: MigrationPortableItemRef;
  noteKind: "references" | "citation-analysis";
  revision: string;
  payload: JsonValue;
};

function hasLegacyPayloadMarker(html: string) {
  return /data-zs-payload\s*=\s*(["']?)(?:references-json|citation-analysis-json)\1/iu.test(
    html,
  );
}

const LEGACY_ARTIFACT_PAYLOAD_TYPES = new Set([
  "references-json",
  "citation-analysis-json",
  "digest-markdown",
  "literature-score-json",
  "conversation-note-markdown",
  "custom-markdown",
]);

const MIGRATABLE_LEGACY_PAYLOAD_TYPES = new Set([
  "references-json",
  "citation-analysis-json",
]);

function payloadMarkerTypes(html: string): string[] {
  const types = new Set<string>();
  const pattern = /data-zs-payload\s*=\s*(["']?)([^\s"'>]+)\1/giu;
  for (const match of html.matchAll(pattern)) {
    const payloadType = text(match[2]);
    if (payloadType) types.add(payloadType);
  }
  return [...types];
}

function stripLegacyPayloadMarkup(html: string) {
  let cleaned = html;
  const payloadPattern = [...MIGRATABLE_LEGACY_PAYLOAD_TYPES]
    .map((payloadType) => payloadType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  cleaned = cleaned.replace(
    new RegExp(
      `<p\\b[^>]*data-zs-payload-anchor-container\\s*=\\s*(?:["']?1["']?)[^>]*>[\\s\\S]*?<\\/p>`,
      "giu",
    ),
    (block) =>
      new RegExp(
        `data-zs-payload-anchor\\s*=\\s*(?:["']?(?:${payloadPattern})["']?)`,
        "iu",
      ).test(block)
        ? ""
        : block,
  );
  cleaned = cleaned.replace(
    new RegExp(
      `<span\\b[^>]*data-zs-payload\\s*=\\s*(?:["']?(?:${payloadPattern})["']?)[^>]*>[\\s\\S]*?<\\/span>`,
      "giu",
    ),
    "",
  );
  return cleaned.replace(
    new RegExp(
      `<img\\b[^>]*data-zs-payload-anchor\\s*=\\s*(?:["']?(?:${payloadPattern})["']?)[^>]*>`,
      "giu",
    ),
    "",
  );
}

function migrationNoteForPayload(
  input: LegacyArtifactSetInput,
  payloadType: string,
  usedRefs: ReadonlySet<string>,
) {
  const notes = input.legacyNotes || [];
  return (
    notes.find(
      (note) =>
        !usedRefs.has(`${note.ref.libraryId}:${note.ref.key}`) &&
        note.payloads.some((payload) => payload.payloadType === payloadType),
    ) ||
    notes.find(
      (note) => !usedRefs.has(`${note.ref.libraryId}:${note.ref.key}`),
    ) ||
    null
  );
}

function migrationParentSetEntries(
  input: LegacyArtifactSetInput,
  conversion: LiteratureArtifactMigrationConversion,
): NonNullable<ManagedParentSetSemanticInput["entries"]> {
  const entries: NonNullable<ManagedParentSetSemanticInput["entries"]> = [];
  const usedRefs = new Set<string>();
  const add = (
    noteKind: "references" | "citation-analysis",
    title: string,
    payload: JsonValue,
    payloadType: string,
  ) => {
    const note = migrationNoteForPayload(input, payloadType, usedRefs);
    if (note) usedRefs.add(`${note.ref.libraryId}:${note.ref.key}`);
    entries.push({
      noteKind,
      title,
      payload,
      ...(note
        ? {
            migrationSourceRef: note.ref,
            visibleHtml: stripLegacyPayloadMarkup(note.html),
          }
        : {}),
    });
  };
  add(
    "references",
    "References",
    conversion.references as unknown as JsonValue,
    "references-json",
  );
  if (conversion.citation) {
    add(
      "citation-analysis",
      "Citation Analysis",
      conversion.citation as unknown as JsonValue,
      "citation-analysis-json",
    );
  }
  return entries;
}

function mutationResultToMigrationOutcome(
  result: MutationExecutionResult<JsonObject>,
): {
  outcome: "applied" | "repair_required";
  reason?: string;
  diagnostics?: string[];
} {
  if (result.outcome === "committed" || result.outcome === "unchanged") {
    return { outcome: "applied" };
  }
  if (!("attempt" in result)) {
    return { outcome: "repair_required", reason: result.outcome };
  }
  const diagnostics = [
    `mutation:${migrationFailureCode(result.attempt.error)}`,
  ];
  return {
    outcome: "repair_required",
    reason: result.outcome,
    diagnostics,
  };
}

function samePortableRef(
  left: PortableItemRef | null | undefined,
  right: PortableItemRef | null | undefined,
): boolean {
  return Boolean(
    left &&
    right &&
    left.libraryId === right.libraryId &&
    left.key === right.key,
  );
}

function migrationReadFailureCode(error: unknown): string {
  const code = object(error)?.code;
  return MIGRATION_FAILURE_CODES.has(String(code))
    ? String(code)
    : "read_failed";
}

function migrationPayloadErrorCode(error: unknown): string {
  const code = text(error);
  return MIGRATION_FAILURE_CODES.has(code) ? code : "payload_read_failed";
}

const MIGRATION_FAILURE_CODES = new Set([
  "invalid_artifact",
  "legacy_artifact_requires_migration",
  "resource_limited",
  "execution_failed",
  "conflict",
  "not_found",
  "invalid_request",
  "cancelled",
]);

function migrationFailureCode(error: unknown): string {
  const code = String(object(error)?.code || "");
  return MIGRATION_FAILURE_CODES.has(code) ? code : "migration_error";
}

function hasVerifiedCanonicalParentSet(
  result: MutationExecutionResult<LiteratureArtifactApplyAnalysisResultDto>,
  parentRef: PortableItemRef,
  entries: NonNullable<ManagedParentSetSemanticInput["entries"]>,
): boolean {
  if (!("result" in result)) return false;
  const notes = result.result.notes;
  if (!Array.isArray(notes) || notes.length !== entries.length) return false;

  const referencesEntry = entries.find(
    (entry) => entry.noteKind === "references",
  );
  const expectedReferences = referencesEntry?.payload as
    | SourceReferenceArtifact
    | undefined;
  const expectedReferencesBasis = expectedReferences
    ? hashSynthesisContractCanonicalJson(expectedReferences)
    : undefined;
  if (
    expectedReferencesBasis &&
    result.result.referencesBasis !== expectedReferencesBasis
  ) {
    return false;
  }

  const seenRefs = new Set<string>();
  for (const entry of entries) {
    const note = notes.find(
      (candidate) =>
        candidate.kind === "managed" && candidate.noteKind === entry.noteKind,
    );
    if (!note || note.kind !== "managed") return false;
    if (!samePortableRef(note.parentRef, parentRef)) return false;
    if (!note.ref.key || !Number.isSafeInteger(note.ref.libraryId)) {
      return false;
    }
    const noteKey = `${note.ref.libraryId}:${note.ref.key}`;
    if (seenRefs.has(noteKey)) return false;
    seenRefs.add(noteKey);
    if (
      entry.migrationSourceRef &&
      !samePortableRef(note.ref, entry.migrationSourceRef)
    ) {
      return false;
    }
    if (stableJson(note.payload) !== stableJson(entry.payload)) return false;
    if (
      entry.noteKind === "citation-analysis" &&
      note.provenance?.referencesBasis !== expectedReferencesBasis
    ) {
      return false;
    }
  }
  return true;
}

function normalizeMigrationScope(
  libraryId: number,
): ZoteroHostMutationCallerScope {
  return { ownerId: `dashboard:literature-artifact-migration:${libraryId}` };
}

async function readLegacyParentSet(
  library: MigrationBrokerLibrary,
  control: LiteratureArtifactMigrationLocalControl,
  parentRef: MigrationPortableItemRef,
  hostControl?: WorkflowCallControl,
): Promise<LegacyArtifactSetInput | null> {
  const noteContents: string[] = [];
  const filePayloads: Array<{
    payloadType: string;
    value: unknown;
    sourceRef?: MigrationPortableItemRef;
  }> = [];
  const legacyNoteRefs: MigrationPortableItemRef[] = [];
  const legacyNotes: LegacyMigrationNote[] = [];
  const canonicalNotes: CanonicalMigrationNote[] = [];
  const readErrors: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await library.getItemNotes(
      parentRef,
      { limit: 100, ...(cursor ? { cursor } : {}) },
      hostControl,
    );
    for (const note of page.notes) {
      let transfer: LegacyMigrationNoteTransfer;
      try {
        transfer = await control.readLegacyForMigration(note.ref, hostControl);
      } catch (error) {
        const code = migrationReadFailureCode(error);
        legacyNoteRefs.push(note.ref);
        legacyNotes.push({
          ref: note.ref,
          html: "",
          revision: "read-failed",
          payloads: [{ payloadType: "unknown", error: code }],
        });
        readErrors.push(code);
        continue;
      }
      if (transfer.kind === "canonical_managed") {
        for (const payload of transfer.payloads) {
          const noteKind =
            payload.payloadType === "references-json"
              ? "references"
              : payload.payloadType === "citation-analysis-json"
                ? "citation-analysis"
                : null;
          if (!noteKind || payload.value === undefined || payload.error) {
            continue;
          }
          canonicalNotes.push({
            ref: note.ref,
            noteKind,
            revision: transfer.revision,
            payload: payload.value,
          });
        }
        continue;
      }
      if (transfer.kind !== "legacy") continue;
      const markerTypes = payloadMarkerTypes(transfer.html);
      if (
        !hasLegacyPayloadMarker(transfer.html) &&
        !transfer.payloads.length &&
        !markerTypes.length
      )
        continue;
      const transferPayloadTypes = new Set(
        transfer.payloads.map((payload) => payload.payloadType),
      );
      const payloads: LegacyMigrationNoteTransfer["payloads"] = [
        ...transfer.payloads,
        ...markerTypes
          .filter((payloadType) => !transferPayloadTypes.has(payloadType))
          .map((payloadType) => ({ payloadType })),
      ];
      legacyNoteRefs.push(note.ref);
      noteContents.push(transfer.html);
      legacyNotes.push({
        ref: note.ref,
        html: transfer.html,
        revision: transfer.revision,
        payloads: payloads.map((payload) => ({
          payloadType: payload.payloadType,
          ...(payload.value !== undefined ? { value: payload.value } : {}),
          ...(payload.error
            ? { error: migrationPayloadErrorCode(payload.error) }
            : {}),
          ...(payload.attachmentRef
            ? { attachmentRef: payload.attachmentRef }
            : {}),
          ...(payload.sourceStorage
            ? { sourceStorage: payload.sourceStorage }
            : {}),
          ...(payload.payloadStorageVersion !== undefined
            ? { payloadStorageVersion: payload.payloadStorageVersion }
            : {}),
          ...(payload.payloadHash ? { payloadHash: payload.payloadHash } : {}),
        })),
      });
      for (const payload of payloads) {
        if (payload.error) {
          readErrors.push(
            `${payload.payloadType || "unknown"}: ${migrationPayloadErrorCode(payload.error)}`,
          );
          continue;
        }
        if (payload.value !== undefined) {
          filePayloads.push({
            payloadType: payload.payloadType,
            value: payload.value,
            sourceRef: note.ref,
          });
        }
      }
    }
    if (!page.hasMore) break;
    const nextCursor = page.nextCursor || undefined;
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("legacy note source returned an invalid continuation");
    }
    cursor = nextCursor;
  }
  if (!noteContents.length && !filePayloads.length && !readErrors.length) {
    return null;
  }
  return {
    libraryId: parentRef.libraryId,
    parentRef,
    noteContents,
    filePayloads,
    legacyNoteRefs,
    legacyNotes,
    ...(canonicalNotes.length ? { canonicalNotes } : {}),
    ...(readErrors.length ? { readErrors } : {}),
  };
}

async function scanLegacyLibrary(
  library: MigrationBrokerLibrary,
  control: LiteratureArtifactMigrationLocalControl,
  args: {
    libraryId: number;
    parentRefs?: MigrationPortableItemRef[];
  },
  hostControl?: WorkflowCallControl,
) {
  const writable = await control.isLibraryWritable?.(
    args.libraryId,
    hostControl,
  );
  const requestedParents = new Map(
    (args.parentRefs || []).map((ref) => [`${ref.libraryId}:${ref.key}`, ref]),
  );
  const inputs: LegacyArtifactSetInput[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await library.listItems(
      {
        libraryId: args.libraryId,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      },
      hostControl,
    );
    for (const item of page.items) {
      if (item.kind !== "regular") continue;
      const parentRef = item.ref;
      if (
        requestedParents.size &&
        !requestedParents.has(`${parentRef.libraryId}:${parentRef.key}`)
      ) {
        continue;
      }
      const input = await readLegacyParentSet(
        library,
        control,
        parentRef,
        hostControl,
      );
      if (input) {
        inputs.push(writable === undefined ? input : { ...input, writable });
      }
    }
    if (!page.hasMore) break;
    const nextCursor = page.nextCursor || undefined;
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("library source returned an invalid continuation");
    }
    cursor = nextCursor;
  }
  return inputs;
}

export function createLiteratureArtifactMigrationHostFromBroker(
  control: LiteratureArtifactMigrationBrokerControl,
): LiteratureArtifactMigrationHost {
  return {
    scanLibrary: control.scanLibrary,
    applySet: async ({ libraryId, parentRef, candidate, operationId }) =>
      control.applyParentSet({
        libraryId,
        parentRef,
        operationId,
        references: candidate.conversion.references,
        citation: candidate.conversion.citation,
      }),
  };
}

export type LiteratureArtifactMigrationBrokerAdapterOptions = {
  localControl?: LiteratureArtifactMigrationLocalControl;
  workflowControl?: WorkflowCallControl;
};

/**
 * Production Dashboard adapter. Library enumeration and note reads stay on
 * the Broker's bounded paged API; the private managed-note control owns the
 * paired writer and any native cleanup/verification.
 */
export function createLiteratureArtifactMigrationHostFromZoteroBroker(
  broker: MigrationBroker,
  options: LiteratureArtifactMigrationBrokerAdapterOptions = {},
): LiteratureArtifactMigrationHost {
  const localControl =
    options.localControl || getZoteroManagedNoteLocalControl(broker);
  const library = broker.library;
  return {
    scanLibrary: ({ libraryId, parentRefs }) =>
      scanLegacyLibrary(
        library,
        localControl,
        { libraryId, parentRefs },
        options.workflowControl,
      ),
    applySet: async ({ libraryId, parentRef, candidate, operationId }) => {
      const current = await readLegacyParentSet(
        library,
        localControl,
        parentRef,
        options.workflowControl,
      );
      if (!current) {
        return {
          outcome: "changed_since_scan",
          reason: "legacy_payload_is_no_longer_present",
        };
      }
      const refreshed = classifyConversion(current);
      if (
        refreshed.basisHash !== candidate.conversion.basisHash ||
        refreshed.classification === "blocked"
      ) {
        return {
          outcome: "changed_since_scan",
          reason: "current_legacy_basis_changed",
          diagnostics: refreshed.reasonCodes,
        };
      }
      const entries = migrationParentSetEntries(current, candidate.conversion);
      const targetRefs = new Set(
        entries
          .map((entry) => entry.migrationSourceRef)
          .filter((ref): ref is MigrationPortableItemRef => Boolean(ref))
          .map((ref) => `${ref.libraryId}:${ref.key}`),
      );
      const isMigratableLegacyNote = (note: LegacyMigrationNote) =>
        note.payloads.some((payload) =>
          MIGRATABLE_LEGACY_PAYLOAD_TYPES.has(payload.payloadType),
        );
      const cleanupNotes = (current.legacyNotes || [])
        .filter(
          (note) =>
            !targetRefs.has(`${note.ref.libraryId}:${note.ref.key}`) &&
            isMigratableLegacyNote(note),
        )
        .map((note) => ({
          ref: note.ref,
          expectedRevision: note.revision,
          cleanHtml: stripLegacyPayloadMarkup(note.html),
        }));
      const payloadRefs = (current.legacyNotes || [])
        .filter(
          (note) =>
            !targetRefs.has(`${note.ref.libraryId}:${note.ref.key}`) &&
            isMigratableLegacyNote(note),
        )
        .flatMap((note) =>
          note.payloads.flatMap((payload) =>
            MIGRATABLE_LEGACY_PAYLOAD_TYPES.has(payload.payloadType) &&
            payload.attachmentRef
              ? [payload.attachmentRef]
              : [],
          ),
        );
      const migrationCleanup: LegacyMigrationCleanupPlan | undefined =
        cleanupNotes.length || payloadRefs.length
          ? { notes: cleanupNotes, payloadRefs }
          : undefined;
      const input = {
        parentRef,
        operationId,
        entries,
        ...(migrationCleanup ? { migrationCleanup } : {}),
      };
      const result = await localControl.applyParentSet(
        input,
        normalizeMigrationScope(libraryId),
        options.workflowControl,
      );
      const applied = mutationResultToMigrationOutcome(result);
      if (applied.outcome !== "applied") return applied;
      if (!hasVerifiedCanonicalParentSet(result, parentRef, entries)) {
        return {
          outcome: "repair_required" as const,
          reason: "canonical_parent_set_verification_failed",
        };
      }
      return applied;
    },
  };
}

export type LiteratureArtifactMigrationServiceOptions = {
  host: LiteratureArtifactMigrationHost;
  idFactory?: () => string;
  candidateIdFactory?: (ordinal: number) => string;
};

type RuntimePlan = {
  preview: LiteratureArtifactMigrationPreview;
  candidates: Map<string, RuntimeCandidate>;
  stopped: boolean;
};

type RuntimeActive = {
  runId: string;
  operationId: string;
  stopped: boolean;
  phase: "scanning" | "preview" | "applying";
};

const runtimePlans = new Map<string, RuntimePlan>();
let runtimeActive: RuntimeActive | null = null;
let runtimeCounter = 0;

function text(value: unknown): string {
  const source = String(value ?? "");
  try {
    return source.normalize("NFKC").replace(/\s+/g, " ").trim();
  } catch {
    return source.replace(/\s+/g, " ").trim();
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return text(entry);
        const row = object(entry);
        if (!row) return "";
        return firstText(
          row.name,
          [row.given, row.family].filter(Boolean).join(" "),
          row.family,
        );
      })
      .filter(Boolean);
  }
  return typeof value === "string"
    ? value
        .split(/[;\n]/)
        .map((entry) => text(entry))
        .filter(Boolean)
    : [];
}

function strictYear(value: unknown): number | null | undefined {
  if (value === null || typeof value === "undefined" || text(value) === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : undefined;
  }
  const normalized = text(value);
  if (!/^-?\d+$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function normalizeDoi(value: unknown): string {
  return text(value)
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

function normalizeMatchingValue(key: string, value: unknown): string {
  const normalized = text(value);
  return key === "DOI" ? normalizeDoi(normalized) : normalized;
}

function normalizeConfidence(value: unknown): number | null {
  if (value === null || typeof value === "undefined" || text(value) === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function legacySourceFacts(input: LegacyArtifactSetInput) {
  return (input.legacyNotes || []).map((note) => ({
    ref: note.ref,
    revision: note.revision,
    htmlHash: hashText(note.html),
    payloads: note.payloads.map((payload) => ({
      payloadType: payload.payloadType,
      ...(payload.value !== undefined
        ? { valueHash: hashText(stableJson(payload.value)) }
        : {}),
      ...(payload.error ? { error: payload.error } : {}),
      ...(payload.attachmentRef
        ? { attachmentRef: payload.attachmentRef }
        : {}),
      ...(payload.sourceStorage
        ? { sourceStorage: payload.sourceStorage }
        : {}),
      ...(payload.payloadStorageVersion !== undefined
        ? { payloadStorageVersion: payload.payloadStorageVersion }
        : {}),
      ...(payload.payloadHash ? { payloadHash: payload.payloadHash } : {}),
    })),
  }));
}

function canonicalSourceFacts(input: LegacyArtifactSetInput) {
  return (input.canonicalNotes || []).map((note) => ({
    ref: note.ref,
    noteKind: note.noteKind,
    revision: note.revision,
    payloadHash: hashText(stableJson(note.payload)),
  }));
}

function boundedDiagnostics(values: unknown[]): string[] {
  return values.map(text).filter(Boolean).slice(0, 20);
}

type DecodedHtmlPayload = {
  payloadType: string;
  value: unknown;
};

type LegacyPayloadValue = DecodedHtmlPayload & {
  sourceKey: string;
};

function decodePayloadTag(
  tag: string,
  payloadType: string,
): DecodedHtmlPayload | null {
  const valueMatch = tag.match(/data-zs-value\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!valueMatch) return null;
  let encoded = valueMatch[2] || "";
  encoded = encoded
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  const encoding =
    tag.match(/data-zs-encoding\s*=\s*(["'])(.*?)\1/i)?.[2] || "base64";
  try {
    if (encoding.toLowerCase() === "base64") {
      const atobValue = (globalThis as { atob?: (value: string) => string })
        .atob;
      if (typeof atobValue !== "function") return null;
      const binary = atobValue(encoded);
      const bytes = Uint8Array.from(binary, (value) => value.charCodeAt(0));
      encoded = new TextDecoder().decode(bytes);
    }
    return { payloadType, value: JSON.parse(encoded) };
  } catch {
    return null;
  }
}

function decodeHtmlPayloads(noteContent: string): DecodedHtmlPayload[] {
  const payloads: DecodedHtmlPayload[] = [];
  const tagPattern =
    /<span\b[^>]*data-zs-payload\s*=\s*(["']?)([^\s"'>]+)\1[^>]*>/giu;
  for (const match of noteContent.matchAll(tagPattern)) {
    const payloadType = text(match[2]);
    if (
      ![
        "references-json",
        "citation-analysis-json",
        "conversation-note-markdown",
        "custom-markdown",
        "digest-markdown",
      ].includes(payloadType)
    ) {
      continue;
    }
    const decoded = decodePayloadTag(match[0], payloadType);
    if (decoded) payloads.push(decoded);
  }
  return payloads;
}

function unwrapReferences(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = object(value);
  if (!row) return [];
  if (Array.isArray(row.references)) return row.references;
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.records)) return row.records;
  if (object(row.payload)) return unwrapReferences(row.payload);
  return [];
}

function unwrapCitation(value: unknown): Record<string, unknown> | null {
  const row = object(value);
  if (!row) return null;
  const wrappedCitation = object(row.citation_analysis);
  if (wrappedCitation) return wrappedCitation;
  const camelCitation = object(row.citationAnalysis);
  if (camelCitation) return camelCitation;
  if (object(row.payload)) return unwrapCitation(row.payload);
  return row;
}

function resolveLegacyValues(input: LegacyArtifactSetInput): {
  references: unknown[];
  citation: Record<string, unknown> | null;
} {
  const sourceKeyForRef = (ref: unknown): string | null => {
    const row = object(ref);
    const libraryId =
      typeof row?.libraryId === "number"
        ? row.libraryId
        : Number(text(row?.libraryId));
    const key = text(row?.key);
    return Number.isSafeInteger(libraryId) && libraryId > 0 && key
      ? `note:${libraryId}:${key}`
      : null;
  };
  const decodedPayloads: LegacyPayloadValue[] = [];
  const payloadValues: LegacyPayloadValue[] = [];
  const appendPayload = (value: unknown, fallbackSourceKey: string): void => {
    const row = object(value);
    const sourceKey = sourceKeyForRef(row?.sourceRef) || fallbackSourceKey;
    if (row && typeof row.payloadType === "string" && "value" in row) {
      payloadValues.push({
        payloadType: text(row.payloadType),
        value: row.value,
        sourceKey,
      });
      return;
    }
    payloadValues.push({ payloadType: "", value, sourceKey });
  };
  for (const [index, value] of (input.filePayloads || []).entries()) {
    appendPayload(value, `file:${index}`);
  }
  if (input.filePayload !== undefined && input.filePayload !== null) {
    appendPayload(input.filePayload, "file:single");
  }
  if (input.legacyPayload !== undefined && input.legacyPayload !== null) {
    appendPayload(input.legacyPayload, "legacy:single");
  }
  const noteContents = [
    ...(input.noteContents || []).map((content, index) => ({
      content,
      sourceKey:
        sourceKeyForRef(input.legacyNoteRefs?.[index]) ||
        sourceKeyForRef(input.legacyNotes?.[index]?.ref) ||
        `note-html:${index}`,
    })),
    ...(typeof input.noteContent === "string"
      ? [{ content: input.noteContent, sourceKey: "note-html:single" }]
      : []),
  ].filter(
    (entry): entry is { content: string; sourceKey: string } =>
      typeof entry.content === "string",
  );
  for (const { content, sourceKey } of noteContents) {
    decodedPayloads.push(
      ...decodeHtmlPayloads(content).map((payload) => ({
        ...payload,
        sourceKey,
      })),
    );
  }
  payloadValues.push(...decodedPayloads);
  const uniquePayloadValues = (payloadType: string) => {
    const seen = new Set<string>();
    return payloadValues
      .filter((entry) => entry.payloadType === payloadType)
      .filter((entry) => {
        const key = `${entry.sourceKey}\u0000${stableJson(entry.value)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((entry) => entry.value);
  };
  const typedReferences = uniquePayloadValues("references-json");
  const typedCitations = uniquePayloadValues("citation-analysis-json");
  const inferredReferences = typedCitations.length
    ? undefined
    : payloadValues
        .map((entry) => entry.value)
        .find((value) => {
          const row = object(value);
          return Boolean(
            Array.isArray(value) ||
            row?.references ||
            row?.reference_entries ||
            (row?.items &&
              !row?.mentions &&
              !row?.unmapped_mentions &&
              !row?.snapshots &&
              !row?.reference_snapshots),
          );
        });
  const inferredCitation = payloadValues
    .map((entry) => entry.value)
    .find((value) => {
      const row = object(value);
      return Boolean(
        row?.citation_analysis ||
        row?.citationAnalysis ||
        row?.mentions ||
        row?.unmapped_mentions,
      );
    });
  const referencePayload = input.references ?? inferredReferences;
  const references = input.references
    ? unwrapReferences(referencePayload)
    : typedReferences.length
      ? typedReferences.flatMap(unwrapReferences)
      : unwrapReferences(referencePayload);
  const citationPayload =
    input.citation ?? typedCitations[0] ?? inferredCitation;
  return {
    references,
    citation: unwrapCitation(citationPayload),
  };
}

function pickCanonicalId(row: Record<string, unknown>): string {
  return firstText(
    row.sourceReferenceId,
    row.canonicalSourceReferenceId,
    row.retainedSourceReferenceId,
  );
}

function normalizeMatching(
  row: Record<string, unknown>,
): Record<string, string> {
  const nested = object(row.matching) || {};
  const aliases: Array<[string, string[]]> = [
    ["DOI", ["DOI", "doi"]],
    ["url", ["url", "URL"]],
    ["ISBN", ["ISBN", "isbn"]],
    ["ISSN", ["ISSN", "issn"]],
    ["citekey", ["citekey", "citeKey"]],
  ];
  const result: Record<string, string> = {};
  for (const [canonical, names] of aliases) {
    const value = firstText(
      ...names.map((name) => nested[name]),
      ...names.map((name) => row[name]),
    );
    if (value) result[canonical] = normalizeMatchingValue(canonical, value);
  }
  return result;
}

function referenceTuple(reference: SourceReference): string {
  return [
    text(reference.bibliography.title).toLowerCase(),
    String(reference.bibliography.year ?? ""),
    reference.bibliography.authors
      .map((author) => text(author).toLowerCase())
      .join(";"),
  ].join("|");
}

function rawReferenceKey(reference: SourceReference): string {
  return text(reference.extraction?.raw || "").toLowerCase();
}

function matchingKeys(reference: SourceReference): string[] {
  return ["DOI"]
    .map((key) => {
      const value = reference.matching[key as keyof typeof reference.matching];
      return value ? `${key}:${normalizeMatchingValue(key, value)}` : "";
    })
    .filter(Boolean);
}

function makeSourceReference(
  value: unknown,
  idFactory: () => string,
  diagnostics: string[],
): SourceReference | null {
  const row = object(value);
  if (!row) {
    diagnostics.push("reference entry is not an object");
    return null;
  }
  const bibliography = object(row.bibliography) || row;
  const title = firstText(bibliography.title, row.title);
  const authors = normalizeAuthors(
    bibliography.authors ?? row.authors ?? row.author,
  );
  const year = strictYear(bibliography.year ?? row.year);
  const extraction = object(row.extraction);
  const raw = firstText(extraction?.raw, row.raw, row.rawText, row.rawCitation);
  const confidence = normalizeConfidence(
    extraction?.confidence ?? row.confidence,
  );
  const explicitId = pickCanonicalId(row);
  if (!title || typeof year === "undefined") {
    diagnostics.push(
      !title
        ? "reference title is missing"
        : "reference year is not a strict integer",
    );
    return null;
  }
  const matching = normalizeMatching(row);
  const optionalFields = [
    "publicationTitle",
    "conferenceName",
    "university",
    "archiveID",
    "volume",
    "issue",
    "pages",
    "place",
    "publisher",
    "itemType",
    "date",
  ] as const;
  const normalizedBibliography: SourceReference["bibliography"] = {
    title,
    authors,
    year,
  };
  for (const field of optionalFields) {
    const fieldValue = firstText(bibliography[field], row[field]);
    if (fieldValue) normalizedBibliography[field] = fieldValue;
  }
  const numPages = strictYear(bibliography.numPages ?? row.numPages);
  if (typeof numPages === "number" && numPages >= 0) {
    normalizedBibliography.numPages = numPages;
  }
  return {
    sourceReferenceId: ensureSourceReferenceId(
      explicitId || undefined,
      idFactory,
    ),
    extraction: raw ? { raw, confidence } : null,
    bibliography: normalizedBibliography,
    matching,
  };
}

function matchReference(
  value: unknown,
  references: SourceReference[],
): {
  reference: SourceReference | null;
  ambiguous: boolean;
  conflicting?: boolean;
} {
  const row = object(value);
  if (!row) return { reference: null, ambiguous: false };
  const explicitId = pickCanonicalId(row);
  if (explicitId) {
    const exact = references.filter(
      (reference) => reference.sourceReferenceId === explicitId,
    );
    if (exact.length === 1) {
      const conflicting = referenceFactsConflict(row, exact[0]!);
      return {
        reference: conflicting ? null : exact[0]!,
        ambiguous: false,
        conflicting,
      };
    }
    if (exact.length > 1) return { reference: null, ambiguous: true };
  }
  const doi = normalizeMatching(row).DOI;
  const raw = firstText(
    object(row.extraction)?.raw,
    row.raw,
    row.rawText,
    row.rawCitation,
  ).toLowerCase();
  let matches = doi
    ? references.filter(
        (reference) =>
          normalizeMatchingValue("DOI", reference.matching.DOI || "") === doi,
      )
    : [];
  if (!matches.length && raw) {
    matches = references.filter(
      (reference) => rawReferenceKey(reference) === raw,
    );
  }
  if (!matches.length) {
    const candidate = makeSourceReference(row, () => "unused", []);
    if (candidate)
      matches = references.filter(
        (reference) => referenceTuple(reference) === referenceTuple(candidate),
      );
  }
  const conflicting =
    matches.length === 1 && referenceFactsConflict(row, matches[0]!);
  return {
    reference: matches.length === 1 && !conflicting ? matches[0] : null,
    ambiguous: matches.length > 1,
    conflicting,
  };
}

function referenceFactsConflict(
  row: Record<string, unknown>,
  reference: SourceReference,
): boolean {
  const bibliography = object(row.bibliography) || row;
  const title = firstText(bibliography.title, row.title);
  const year = strictYear(bibliography.year ?? row.year);
  const authors = normalizeAuthors(
    bibliography.authors ?? row.authors ?? row.author,
  );
  const doi = normalizeMatching(row).DOI;
  return Boolean(
    (title &&
      text(title).toLowerCase() !==
        text(reference.bibliography.title).toLowerCase()) ||
    (year !== undefined &&
      year !== null &&
      reference.bibliography.year !== null &&
      year !== reference.bibliography.year) ||
    (authors.length &&
      reference.bibliography.authors.length &&
      authors.map((author) => text(author).toLowerCase()).join(";") !==
        reference.bibliography.authors
          .map((author) => text(author).toLowerCase())
          .join(";")) ||
    (doi &&
      reference.matching.DOI &&
      doi !== normalizeMatchingValue("DOI", reference.matching.DOI)),
  );
}

const CITATION_FUNCTION_SET = new Set<CitationFunction>([
  "background",
  "baseline",
  "contrast",
  "component",
  "dataset",
  "tooling",
  "historical",
  "uncategorized",
]);

function normalizeMention(
  value: unknown,
  index: number,
  mentionIdFactory: (index: number) => string,
): CitationMention {
  const row = object(value) || {};
  const lineStartValue = strictYear(row.line_start ?? row.lineStart);
  const lineStart =
    typeof lineStartValue === "number" && lineStartValue >= 0
      ? lineStartValue
      : 0;
  const lineEndValue = strictYear(row.line_end ?? row.lineEnd);
  const lineEnd =
    typeof lineEndValue === "number" && lineEndValue >= lineStart
      ? lineEndValue
      : lineStart;
  const yearHint = strictYear(row.year_hint ?? row.yearHint ?? row.year);
  const refNumberHint = strictYear(
    row.ref_number_hint ?? row.refNumberHint ?? row.refNumber,
  );
  return {
    mention_id:
      firstText(row.mention_id, row.mentionId) || mentionIdFactory(index),
    marker: firstText(row.marker, row.rawCitation, row.raw) || "",
    style: firstText(row.style, row.citationStyle) || "",
    line_start: lineStart,
    line_end: lineEnd,
    snippet: firstText(row.snippet, row.context, row.rawCitation) || "",
    ref_number_hint:
      typeof refNumberHint === "number" && refNumberHint >= 0
        ? refNumberHint
        : null,
    year_hint: typeof yearHint === "number" ? yearHint : null,
    surname_hint:
      firstText(row.surname_hint, row.surnameHint, row.author) || null,
    citation_label_hint:
      firstText(row.citation_label_hint, row.citationLabelHint) || null,
    citekey_hint:
      firstText(row.citekey_hint, row.citekeyHint, row.citekey) || null,
  };
}

function normalizeCitation(
  value: Record<string, unknown>,
  references: SourceReference[],
  diagnostics: string[],
  mentionIdFactory: (index: number) => string,
): {
  citation: CitationAnalysisArtifact;
  unresolved: number;
  ambiguous: boolean;
  conflicting: boolean;
} {
  const metaRow = object(value.meta) || {};
  const scopeRow = object(metaRow.scope) || {};
  const scopeDecisionRow = object(metaRow.scope_decision) || {};
  const fallbackScopeRow = object(scopeDecisionRow.fallback_from);
  const rawItems = list(value.items);
  const rawMentions = list(value.mentions);
  const rawUnresolved = list(value.unresolved ?? value.unmapped_mentions);
  const unresolved: CitationUnresolvedMention[] = [];
  const items: CitationItem[] = [];
  let ambiguous = false;
  let conflicting = false;
  let mentionIndex = 0;
  for (const rawItem of rawItems) {
    const item = object(rawItem) || {};
    const matched = matchReference(item, references);
    if (matched.ambiguous) ambiguous = true;
    if (matched.conflicting) conflicting = true;
    const mentions = list(item.mentions).map((mention) =>
      normalizeMention(mention, mentionIndex++, mentionIdFactory),
    );
    if (!matched.reference) {
      diagnostics.push("citation item linkage is unresolved");
      unresolved.push(
        ...mentions.map((mention) => ({
          ...mention,
          reason: matched.ambiguous
            ? "ambiguous_linkage"
            : "unresolved_linkage",
        })),
      );
      continue;
    }
    const rawFunction = text(item.function);
    const citationFunction = CITATION_FUNCTION_SET.has(
      rawFunction as CitationFunction,
    )
      ? (rawFunction as CitationFunction)
      : null;
    if (rawFunction && !citationFunction)
      diagnostics.push("citation function category was not recognized");
    items.push({
      sourceReferenceId: matched.reference.sourceReferenceId,
      function: citationFunction,
      role_in_context:
        firstText(item.role_in_context, item.roleInContext) || null,
      topic: firstText(item.topic) || null,
      usage: firstText(item.usage) || null,
      keywords: list(item.keywords).map(text).filter(Boolean),
      summary: firstText(item.summary) || null,
      key_reference_reason:
        firstText(item.key_reference_reason, item.keyReferenceReason) || null,
      confidence: normalizeConfidence(item.confidence),
      mentions,
    });
  }
  for (const mention of [...rawMentions, ...rawUnresolved]) {
    const normalized = normalizeMention(
      mention,
      mentionIndex++,
      mentionIdFactory,
    );
    unresolved.push({ ...normalized, reason: "unresolved_linkage" });
  }
  const timeline: CitationAnalysisArtifact["timeline"] = {
    early: { summary: "", sourceReferenceIds: [] },
    mid: { summary: "", sourceReferenceIds: [] },
    recent: { summary: "", sourceReferenceIds: [] },
  };
  const timelineRow = object(value.timeline) || {};
  for (const bucket of ["early", "mid", "recent"] as const) {
    const rawBucket = object(timelineRow[bucket]) || {};
    const ids = list(
      rawBucket.sourceReferenceIds ?? rawBucket.source_reference_ids,
    )
      .map((id) => text(id))
      .filter((id) =>
        references.some((reference) => reference.sourceReferenceId === id),
      );
    timeline[bucket] = {
      summary: firstText(rawBucket.summary),
      sourceReferenceIds: [...new Set(ids)],
    };
  }
  const citation: CitationAnalysisArtifact = {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: firstText(metaRow.language),
      scope: {
        section_title:
          firstText(scopeRow.section_title, scopeRow.sectionTitle) || null,
        line_start:
          typeof strictYear(scopeRow.line_start) === "number"
            ? (strictYear(scopeRow.line_start) as number)
            : null,
        line_end:
          typeof strictYear(scopeRow.line_end) === "number"
            ? (strictYear(scopeRow.line_end) as number)
            : null,
      },
      scope_source:
        firstText(metaRow.scope_source, metaRow.scopeSource) || null,
      scope_decision: {
        selection_reason:
          firstText(
            scopeDecisionRow.selection_reason,
            scopeDecisionRow.selectionReason,
          ) || null,
        covered_sections: list(
          scopeDecisionRow.covered_sections ?? scopeDecisionRow.coveredSections,
        )
          .map(text)
          .filter(Boolean),
        fallback_from: fallbackScopeRow
          ? {
              section_title:
                firstText(
                  fallbackScopeRow.section_title,
                  fallbackScopeRow.sectionTitle,
                ) || null,
              line_start:
                typeof strictYear(fallbackScopeRow.line_start) === "number"
                  ? (strictYear(fallbackScopeRow.line_start) as number)
                  : null,
              line_end:
                typeof strictYear(fallbackScopeRow.line_end) === "number"
                  ? (strictYear(fallbackScopeRow.line_end) as number)
                  : null,
            }
          : null,
        fallback_reason:
          firstText(
            scopeDecisionRow.fallback_reason,
            scopeDecisionRow.fallbackReason,
          ) || null,
      },
      mapping_reliability:
        metaRow.mapping_reliability === "reduced" ? "reduced" : "normal",
      reference_extraction: {
        status:
          metaRow.reference_extraction &&
          object(metaRow.reference_extraction)?.status === "abandoned"
            ? "abandoned"
            : "completed",
        ...(firstText(object(metaRow.reference_extraction)?.reason)
          ? { reason: firstText(object(metaRow.reference_extraction)?.reason) }
          : {}),
      },
    },
    summary: firstText(value.summary, value.report_md),
    timeline,
    items,
    unresolved,
  };
  return { citation, unresolved: unresolved.length, ambiguous, conflicting };
}

function stableCitationBasis(
  citation: CitationAnalysisArtifact | null,
  references: SourceReference[],
) {
  if (!citation) return null;
  const tupleById = new Map(
    references.map((reference) => [
      reference.sourceReferenceId,
      referenceTuple(reference),
    ]),
  );
  return {
    ...citation,
    items: citation.items.map((item) => ({
      ...item,
      sourceReferenceId:
        tupleById.get(item.sourceReferenceId) || item.sourceReferenceId,
    })),
    timeline: Object.fromEntries(
      (["early", "mid", "recent"] as const).map((bucket) => [
        bucket,
        {
          ...citation.timeline[bucket],
          sourceReferenceIds: citation.timeline[bucket].sourceReferenceIds.map(
            (id) => tupleById.get(id) || id,
          ),
        },
      ]),
    ),
  };
}

function classifyConversion(
  input: LegacyArtifactSetInput,
  options: LiteratureArtifactMigrationConverterOptions = {},
): LiteratureArtifactMigrationConversion {
  const idFactory = options.idFactory || generateSourceReferenceId;
  const mentionIdFactory =
    options.mentionIdFactory || ((index) => `mention-${index + 1}`);
  const diagnostics: string[] = [];
  const reasons = new Set<LiteratureArtifactMigrationReasonCode>();
  const values = resolveLegacyValues(input);
  const legacyKinds = new Set(
    (input.legacyNotes || []).flatMap((note) =>
      note.payloads.flatMap((payload) =>
        payload.payloadType === "references-json"
          ? ["references"]
          : payload.payloadType === "citation-analysis-json"
            ? ["citation-analysis"]
            : [],
      ),
    ),
  );
  const canonicalKinds = new Set(
    (input.canonicalNotes || []).map((note) => note.noteKind),
  );
  for (const noteKind of canonicalKinds) {
    if (legacyKinds.has(noteKind)) {
      reasons.add("canonical_conflict");
      diagnostics.push(
        `canonical ${noteKind} note coexists with legacy ${noteKind} evidence`,
      );
    }
  }
  if (input.readErrors?.length) {
    reasons.add("damaged_input");
    diagnostics.push(...input.readErrors);
  }
  const unsupportedPayloadTypes = new Set<string>();
  const recordPayloadType = (value: unknown) => {
    const payloadType = text(value);
    if (
      payloadType &&
      payloadType !== "unknown" &&
      !MIGRATABLE_LEGACY_PAYLOAD_TYPES.has(payloadType)
    ) {
      unsupportedPayloadTypes.add(payloadType);
    }
  };
  for (const note of input.legacyNotes || []) {
    for (const payload of note.payloads) recordPayloadType(payload.payloadType);
    for (const payloadType of payloadMarkerTypes(note.html)) {
      recordPayloadType(payloadType);
    }
  }
  for (const content of [...(input.noteContents || []), input.noteContent]) {
    if (typeof content === "string") {
      for (const payloadType of payloadMarkerTypes(content)) {
        recordPayloadType(payloadType);
      }
    }
  }
  for (const payload of [
    ...(input.filePayloads || []),
    input.filePayload,
    input.legacyPayload,
  ]) {
    recordPayloadType(object(payload)?.payloadType);
  }
  if (unsupportedPayloadTypes.size) {
    reasons.add("unsupported_input");
    diagnostics.push(
      ...[...unsupportedPayloadTypes]
        .sort()
        .map(
          (payloadType) => `unsupported legacy payload type: ${payloadType}`,
        ),
    );
  }
  const originalReferenceCount = values.references.length;
  const citationValue = values.citation;
  const existing = (input.existingReferences || []).filter(
    (reference) => !!reference?.sourceReferenceId,
  );
  const citationHasExistingBasis =
    options.allowCitationOnlyWithExistingReferences === true &&
    existing.length > 0;
  const originalMentionCount = citationValue
    ? list(citationValue.mentions ?? citationValue.unmapped_mentions).length +
      list(citationValue.items).reduce(
        (count: number, item: unknown) =>
          count + list(object(item)?.mentions).length,
        0,
      )
    : 0;
  if (input.readOnly === true || input.writable === false)
    reasons.add("read_only_library");
  if (!originalReferenceCount && citationValue && !citationHasExistingBasis)
    reasons.add("citation_only");
  if (!originalReferenceCount && !citationValue) reasons.add("no_references");
  const references: SourceReference[] = [];
  const duplicateKeys = new Set<string>();
  let droppedCount = 0;
  for (const value of values.references) {
    const reference = makeSourceReference(value, idFactory, diagnostics);
    if (!reference) {
      droppedCount += 1;
      continue;
    }
    const identityKeys = [
      ...matchingKeys(reference),
      `tuple:${referenceTuple(reference)}`,
    ];
    if (identityKeys.some((key) => duplicateKeys.has(key))) {
      reasons.add("duplicate_reference");
      diagnostics.push("duplicate reference evidence");
    }
    identityKeys.forEach((key) => duplicateKeys.add(key));
    references.push(reference);
  }
  if (droppedCount) reasons.add("data_loss");
  const snapshots = citationValue
    ? list(citationValue.snapshots ?? citationValue.reference_snapshots)
    : [];
  let recoveredCount = 0;
  for (const snapshot of snapshots) {
    const matched = matchReference(snapshot, [...references, ...existing]);
    if (matched.conflicting) {
      reasons.add("conflicting_evidence");
      continue;
    }
    if (matched.ambiguous) {
      reasons.add("ambiguous_linkage");
      reasons.add("unresolved_linkage");
      continue;
    }
    if (matched.reference) continue;
    const recovered = makeSourceReference(snapshot, idFactory, diagnostics);
    if (!recovered) {
      reasons.add("unresolved_linkage");
      continue;
    }
    references.push(recovered);
    recoveredCount += 1;
    reasons.add("citation_snapshot_recovery");
  }
  const citationResult = citationValue
    ? normalizeCitation(
        citationValue,
        [...references, ...existing],
        diagnostics,
        mentionIdFactory,
      )
    : null;
  if (citationResult?.ambiguous) reasons.add("ambiguous_linkage");
  if (citationResult?.conflicting) reasons.add("conflicting_evidence");
  if ((citationResult?.unresolved || 0) > 0) reasons.add("unresolved_linkage");
  if (citationValue && !references.length && !citationHasExistingBasis)
    reasons.add("citation_only");
  if (
    reasons.has("citation_only") &&
    originalReferenceCount === 0 &&
    !citationHasExistingBasis
  ) {
    // A library Citation-only set is always blocked, even if its snapshot
    // could otherwise be recovered. Offline import passes a canonical parent
    // through a different adapter and may choose review_required explicitly.
    reasons.add("unsupported_input");
  }
  if (droppedCount && !reasons.has("data_loss")) reasons.add("data_loss");
  const basisInput = {
    sourceFacts: legacySourceFacts(input),
    canonicalSourceFacts: canonicalSourceFacts(input),
    references: references.map((reference) => ({
      extraction: reference.extraction,
      bibliography: reference.bibliography,
      matching: reference.matching,
    })),
    citation: stableCitationBasis(citationResult?.citation || null, [
      ...references,
      ...existing,
    ]),
  };
  const basisHash = hashText(stableJson(basisInput));
  let referencesArtifact: SourceReferenceArtifact = {
    schema: "source_reference_artifact.v1",
    references,
  };
  try {
    referencesArtifact = parseSourceReferenceArtifact(referencesArtifact);
  } catch {
    reasons.add("invalid_canonical_artifact");
    diagnostics.push(
      "converted References artifact failed contract validation",
    );
  }
  let citationArtifact = citationResult?.citation || null;
  if (citationArtifact) {
    try {
      citationArtifact = parseCitationAnalysisArtifact(citationArtifact);
    } catch {
      reasons.add("invalid_canonical_artifact");
      diagnostics.push(
        "converted Citation artifact failed contract validation",
      );
    }
  }
  const classification: LiteratureArtifactMigrationClassification =
    reasons.has("read_only_library") ||
    reasons.has("citation_only") ||
    reasons.has("unsupported_input") ||
    reasons.has("no_references") ||
    reasons.has("duplicate_reference") ||
    reasons.has("conflicting_evidence") ||
    reasons.has("damaged_input") ||
    reasons.has("data_loss") ||
    reasons.has("invalid_canonical_artifact") ||
    reasons.has("canonical_conflict")
      ? "blocked"
      : reasons.has("unresolved_linkage") ||
          reasons.has("ambiguous_linkage") ||
          reasons.has("citation_snapshot_recovery")
        ? "review_required"
        : "ready";
  return {
    classification,
    reasonCodes: [...reasons],
    diagnostics: boundedDiagnostics(diagnostics),
    references: referencesArtifact,
    citation: citationArtifact,
    basisHash,
    verifiedCount: references.length,
    unresolvedCount: citationResult?.unresolved || 0,
    recoveredCount,
    droppedCount,
    originalReferenceCount,
    originalMentionCount,
  };
}

export function convertLegacyArtifactSet(
  input: LegacyArtifactSetInput,
  options: LiteratureArtifactMigrationConverterOptions = {},
): LiteratureArtifactMigrationConversion {
  return classifyConversion(input, options);
}

export function classifyLegacyArtifactSet(
  input: LegacyArtifactSetInput,
  options: LiteratureArtifactMigrationConverterOptions = {},
): LiteratureArtifactMigrationConversion {
  return classifyConversion(input, options);
}

function nowIso() {
  return new Date().toISOString();
}

function newRuntimeId(prefix: string, idFactory: () => string): string {
  runtimeCounter += 1;
  const base =
    text(idFactory()) ||
    `${Date.now().toString(36)}-${runtimeCounter.toString(36)}`;
  return `${prefix}-${base}`;
}

function opaqueMigrationCursor(value: Record<string, unknown>): string {
  return encodeURIComponent(JSON.stringify(value));
}

function stateRunEntry(
  preview: LiteratureArtifactMigrationPreview,
  state: LiteratureArtifactMigrationRunEntry["state"],
  patch: Partial<LiteratureArtifactMigrationRunEntry> = {},
): LiteratureArtifactMigrationRunEntry {
  const timestamp = nowIso();
  return {
    runId: preview.runId,
    operationId: preview.operationId,
    migrationId: preview.migrationId,
    definitionVersion: preview.definitionVersion,
    libraryId: String(preview.libraryId),
    state,
    reason: "",
    processedCount: 0,
    remainingCount: preview.candidates.length,
    setCount: preview.candidates.length,
    createdAt: timestamp,
    updatedAt: timestamp,
    terminalAt: "",
    diagnostics: [],
    ...patch,
  };
}

function persistCandidate(
  runId: string,
  operationId: string,
  candidate: LiteratureArtifactMigrationCandidate,
  conversion: LiteratureArtifactMigrationConversion,
  outcome: LiteratureArtifactMigrationSetEntry["outcome"],
  diagnostics: string[] = [],
) {
  const timestamp = nowIso();
  upsertLiteratureArtifactMigrationSet({
    runId,
    candidateId: candidate.candidateId,
    operationId,
    ordinal: candidate.ordinal,
    parentRef: JSON.stringify(candidate.parentRef),
    refs: conversion.references.references.map(
      (reference) => reference.sourceReferenceId,
    ),
    basisHash: conversion.basisHash,
    classification: candidate.classification,
    outcome,
    reasonCodes: candidate.reasonCodes,
    verifiedCount: conversion.verifiedCount,
    unresolvedCount: conversion.unresolvedCount,
    recoveredCount: conversion.recoveredCount,
    droppedCount: conversion.droppedCount,
    createdAt: timestamp,
    updatedAt: timestamp,
    diagnostics: boundedDiagnostics(diagnostics),
  });
}

function failure(
  code: LiteratureArtifactMigrationFailureCode,
  message: string,
  extra: Partial<LiteratureArtifactMigrationFailure> = {},
): LiteratureArtifactMigrationFailure {
  return { ok: false, code, message, ...extra };
}

export function getLiteratureArtifactMigrationActiveSnapshot() {
  return runtimeActive ? { ...runtimeActive } : null;
}

export function resetLiteratureArtifactMigrationRuntimeForTests() {
  runtimePlans.clear();
  runtimeActive = null;
  runtimeCounter = 0;
}

function reconcileInterruptedRuns() {
  const activeStates = ["preview", "applying"] as const;
  for (const entry of listLiteratureArtifactMigrationRuns({
    states: [...activeStates],
    limit: 100,
  })) {
    const timestamp = nowIso();
    upsertLiteratureArtifactMigrationRun({
      ...entry,
      state: "failed",
      reason: "interrupted",
      terminalAt: timestamp,
      updatedAt: timestamp,
      diagnostics: boundedDiagnostics([
        ...entry.diagnostics,
        "restart_required_fresh_scan",
      ]),
    });
  }
}

export function createLiteratureArtifactMigrationService(
  options: LiteratureArtifactMigrationServiceOptions,
) {
  const idFactory = options.idFactory || generateSourceReferenceId;
  const candidateIdFactory =
    options.candidateIdFactory || ((ordinal: number) => `candidate-${ordinal}`);
  reconcileInterruptedRuns();

  async function scan(args: {
    libraryId: number;
    candidateIds?: string[];
    parentRefs?: MigrationPortableItemRef[];
  }): Promise<
    LiteratureArtifactMigrationPreview | LiteratureArtifactMigrationFailure
  > {
    const libraryId = args.libraryId;
    if (!Number.isSafeInteger(libraryId) || libraryId <= 0) {
      return failure("invalid_scope", "library scope is required");
    }
    if (runtimeActive) {
      return failure("busy", "another literature migration is active", {
        activeRunId: runtimeActive.runId,
      });
    }
    const operationId = newRuntimeId("literature-migration", idFactory);
    const runId = newRuntimeId("run", idFactory);
    runtimeActive = { runId, operationId, stopped: false, phase: "scanning" };
    const placeholder: LiteratureArtifactMigrationPreview = {
      ok: true,
      runId,
      operationId,
      migrationId: LITERATURE_ARTIFACT_MIGRATION_ID,
      definitionVersion: LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION,
      libraryId,
      candidates: [],
    };
    try {
      const inputs = await options.host.scanLibrary({
        libraryId,
        candidateIds: args.candidateIds,
        parentRefs: args.parentRefs,
      });
      const candidates: LiteratureArtifactMigrationCandidate[] = [];
      const runtimeCandidates = new Map<string, RuntimeCandidate>();
      inputs.forEach((input, index) => {
        const ordinal = index + 1;
        const candidateId = text(candidateIdFactory(ordinal));
        if (!candidateId || input.libraryId !== libraryId) return;
        const conversion = classifyConversion(input, { idFactory });
        const candidate = {
          classification: conversion.classification,
          reasonCodes: conversion.reasonCodes,
          diagnostics: conversion.diagnostics,
          verifiedCount: conversion.verifiedCount,
          unresolvedCount: conversion.unresolvedCount,
          recoveredCount: conversion.recoveredCount,
          droppedCount: conversion.droppedCount,
          originalReferenceCount: conversion.originalReferenceCount,
          originalMentionCount: conversion.originalMentionCount,
          candidateId,
          ordinal,
          parentRef: input.parentRef,
          libraryId,
          outcome: "preview" as const,
        } satisfies LiteratureArtifactMigrationCandidate;
        candidates.push(candidate);
        runtimeCandidates.set(candidateId, { candidate, conversion, input });
      });
      const preview = { ...placeholder, candidates };
      upsertLiteratureArtifactMigrationRun(stateRunEntry(preview, "preview"));
      candidates.forEach((candidate) =>
        persistCandidate(
          runId,
          operationId,
          candidate,
          runtimeCandidates.get(candidate.candidateId)!.conversion,
          "preview",
        ),
      );
      runtimePlans.set(operationId, {
        preview,
        candidates: runtimeCandidates,
        stopped: false,
      });
      runtimeActive = null;
      return preview;
    } catch (error) {
      upsertLiteratureArtifactMigrationRun(
        stateRunEntry(placeholder, "failed", {
          reason: "scan_failed",
          terminalAt: nowIso(),
          diagnostics: [`scan_failed:${migrationFailureCode(error)}`],
        }),
      );
      runtimeActive = null;
      return failure("stale_plan", "library scan failed");
    }
  }

  async function apply(args: {
    scanOperationId: string;
    candidateIds: string[];
    reviewAcceptedCandidateIds?: string[];
    migrationId?: string;
    definitionVersion?: number;
  }): Promise<
    LiteratureArtifactMigrationRunResult | LiteratureArtifactMigrationFailure
  > {
    const scanOperationId = text(args.scanOperationId);
    const plan = runtimePlans.get(scanOperationId);
    if (!plan)
      return failure(
        "fresh_scan_required",
        "migration preview is process-local and must be rescanned",
      );
    if (
      args.migrationId &&
      args.migrationId !== LITERATURE_ARTIFACT_MIGRATION_ID
    ) {
      return failure(
        "version_mismatch",
        "migration definition is not registered",
        { runId: plan.preview.runId },
      );
    }
    if (
      args.definitionVersion &&
      args.definitionVersion !==
        LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION
    ) {
      return failure(
        "version_mismatch",
        "migration definition version has changed",
        { runId: plan.preview.runId },
      );
    }
    if (runtimeActive) {
      return failure("busy", "another literature migration is active", {
        activeRunId: runtimeActive.runId,
      });
    }
    const requestedIds = [
      ...new Set((args.candidateIds || []).map(text).filter(Boolean)),
    ];
    const known = new Map(
      plan.preview.candidates.map((candidate) => [
        candidate.candidateId,
        candidate,
      ]),
    );
    if (requestedIds.some((candidateId) => !known.has(candidateId))) {
      return failure(
        "unknown_candidate",
        "candidate was not issued by the scan",
        { runId: plan.preview.runId },
      );
    }
    const entry = getLiteratureArtifactMigrationRun(plan.preview.runId);
    if (!entry)
      return failure("not_found", "migration run receipt is unavailable");
    const applyOperationId = newRuntimeId(
      "literature-migration-apply",
      idFactory,
    );
    runtimeActive = {
      runId: plan.preview.runId,
      operationId: applyOperationId,
      stopped: false,
      phase: "applying",
    };
    const acceptedReview = new Set(
      (args.reviewAcceptedCandidateIds || []).map(text),
    );
    const selected = requestedIds.map((candidateId) => known.get(candidateId)!);
    const blocked = selected.filter(
      (candidate) => candidate.classification === "blocked",
    );
    const skippedReview = selected.filter(
      (candidate) =>
        candidate.classification === "review_required" &&
        !acceptedReview.has(candidate.candidateId),
    );
    const receiptOperationId = (
      candidate: LiteratureArtifactMigrationCandidate,
    ) =>
      newRuntimeId(`literature-migration-set-${candidate.ordinal}`, idFactory);
    for (const candidate of blocked) {
      const runtimeCandidate = plan.candidates.get(candidate.candidateId);
      if (runtimeCandidate) {
        persistCandidate(
          plan.preview.runId,
          receiptOperationId(candidate),
          candidate,
          runtimeCandidate.conversion,
          "blocked",
          ["blocked_candidate_requires_no_force_apply"],
        );
      }
    }
    for (const candidate of skippedReview) {
      const runtimeCandidate = plan.candidates.get(candidate.candidateId);
      if (runtimeCandidate) {
        persistCandidate(
          plan.preview.runId,
          receiptOperationId(candidate),
          candidate,
          runtimeCandidate.conversion,
          "skipped",
          ["review_confirmation_required"],
        );
      }
    }
    const toApply = selected.filter(
      (candidate) =>
        candidate.classification !== "blocked" &&
        !skippedReview.includes(candidate),
    );
    upsertLiteratureArtifactMigrationRun({
      ...entry,
      state: "applying",
      operationId: applyOperationId,
      updatedAt: nowIso(),
    });
    let processedCount = blocked.length + skippedReview.length;
    let remainingCount = plan.preview.candidates.length - processedCount;
    let attention = blocked.length > 0 || skippedReview.length > 0;
    let reason = blocked.length
      ? "blocked_candidate"
      : skippedReview.length
        ? "review_required"
        : "";
    try {
      for (const candidate of toApply) {
        if (runtimeActive?.stopped || plan.stopped) {
          attention = true;
          reason = "user_stopped";
          break;
        }
        const runtimeCandidate = plan.candidates.get(candidate.candidateId);
        if (!runtimeCandidate)
          throw new Error("candidate input is no longer available");
        const setOperationId = receiptOperationId(candidate);
        const applied = await options.host.applySet({
          libraryId: plan.preview.libraryId,
          parentRef: candidate.parentRef,
          candidate: { ...candidate, conversion: runtimeCandidate.conversion },
          operationId: setOperationId,
        });
        processedCount += 1;
        remainingCount = Math.max(
          0,
          plan.preview.candidates.length - processedCount,
        );
        if (applied.outcome === "repair_required") {
          persistCandidate(
            plan.preview.runId,
            setOperationId,
            candidate,
            runtimeCandidate.conversion,
            "repair_required",
            applied.diagnostics || [
              applied.reason || "cleanup requires repair",
            ],
          );
          attention = true;
          reason = reason || "repair_required";
        } else if (applied.outcome === "changed_since_scan") {
          persistCandidate(
            plan.preview.runId,
            setOperationId,
            candidate,
            runtimeCandidate.conversion,
            "changed_since_scan",
            applied.diagnostics || [applied.reason || "changed_since_scan"],
          );
          attention = true;
          reason = reason || "changed_since_scan";
        } else {
          persistCandidate(
            plan.preview.runId,
            setOperationId,
            candidate,
            runtimeCandidate.conversion,
            "applied",
            applied.diagnostics,
          );
        }
        const current = getLiteratureArtifactMigrationRun(plan.preview.runId);
        if (current) {
          upsertLiteratureArtifactMigrationRun({
            ...current,
            state: "applying",
            operationId: applyOperationId,
            processedCount,
            remainingCount,
            updatedAt: nowIso(),
          });
        }
      }
    } catch (error) {
      const current = getLiteratureArtifactMigrationRun(plan.preview.runId);
      if (current) {
        upsertLiteratureArtifactMigrationRun({
          ...current,
          state: "failed",
          reason: "apply_failed",
          processedCount,
          remainingCount,
          terminalAt: nowIso(),
          updatedAt: nowIso(),
          diagnostics: boundedDiagnostics([
            ...(current.diagnostics || []),
            `apply_failed:${migrationFailureCode(error)}`,
          ]),
        });
      }
      runtimePlans.delete(scanOperationId);
      runtimeActive = null;
      return failure("stale_plan", "migration apply failed", {
        runId: plan.preview.runId,
      });
    }
    const finalState =
      reason === "user_stopped" || attention
        ? "completed_with_attention"
        : "completed";
    const current = getLiteratureArtifactMigrationRun(plan.preview.runId);
    if (current) {
      upsertLiteratureArtifactMigrationRun({
        ...current,
        operationId: applyOperationId,
        state: finalState,
        reason,
        processedCount,
        remainingCount,
        terminalAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    runtimePlans.delete(scanOperationId);
    runtimeActive = null;
    return {
      ok: true,
      runId: plan.preview.runId,
      operationId: applyOperationId,
      state: finalState,
      reason,
      processedCount,
      remainingCount,
      setCount: plan.preview.candidates.length,
    };
  }

  function stop(args: {
    runId: string;
  }): { ok: true } | LiteratureArtifactMigrationFailure {
    const runId = text(args.runId);
    if (!runtimeActive || runtimeActive.runId !== runId)
      return failure("not_found", "migration run is not active", { runId });
    runtimeActive.stopped = true;
    const plan = [...runtimePlans.values()].find(
      (entry) => entry.preview.runId === runId,
    );
    if (plan) plan.stopped = true;
    return { ok: true };
  }

  async function continueRun(args: {
    runId: string;
    candidateIds?: string[];
  }): Promise<
    LiteratureArtifactMigrationPreview | LiteratureArtifactMigrationFailure
  > {
    const previous = getLiteratureArtifactMigrationRun(text(args.runId));
    if (!previous)
      return failure("not_found", "migration run receipt is unavailable", {
        runId: args.runId,
      });
    const libraryId = Number(previous.libraryId);
    if (!Number.isSafeInteger(libraryId) || libraryId <= 0) {
      return failure("invalid_scope", "stored library scope is invalid", {
        runId: args.runId,
      });
    }
    const requestedIds = new Set(
      (args.candidateIds || []).map(text).filter(Boolean),
    );
    const retryableOutcomes = new Set([
      "preview",
      "skipped",
      "changed_since_scan",
      "repair_required",
      "failed",
    ]);
    const parentRefs: MigrationPortableItemRef[] = [];
    const seenParentRefs = new Set<string>();
    let receiptCursor: string | undefined;
    for (;;) {
      const page = listReceiptsPage({
        runId: previous.runId,
        limit: 100,
        ...(receiptCursor ? { cursor: receiptCursor } : {}),
      });
      for (const receipt of page.items) {
        if (
          !retryableOutcomes.has(receipt.outcome) ||
          (requestedIds.size && !requestedIds.has(receipt.candidateId))
        ) {
          continue;
        }
        try {
          const value = JSON.parse(receipt.parentRef) as Record<
            string,
            unknown
          >;
          if (
            typeof value.libraryId === "number" &&
            Number.isSafeInteger(value.libraryId) &&
            value.libraryId > 0 &&
            typeof value.key === "string" &&
            value.key.length > 0
          ) {
            const key = `${value.libraryId}:${value.key}`;
            if (!seenParentRefs.has(key)) {
              seenParentRefs.add(key);
              parentRefs.push({ libraryId: value.libraryId, key: value.key });
            }
          }
        } catch {
          // A damaged receipt is retained for history but cannot be retried.
        }
      }
      if (!page.nextCursor || page.nextCursor === receiptCursor) break;
      receiptCursor = page.nextCursor;
    }
    return scan({ libraryId, parentRefs });
  }

  function getRun(runId: string) {
    return getLiteratureArtifactMigrationRun(runId);
  }

  function getPreview(operationId: string) {
    return runtimePlans.get(text(operationId))?.preview || null;
  }

  function getPreviewForRun(runId: string) {
    const normalizedRunId = text(runId);
    return (
      [...runtimePlans.values()].find(
        (plan) => plan.preview.runId === normalizedRunId,
      )?.preview || null
    );
  }

  function listHistory(
    options: { libraryId?: number; limit?: number; cursor?: string } = {},
  ) {
    return listLiteratureArtifactMigrationRuns(options);
  }

  function listHistoryPage(
    options: { libraryId?: number; limit?: number; cursor?: string } = {},
  ) {
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
    const items = listHistory({ ...options, limit });
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        items.length === limit && last
          ? opaqueMigrationCursor({
              updatedAt: last.updatedAt,
              runId: last.runId,
            })
          : null,
    };
  }

  function listReceipts(options: {
    runId: string;
    limit?: number;
    cursor?: string;
  }) {
    return listLiteratureArtifactMigrationSets(options);
  }

  function listReceiptsPage(options: {
    runId: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
    const items = listReceipts({ ...options, limit });
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        items.length === limit && last
          ? opaqueMigrationCursor({ ordinal: last.ordinal })
          : null,
    };
  }

  return {
    scan,
    apply,
    stop,
    continue: continueRun,
    getRun,
    getPreview,
    getPreviewForRun,
    listHistory,
    listHistoryPage,
    listReceipts,
    listReceiptsPage,
    getActiveSnapshot: getLiteratureArtifactMigrationActiveSnapshot,
  };
}

export type LiteratureArtifactMigrationService = ReturnType<
  typeof createLiteratureArtifactMigrationService
>;

let configuredLiteratureArtifactMigrationService: LiteratureArtifactMigrationService | null =
  null;

/**
 * The production adapter is supplied by the Broker owner. Keeping this seam
 * explicit prevents the Dashboard from manufacturing host plans or falling
 * back to a storage-shaped fake when the capability is unavailable.
 */
export function configureLiteratureArtifactMigrationHost(
  host: LiteratureArtifactMigrationHost | null,
) {
  configuredLiteratureArtifactMigrationService = host
    ? createLiteratureArtifactMigrationService({ host })
    : null;
}

export function getLiteratureArtifactMigrationService() {
  return configuredLiteratureArtifactMigrationService;
}
