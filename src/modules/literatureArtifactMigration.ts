import {
  generateSourceReferenceId,
  type CitationAnalysisArtifact,
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
import {
  convertLegacyArtifactSet,
  MIGRATABLE_LEGACY_PAYLOAD_TYPES,
  resolveLiteratureArtifactMigrationConversion,
  type LegacyArtifactSetInput,
  type LiteratureArtifactMigrationConversion,
  type LiteratureArtifactMigrationReasonCode,
  type LiteratureArtifactMigrationResolutionKind,
} from "./literatureArtifactMigration/converter";

export const LITERATURE_ARTIFACT_MIGRATION_ID = "literature-artifacts" as const;
export const LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION = 4 as const;

export type MigrationPortableItemRef = PortableItemRef;

export type LiteratureArtifactMigrationCandidateDisposition =
  | "pending"
  | "include"
  | "skip";

export type LiteratureArtifactMigrationIssueOption = {
  optionId: string;
  kind: LiteratureArtifactMigrationResolutionKind;
  dataLoss: boolean;
};

export type LiteratureArtifactMigrationIssue = {
  issueId: string;
  reasonCode: LiteratureArtifactMigrationReasonCode;
  status: "pending" | "resolved";
  detail: string;
  options: LiteratureArtifactMigrationIssueOption[];
  selectedOptionId: string;
};

export type LiteratureArtifactMigrationCandidateQuery = {
  search?: string;
  classification?: "ready" | "review_required" | "blocked";
  reasonCode?: string;
  disposition?: LiteratureArtifactMigrationCandidateDisposition;
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
  title: string;
  parentRef: MigrationPortableItemRef;
  libraryId: number;
  disposition: LiteratureArtifactMigrationCandidateDisposition;
  issues: LiteratureArtifactMigrationIssue[];
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
  baseConversion: LiteratureArtifactMigrationConversion;
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
  | "stopped"
  | "fresh_scan_required"
  | "stale_plan"
  | "version_mismatch"
  | "unknown_candidate"
  | "unknown_issue"
  | "unknown_resolution"
  | "candidate_not_selectable"
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

export type LiteratureArtifactMigrationScanProgress = {
  completed: number;
  total: number | null;
  candidateCount: number;
};

export type LiteratureArtifactMigrationHost = {
  scanLibrary: (args: {
    libraryId: number;
    candidateIds?: string[];
    parentRefs?: MigrationPortableItemRef[];
    reportProgress?: (
      progress: LiteratureArtifactMigrationScanProgress,
    ) => boolean;
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

type LegacyMigrationNote = NonNullable<
  LegacyArtifactSetInput["legacyNotes"]
>[number];
type CanonicalMigrationNote = NonNullable<
  LegacyArtifactSetInput["canonicalNotes"]
>[number];

function hasLegacyPayloadMarker(html: string) {
  return /data-zs-payload\s*=\s*(["']?)(?:references-json|citation-analysis-json)\1/iu.test(
    html,
  );
}

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
    reportProgress?: (
      progress: LiteratureArtifactMigrationScanProgress,
    ) => boolean;
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
  let completed = 0;
  scanPages: for (;;) {
    const page = await library.listItems(
      {
        libraryId: args.libraryId,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      },
      hostControl,
    );
    const total = Number.isFinite(page.totalScanned)
      ? Math.max(completed, page.totalScanned)
      : null;
    const shouldContinue = () =>
      args.reportProgress?.({
        completed,
        total,
        candidateCount: inputs.length,
      }) !== false;
    if (!shouldContinue()) break;
    for (const item of page.items) {
      if (!shouldContinue()) break scanPages;
      completed += 1;
      if (item.kind !== "regular") {
        if (!shouldContinue()) break scanPages;
        continue;
      }
      const parentRef = item.ref;
      if (
        requestedParents.size &&
        !requestedParents.has(`${parentRef.libraryId}:${parentRef.key}`)
      ) {
        if (!shouldContinue()) break scanPages;
        continue;
      }
      const input = await readLegacyParentSet(
        library,
        control,
        parentRef,
        hostControl,
      );
      if (input) {
        inputs.push({
          ...input,
          parentTitle: text(item.title),
          ...(writable === undefined ? {} : { writable }),
        });
      }
      if (!shouldContinue()) break scanPages;
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
    scanLibrary: ({ libraryId, parentRefs, reportProgress }) =>
      scanLegacyLibrary(
        library,
        localControl,
        { libraryId, parentRefs, reportProgress },
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
      const refreshed = convertLegacyArtifactSet(current);
      if (refreshed.basisHash !== candidate.conversion.basisHash) {
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
  selectedCandidateIds: Set<string>;
  stopped: boolean;
};

type RuntimeActive = {
  runId: string;
  operationId: string;
  stopped: boolean;
  phase: "scanning" | "preview" | "applying";
  progress?: LiteratureArtifactMigrationScanProgress;
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

function boundedDiagnostics(values: unknown[]): string[] {
  return values.map(text).filter(Boolean).slice(0, 20);
}

function issueOptionKinds(
  reasonCode: LiteratureArtifactMigrationReasonCode,
): LiteratureArtifactMigrationResolutionKind[] {
  if (reasonCode === "duplicate_reference") {
    return ["merge_duplicates", "skip_candidate"];
  }
  if (
    reasonCode === "unresolved_linkage" ||
    reasonCode === "ambiguous_linkage"
  ) {
    return ["keep_unresolved", "drop_unresolved", "skip_candidate"];
  }
  if (reasonCode === "citation_snapshot_recovery") {
    return ["accept_recovery", "skip_candidate"];
  }
  if (reasonCode === "canonical_conflict") {
    return ["replace_canonical", "skip_candidate"];
  }
  if (reasonCode === "unsupported_input") {
    return ["preserve_source", "skip_candidate"];
  }
  if (reasonCode === "data_loss") {
    return ["accept_data_loss", "skip_candidate"];
  }
  return ["skip_candidate"];
}

function issuesForConversion(
  conversion: LiteratureArtifactMigrationConversion,
): LiteratureArtifactMigrationIssue[] {
  return conversion.reasonCodes.map((reasonCode, index) => ({
    issueId: `issue-${index + 1}-${reasonCode}`,
    reasonCode,
    status: "pending",
    detail: reasonCode,
    options: issueOptionKinds(reasonCode).map((kind, optionIndex) => ({
      optionId: `option-${index + 1}-${optionIndex + 1}-${kind}`,
      kind,
      dataLoss: kind === "drop_unresolved" || kind === "accept_data_loss",
    })),
    selectedOptionId: "",
  }));
}

function affectedItemsForIssue(
  conversion: LiteratureArtifactMigrationConversion,
  reasonCode: string,
): Array<{ label: string; hint?: string }> | undefined {
  if (
    reasonCode === "unresolved_linkage" ||
    reasonCode === "ambiguous_linkage"
  ) {
    const mentions = (conversion.citation?.unresolved || []).filter(
      (mention) => mention.reason === reasonCode,
    );
    if (!mentions.length) return undefined;
    return mentions.map((mention) => {
      const snippet = text(mention.snippet);
      const label =
        text(mention.marker) ||
        (snippet.length > 80 ? `${snippet.slice(0, 80)}…` : snippet);
      const hint = [
        mention.ref_number_hint === null ? "" : `#${mention.ref_number_hint}`,
        mention.year_hint === null ? "" : String(mention.year_hint),
        text(mention.surname_hint),
      ]
        .filter(Boolean)
        .join(" · ");
      return hint ? { label, hint } : { label };
    });
  }
  const recorded = conversion.issueItems[reasonCode];
  return recorded?.length ? recorded : undefined;
}

function applyRuntimeCandidateResolutions(runtimeCandidate: RuntimeCandidate) {
  const selectedOptions = runtimeCandidate.candidate.issues.flatMap((issue) => {
    const option = issue.options.find(
      (entry) => entry.optionId === issue.selectedOptionId,
    );
    return option && option.kind !== "skip_candidate"
      ? [{ reasonCode: issue.reasonCode, kind: option.kind }]
      : [];
  });
  const conversion = resolveLiteratureArtifactMigrationConversion(
    runtimeCandidate.baseConversion,
    selectedOptions,
  );
  runtimeCandidate.conversion = conversion;
  Object.assign(runtimeCandidate.candidate, {
    classification: conversion.classification,
    reasonCodes: conversion.reasonCodes,
    diagnostics: conversion.diagnostics,
    verifiedCount: conversion.verifiedCount,
    unresolvedCount: conversion.unresolvedCount,
    recoveredCount: conversion.recoveredCount,
    droppedCount: conversion.droppedCount,
  });
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

function migrationCursorOrdinal(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const value = JSON.parse(decodeURIComponent(cursor)) as {
      ordinal?: unknown;
    };
    const ordinal = Number(value.ordinal || 0);
    return Number.isSafeInteger(ordinal) && ordinal > 0 ? ordinal : 0;
  } catch {
    return 0;
  }
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
    runtimeActive = {
      runId,
      operationId,
      stopped: false,
      phase: "scanning",
      progress: { completed: 0, total: null, candidateCount: 0 },
    };
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
        reportProgress: (progress) => {
          if (
            !runtimeActive ||
            runtimeActive.runId !== runId ||
            runtimeActive.phase !== "scanning" ||
            runtimeActive.stopped
          ) {
            return false;
          }
          const reportedTotal =
            progress.total === null
              ? null
              : Math.max(0, Math.floor(progress.total));
          const previous = runtimeActive.progress || {
            completed: 0,
            total: null,
            candidateCount: 0,
          };
          const total =
            previous.total === null
              ? reportedTotal
              : reportedTotal === null
                ? previous.total
                : Math.max(previous.total, reportedTotal);
          runtimeActive.progress = {
            completed: Math.max(
              previous.completed,
              Math.min(Math.floor(progress.completed), total ?? Infinity),
            ),
            total,
            candidateCount: Math.max(
              previous.candidateCount,
              Math.floor(progress.candidateCount),
            ),
          };
          return true;
        },
      });
      if (runtimeActive?.runId === runId && runtimeActive.stopped) {
        upsertLiteratureArtifactMigrationRun(
          stateRunEntry(placeholder, "failed", {
            reason: "user_stopped",
            terminalAt: nowIso(),
            diagnostics: ["scan_stopped"],
          }),
        );
        runtimeActive = null;
        return failure("stopped", "library scan was stopped", { runId });
      }
      const candidates: LiteratureArtifactMigrationCandidate[] = [];
      const runtimeCandidates = new Map<string, RuntimeCandidate>();
      inputs.forEach((input, index) => {
        const ordinal = index + 1;
        const candidateId = text(candidateIdFactory(ordinal));
        if (!candidateId || input.libraryId !== libraryId) return;
        const conversion = convertLegacyArtifactSet(input, { idFactory });
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
          title: text(input.parentTitle),
          parentRef: input.parentRef,
          libraryId,
          disposition:
            conversion.classification === "ready" ? "include" : "pending",
          issues: issuesForConversion(conversion),
          outcome: "preview" as const,
        } satisfies LiteratureArtifactMigrationCandidate;
        candidates.push(candidate);
        runtimeCandidates.set(candidateId, {
          candidate,
          baseConversion: conversion,
          conversion,
          input,
        });
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
        selectedCandidateIds: new Set(
          candidates
            .filter((candidate) => candidate.classification === "ready")
            .map((candidate) => candidate.candidateId),
        ),
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
    candidateIds?: string[];
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
    const requestedIds =
      args.candidateIds === undefined
        ? [...plan.selectedCandidateIds]
        : [...new Set(args.candidateIds.map(text).filter(Boolean))];
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
    const selected = requestedIds.map((candidateId) => known.get(candidateId)!);
    const blocked = selected.filter(
      (candidate) => candidate.classification === "blocked",
    );
    const skippedReview = selected.filter(
      (candidate) => candidate.classification === "review_required",
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

  function resolveCandidateIssue(args: {
    scanOperationId: string;
    candidateId: string;
    issueId: string;
    optionId: string;
  }): { ok: true } | LiteratureArtifactMigrationFailure {
    const plan = runtimePlans.get(text(args.scanOperationId));
    if (!plan) {
      return failure(
        "fresh_scan_required",
        "migration preview is process-local and must be rescanned",
      );
    }
    const runtimeCandidate = plan.candidates.get(text(args.candidateId));
    if (!runtimeCandidate) {
      return failure(
        "unknown_candidate",
        "candidate was not issued by the scan",
        {
          runId: plan.preview.runId,
        },
      );
    }
    const issue = runtimeCandidate.candidate.issues.find(
      (entry) => entry.issueId === text(args.issueId),
    );
    if (!issue) {
      return failure("unknown_issue", "issue was not issued by the scan", {
        runId: plan.preview.runId,
      });
    }
    const option = issue.options.find(
      (entry) => entry.optionId === text(args.optionId),
    );
    if (!option) {
      return failure(
        "unknown_resolution",
        "resolution was not issued for this issue",
        { runId: plan.preview.runId },
      );
    }
    issue.selectedOptionId = option.optionId;
    issue.status = "resolved";
    plan.selectedCandidateIds.delete(runtimeCandidate.candidate.candidateId);
    runtimeCandidate.candidate.disposition =
      runtimeCandidate.candidate.issues.some(
        (entry) =>
          entry.options.find(
            (candidateOption) =>
              candidateOption.optionId === entry.selectedOptionId,
          )?.kind === "skip_candidate",
      )
        ? "skip"
        : "pending";
    applyRuntimeCandidateResolutions(runtimeCandidate);
    return { ok: true };
  }

  function setCandidateSelection(args: {
    scanOperationId: string;
    candidateId: string;
    selected: boolean;
  }): { ok: true } | LiteratureArtifactMigrationFailure {
    const plan = runtimePlans.get(text(args.scanOperationId));
    if (!plan) {
      return failure(
        "fresh_scan_required",
        "migration preview is process-local and must be rescanned",
      );
    }
    const candidateId = text(args.candidateId);
    const candidate = plan.candidates.get(candidateId)?.candidate;
    if (!candidate) {
      return failure(
        "unknown_candidate",
        "candidate was not issued by the scan",
        {
          runId: plan.preview.runId,
        },
      );
    }
    if (
      args.selected &&
      (candidate.classification !== "ready" ||
        candidate.issues.some((issue) => issue.status !== "resolved"))
    ) {
      return failure(
        "candidate_not_selectable",
        "candidate issues must be resolved before approval",
        { runId: plan.preview.runId },
      );
    }
    if (args.selected) {
      plan.selectedCandidateIds.add(candidateId);
      candidate.disposition = "include";
    } else {
      plan.selectedCandidateIds.delete(candidateId);
      candidate.disposition = "skip";
    }
    return { ok: true };
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

  function listCandidatePage(options: {
    runId: string;
    limit?: number;
    cursor?: string;
    query?: LiteratureArtifactMigrationCandidateQuery;
  }) {
    const plan = [...runtimePlans.values()].find(
      (entry) => entry.preview.runId === text(options.runId),
    );
    const run = getLiteratureArtifactMigrationRun(options.runId);
    const limit = Math.min(25, Math.max(1, Math.floor(options.limit || 25)));
    if (plan) {
      const search = text(options.query?.search).toLocaleLowerCase();
      const filtered = [...plan.candidates.values()]
        .filter(
          (entry) =>
            (!search ||
              entry.candidate.title.toLocaleLowerCase().includes(search)) &&
            (!options.query?.classification ||
              entry.candidate.classification ===
                options.query.classification) &&
            (!options.query?.reasonCode ||
              entry.candidate.issues.some(
                (issue) => issue.reasonCode === options.query?.reasonCode,
              )) &&
            (!options.query?.disposition ||
              entry.candidate.disposition === options.query.disposition),
        )
        .sort(
          (left, right) => left.candidate.ordinal - right.candidate.ordinal,
        );
      const afterOrdinal = migrationCursorOrdinal(options.cursor);
      const nextIndex = afterOrdinal
        ? filtered.findIndex((entry) => entry.candidate.ordinal > afterOrdinal)
        : 0;
      const start = nextIndex < 0 ? filtered.length : nextIndex;
      const slice = filtered.slice(start, start + limit);
      const last = slice.at(-1);
      const summary = {
        total: filtered.length,
        unfilteredTotal: plan.candidates.size,
        ready: filtered.filter(
          (entry) => entry.candidate.classification === "ready",
        ).length,
        reviewRequired: filtered.filter(
          (entry) => entry.candidate.classification === "review_required",
        ).length,
        blocked: filtered.filter(
          (entry) => entry.candidate.classification === "blocked",
        ).length,
        selected: plan.selectedCandidateIds.size,
      };
      return {
        items: slice.map((entry) => {
          const candidate = entry.candidate;
          return {
            candidateId: candidate.candidateId,
            ordinal: candidate.ordinal,
            title: candidate.title,
            classification: candidate.classification,
            outcome: candidate.outcome,
            reasonCodes: candidate.reasonCodes,
            verifiedCount: candidate.verifiedCount,
            unresolvedCount: candidate.unresolvedCount,
            recoveredCount: candidate.recoveredCount,
            droppedCount: candidate.droppedCount,
            selected: candidate.disposition === "include",
            disposition: candidate.disposition,
            issues: candidate.issues.map((issue) => ({
              ...issue,
              affectedItems: affectedItemsForIssue(
                entry.conversion,
                issue.reasonCode,
              ),
            })),
          };
        }),
        nextCursor:
          start + slice.length < filtered.length && last
            ? opaqueMigrationCursor({ ordinal: last.candidate.ordinal })
            : null,
        summary,
        availableReasons: [
          ...new Set(
            [...plan.candidates.values()].flatMap((entry) =>
              entry.candidate.issues.map((issue) => issue.reasonCode),
            ),
          ),
        ].sort(),
      };
    }
    const page = listReceiptsPage({ ...options, limit });
    return {
      items: page.items.map((receipt) => {
        return {
          candidateId: receipt.candidateId,
          ordinal: receipt.ordinal,
          title: "",
          classification: receipt.classification,
          outcome: receipt.outcome,
          reasonCodes: receipt.reasonCodes,
          verifiedCount: receipt.verifiedCount,
          unresolvedCount: receipt.unresolvedCount,
          recoveredCount: receipt.recoveredCount,
          droppedCount: receipt.droppedCount,
          selected: false,
          disposition: "pending" as const,
          issues: [],
        };
      }),
      nextCursor: page.nextCursor,
      summary: {
        total: run?.setCount || 0,
        unfilteredTotal: run?.setCount || 0,
        ready: 0,
        reviewRequired: 0,
        blocked: 0,
        selected: 0,
      },
      availableReasons: [],
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
    resolveCandidateIssue,
    setCandidateSelection,
    listHistory,
    listHistoryPage,
    listReceipts,
    listReceiptsPage,
    listCandidatePage,
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
