import {
  rebuildSynthesisHostItemRef,
  type SynthesisHostItemRef,
} from "./itemRef";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
import {
  assertSynthesisExactFields,
  SynthesisClientError,
  toSynthesisJsonObject,
} from "./common";
import { byteLengthSynthesisContractText } from "./canonicalJson";

export type SynthesisTagVocabularyEntry = {
  tag: string;
  facet: string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases?: string[];
  abbrev?: string[];
  usage_count?: number;
  last_synced_at?: string;
};

export type SynthesisTagProtocol = {
  version: string;
  tag_pattern: string;
  max_tag_length: number;
  facets: string[];
};

export type SynthesisTagValidationWarning = {
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
};

export type SynthesisTagVocabularySnapshot = {
  entries: SynthesisTagVocabularyEntry[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: SynthesisTagProtocol;
  manifest: SynthesisTagManifest;
  validation_warnings: SynthesisTagValidationWarning[];
};

export type TagVocabularyRegulatorExportDto = {
  vocabularyHash: string;
  allowedTags: string[];
};

export function rebuildTagVocabularyRegulatorExportDto(
  value: unknown,
): TagVocabularyRegulatorExportDto {
  const result = toSynthesisJsonObject(value, "tagVocabularyRegulatorExport");
  assertSynthesisExactFields(
    result,
    ["vocabularyHash", "allowedTags"],
    [],
    "tagVocabularyRegulatorExport",
  );
  if (
    typeof result.vocabularyHash !== "string" ||
    !result.vocabularyHash.trim() ||
    result.vocabularyHash.length > 256 ||
    !Array.isArray(result.allowedTags) ||
    result.allowedTags.length > 100_000 ||
    result.allowedTags.some(
      (tag) => typeof tag !== "string" || !tag.trim() || tag.length > 200,
    ) ||
    byteLengthSynthesisContractText(JSON.stringify(result)) > 16 * 1024 * 1024
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Tag regulator vocabulary export is invalid",
      { location: "tagVocabularyRegulatorExport" },
    );
  }
  return result as unknown as TagVocabularyRegulatorExportDto;
}

export const SYNTHESIS_TAG_AUDIT_APPEND_MAX_ROWS = 500 as const;
export const SYNTHESIS_TAG_AUDIT_ROW_MAX_TAGS = 100 as const;
export const SYNTHESIS_TAG_AUDIT_APPEND_MAX_BYTES = 8 * 1024 * 1024;

export type TagAuditRunRequestDto = {
  libraryId: number;
  vocabularyHash: string;
};

export type TagAuditStagingEntry = {
  target: SynthesisHostItemRef;
  auditedRevision: string;
  auditedTagDigest: string;
  auditedTags: string[];
  evaluation:
    | { state: "compliant" }
    | { state: "needs_regulation"; nonCompliantTags: string[] };
};

export type TagAuditSnapshotSummaryDto = {
  schema: "zotero-agents.tag-audit-snapshot.v1";
  libraryId: number;
  snapshotRevision: string;
  vocabularyHash: string;
  basisDigest: string;
  coverageDigest: string;
  auditedItems: number;
  needsRegulation: number;
  publishedAt: string;
  updatedAt: string;
};

export type TagAuditRunResultDto =
  | { outcome: "published"; snapshot: TagAuditSnapshotSummaryDto }
  | { outcome: "canceled"; auditedItems: number }
  | {
      outcome: "resource_limited";
      auditedItems: number;
      limit: "items" | "pages" | "duration";
    }
  | {
      outcome: "conflicted";
      auditedItems: number;
      conflictCount: number;
      conflicts: Array<{
        target: SynthesisHostItemRef;
        auditedRevision: string;
        currentRevision: string;
      }>;
      retryable: true;
    };

export type TagAuditExecutionIdentityDto = {
  hostInstanceId: string;
  principal: {
    packageId: string;
    workflowId: string;
    contentDigest: string;
  };
};

export type TagAuditRunHandleDto = {
  auditRunId: string;
  leaseToken: string;
};

export type TagAuditRunBeginRequestDto = TagAuditRunRequestDto & {
  executionIdentity: TagAuditExecutionIdentityDto;
  activeRunIds?: string[];
};

export type TagAuditRunBeginResultDto = {
  outcome: "ready";
  run: TagAuditRunHandleDto;
};

export type TagAuditRunAppendRequestDto = {
  run: TagAuditRunHandleDto;
  sequence: number;
  batchDigest: string;
  entries: TagAuditStagingEntry[];
};

export type TagAuditRunAppendResultDto = {
  outcome: "appended" | "already_appended";
  stagedItems: number;
};

export type TagAuditRunPromoteRequestDto = {
  run: TagAuditRunHandleDto;
  visitedItems: number;
  coverageDigest: string;
  evidenceId: string;
};

export type TagAuditRunAbortRequestDto = {
  run: TagAuditRunHandleDto;
  reason: "canceled" | "resource_limited" | "conflicted" | "failed";
};

export type TagAuditRunAbortResultDto = {
  outcome: "aborted" | "already_terminal";
};

export type TagRegulationAcknowledgementPrepareRequestDto = {
  target: SynthesisHostItemRef;
  receiptId: string;
};

export type TagRegulationAcknowledgementPrepareResultDto =
  | {
      outcome: "ready";
      target: SynthesisHostItemRef;
      snapshotRevision: string;
      auditedRevision: string;
      vocabularyHash: string;
      nonCompliantTags: string[];
    }
  | { outcome: "already_acknowledged"; snapshotRevision: string }
  | { outcome: "not_found" };

export type TagRegulationVerifiedCommitDto = {
  schema: "zotero-agents.tag-regulation-verified-commit.v1";
  target: SynthesisHostItemRef;
  receiptId: string;
  expectedSnapshotRevision: string;
  auditedRevision: string;
  currentRevision: string;
  finalTagDigest: string;
  finalTags: string[];
  vocabularyHash: string;
};

export type TagRegulationAcknowledgementResultDto =
  | {
      outcome: "acknowledged";
      snapshotRevision: string;
      remainingNeedsRegulation: number;
    }
  | { outcome: "already_acknowledged"; snapshotRevision: string }
  | {
      outcome: "stale";
      reason:
        | "item_revision_changed"
        | "audit_snapshot_changed"
        | "vocabulary_changed"
        | "final_tags_changed"
        | "still_noncompliant";
    }
  | {
      outcome: "conflict";
      reason:
        | "receipt_invalid"
        | "wrong_operation"
        | "wrong_target"
        | "audited_revision_mismatch"
        | "receipt_delta_inconsistent";
    }
  | { outcome: "not_found" };

function invalidTagAudit(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    "Tag audit input is invalid",
    {
      location,
    },
  );
}

function boundedAuditString(value: unknown, location: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 256) {
    return invalidTagAudit(location);
  }
  return value;
}

function rebuildAuditTags(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_TAG_AUDIT_ROW_MAX_TAGS
  ) {
    return invalidTagAudit(location);
  }
  const tags = value.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim() || entry.length > 200) {
      return invalidTagAudit(`${location}[${index}]`);
    }
    return entry;
  });
  if (
    new Set(tags).size !== tags.length ||
    tags.some((tag, index) => index > 0 && tags[index - 1]! >= tag)
  ) {
    return invalidTagAudit(location);
  }
  return tags;
}

export function rebuildTagAuditStagingEntries(
  value: unknown,
): TagAuditStagingEntry[] {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_TAG_AUDIT_APPEND_MAX_ROWS
  ) {
    return invalidTagAudit("tagAudit.entries");
  }
  const entries = value.map((entry, index) => {
    const location = `tagAudit.entries[${index}]`;
    const input = toSynthesisJsonObject(entry, location);
    assertSynthesisExactFields(
      input,
      [
        "target",
        "auditedRevision",
        "auditedTagDigest",
        "auditedTags",
        "evaluation",
      ],
      [],
      location,
    );
    const auditedTags = rebuildAuditTags(
      input.auditedTags,
      `${location}.auditedTags`,
    );
    const evaluation = toSynthesisJsonObject(
      input.evaluation,
      `${location}.evaluation`,
    );
    if (evaluation.state === "compliant") {
      assertSynthesisExactFields(
        evaluation,
        ["state"],
        [],
        `${location}.evaluation`,
      );
      return {
        target: rebuildSynthesisHostItemRef(input.target, `${location}.target`),
        auditedRevision: boundedAuditString(
          input.auditedRevision,
          `${location}.auditedRevision`,
        ),
        auditedTagDigest: boundedAuditString(
          input.auditedTagDigest,
          `${location}.auditedTagDigest`,
        ),
        auditedTags,
        evaluation: { state: "compliant" as const },
      };
    }
    assertSynthesisExactFields(
      evaluation,
      ["state", "nonCompliantTags"],
      [],
      `${location}.evaluation`,
    );
    if (evaluation.state !== "needs_regulation") {
      return invalidTagAudit(`${location}.evaluation.state`);
    }
    const nonCompliantTags = rebuildAuditTags(
      evaluation.nonCompliantTags,
      `${location}.evaluation.nonCompliantTags`,
    );
    const audited = new Set(auditedTags);
    if (nonCompliantTags.some((tag) => !audited.has(tag))) {
      return invalidTagAudit(`${location}.evaluation.nonCompliantTags`);
    }
    return {
      target: rebuildSynthesisHostItemRef(input.target, `${location}.target`),
      auditedRevision: boundedAuditString(
        input.auditedRevision,
        `${location}.auditedRevision`,
      ),
      auditedTagDigest: boundedAuditString(
        input.auditedTagDigest,
        `${location}.auditedTagDigest`,
      ),
      auditedTags,
      evaluation: { state: "needs_regulation" as const, nonCompliantTags },
    };
  });
  if (
    byteLengthSynthesisContractText(JSON.stringify(entries)) >
    SYNTHESIS_TAG_AUDIT_APPEND_MAX_BYTES
  ) {
    return invalidTagAudit("tagAudit.entries");
  }
  return entries;
}

export function rebuildTagRegulationVerifiedCommitDto(
  value: unknown,
): TagRegulationVerifiedCommitDto {
  const input = toSynthesisJsonObject(value, "tagRegulationVerifiedCommit");
  assertSynthesisExactFields(
    input,
    [
      "schema",
      "target",
      "receiptId",
      "expectedSnapshotRevision",
      "auditedRevision",
      "currentRevision",
      "finalTagDigest",
      "finalTags",
      "vocabularyHash",
    ],
    [],
    "tagRegulationVerifiedCommit",
  );
  if (input.schema !== "zotero-agents.tag-regulation-verified-commit.v1") {
    return invalidTagAudit("tagRegulationVerifiedCommit.schema");
  }
  return {
    schema: input.schema,
    target: rebuildSynthesisHostItemRef(
      input.target,
      "tagRegulationVerifiedCommit.target",
    ),
    receiptId: boundedAuditString(
      input.receiptId,
      "tagRegulationVerifiedCommit.receiptId",
    ),
    expectedSnapshotRevision: boundedAuditString(
      input.expectedSnapshotRevision,
      "tagRegulationVerifiedCommit.expectedSnapshotRevision",
    ),
    auditedRevision: boundedAuditString(
      input.auditedRevision,
      "tagRegulationVerifiedCommit.auditedRevision",
    ),
    currentRevision: boundedAuditString(
      input.currentRevision,
      "tagRegulationVerifiedCommit.currentRevision",
    ),
    finalTagDigest: boundedAuditString(
      input.finalTagDigest,
      "tagRegulationVerifiedCommit.finalTagDigest",
    ),
    finalTags: rebuildAuditTags(
      input.finalTags,
      "tagRegulationVerifiedCommit.finalTags",
    ),
    vocabularyHash: boundedAuditString(
      input.vocabularyHash,
      "tagRegulationVerifiedCommit.vocabularyHash",
    ),
  };
}

export type SynthesisTagManifest = {
  manifest_hash: string;
  entry_count: number;
  tag_count: number;
  active_count: number;
  updated_at: string;
  source_protocol_version: string;
  projection_target: string;
};

export type SynthesisTagVocabularySaveRequest = {
  entries: SynthesisTagVocabularyEntry[];
  aliases?: Record<string, string>;
  abbrev?: Record<string, string>;
  protocol?: SynthesisTagProtocol | null;
  transactionId?: string;
};

export type SynthesisTagStagedSuggestion = {
  tag: string;
  facet: string;
  note?: string;
  source_flow?: string;
  parent_bindings?: SynthesisHostItemRef[];
  created_at?: string;
  updated_at?: string;
};

export type SynthesisTagSuggestionInput = {
  tag: string;
  facet?: string;
  note?: string;
  source_flow?: string;
  parent_bindings?: SynthesisHostItemRef[];
};

export type SynthesisTagSuggestionStageRequest = {
  entries: SynthesisTagSuggestionInput[];
};

export type SynthesisTagSelectionRequest = {
  tags: string[];
};

export type SynthesisStagedTagUpdateRequest = {
  originalTag: string;
  tag: string;
  facet: string;
  note: string;
  sourceFlow: string;
  parentBindings: SynthesisHostItemRef[];
};

export type SynthesisTagVocabularyEntryUpdateRequest = {
  originalTag: string;
  tag: string;
  facet: string;
  note: string;
};

export type SynthesisTagVocabularyEntryDeleteRequest = {
  originalTag: string;
};

export type SynthesisTagMutationDiagnostic = {
  code: string;
  severity: "warning" | "error";
};

export type SynthesisTagMutationResult = {
  status:
    | "committed"
    | "unchanged"
    | "not_found"
    | "conflict"
    | "basis_mismatch"
    | "tag_vocabulary_busy"
    | "invalid_request"
    | "engine_failed"
    | "worker_failed"
    | "stopping"
    | "repair_required";
  vocabularyHash: string | null;
  stagedRevision: number;
  changedTags: string[];
  warnings: string[];
  diagnostics: SynthesisTagMutationDiagnostic[];
  previewDigest?: string;
};

export type SynthesisTagStageResult = {
  staged: SynthesisTagStagedSuggestion[];
};

export type SynthesisTagDiagnostic = {
  code: string;
  message: string;
  details: Record<string, string>;
};

export type SynthesisTagEntryUpdateResult = {
  mutated: boolean;
  updated?: SynthesisTagVocabularyEntry;
  diagnostic?: SynthesisTagDiagnostic;
};

export type SynthesisTagEntryDeleteResult = {
  mutated: boolean;
  deleted: string[];
};

export type SynthesisTagPromotionResult = {
  promoted: string[];
  skipped: string[];
};

export type SynthesisTagDiscardResult = {
  discarded: string[];
};

export type SynthesisTagImportConflict = {
  tag: string;
  local: SynthesisTagVocabularyEntry;
  imported: SynthesisTagVocabularyEntry;
};

export type SynthesisTagImportPreview = {
  action: "preview";
  builtins: SynthesisTagImportConflict[];
  additions: SynthesisTagVocabularyEntry[];
  unchanged: SynthesisTagVocabularyEntry[];
  conflicts: SynthesisTagImportConflict[];
  warnings: SynthesisTagValidationWarning[];
  previewDigest: string;
};

export type SynthesisTagAuditReplaceResult = {
  libraryId: number;
  audited: number;
};

export type SynthesisTagCommandResult =
  | SynthesisTagMutationResult
  | SynthesisTagStageResult
  | SynthesisTagEntryUpdateResult
  | SynthesisTagEntryDeleteResult
  | SynthesisTagPromotionResult
  | SynthesisTagDiscardResult
  | SynthesisTagImportPreview;

export type SynthesisTagCapabilityResultMap = {
  "client.initializeBuiltinTagPolicy": SynthesisTagVocabularySnapshot;
  "client.isBuiltinTagPolicyInitialized": boolean;
  "client.loadTagVocabulary": SynthesisTagVocabularySnapshot;
  "client.saveTagVocabulary": SynthesisTagMutationResult;
  "client.validateTagVocabulary": SynthesisTagValidationWarning[];
  "client.rebuildTagVocabularyIndex": SynthesisPublicMaintenanceOperation;
  "client.exportTagVocabularyForRegulator": TagVocabularyRegulatorExportDto;
  "client.listStagedTagSuggestions": SynthesisTagStagedSuggestion[];
  "client.stageTagSuggestions": SynthesisTagStageResult;
  "client.updateStagedTagSuggestion": SynthesisTagStageResult;
  "client.updateTagVocabularyEntry": SynthesisTagEntryUpdateResult;
  "client.deleteTagVocabularyEntry": SynthesisTagEntryDeleteResult;
  "client.promoteStagedTagSuggestions": SynthesisTagPromotionResult;
  "client.discardStagedTagSuggestions": SynthesisTagDiscardResult;
  "client.clearStagedTagSuggestions": SynthesisTagDiscardResult;
  "client.previewTagVocabularyImport": SynthesisTagImportPreview;
  "client.applyTagVocabularyImport": SynthesisTagMutationResult;
  "client.replaceTagAuditRecords": SynthesisTagAuditReplaceResult;
  "client.clearTagAuditRecord": { ok: true };
  "client.beginTagAuditRun": TagAuditRunBeginResultDto;
  "client.appendTagAuditRun": TagAuditRunAppendResultDto;
  "client.promoteTagAuditRun": TagAuditRunResultDto;
  "client.abortTagAuditRun": TagAuditRunAbortResultDto;
  "client.prepareTagRegulationAcknowledgement": TagRegulationAcknowledgementPrepareResultDto;
  "client.commitTagRegulationAcknowledgement": TagRegulationAcknowledgementResultDto;
};

export function rebuildSynthesisTagCapabilityResult<
  Capability extends keyof SynthesisTagCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisTagCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export const SYNTHESIS_TAG_IMPORT_ACTIONS = [
  "use-imported",
  "merge-non-conflicting",
] as const;

export type SynthesisTagImportAction =
  (typeof SYNTHESIS_TAG_IMPORT_ACTIONS)[number];

export type SynthesisTagImportPreviewRequest = {
  payload: string;
};

export type SynthesisTagImportApplyRequest = {
  payload: string;
  action: SynthesisTagImportAction;
};

export type SynthesisTagAuditReplaceRequest = {
  libraryId: number;
  entries: Array<{
    itemKey: string;
    compliant: boolean;
    nonCompliantTags: string[];
  }>;
};

export interface SynthesisTagsClient {
  initializeBuiltinTagPolicy(): Promise<SynthesisTagVocabularySnapshot>;
  isBuiltinTagPolicyInitialized(): Promise<boolean>;
  loadTagVocabulary(): Promise<SynthesisTagVocabularySnapshot>;
  saveTagVocabulary(
    request: SynthesisTagVocabularySaveRequest,
  ): Promise<SynthesisTagMutationResult>;
  validateTagVocabulary(): Promise<SynthesisTagValidationWarning[]>;
  rebuildTagVocabularyIndex(): Promise<SynthesisPublicMaintenanceOperation>;
  exportTagVocabularyForRegulator(): Promise<TagVocabularyRegulatorExportDto>;
  listStagedTagSuggestions(): Promise<SynthesisTagStagedSuggestion[]>;
  stageTagSuggestions(
    request: SynthesisTagSuggestionStageRequest,
  ): Promise<SynthesisTagStageResult>;
  updateStagedTagSuggestion(
    request: SynthesisStagedTagUpdateRequest,
  ): Promise<SynthesisTagStageResult>;
  updateTagVocabularyEntry(
    request: SynthesisTagVocabularyEntryUpdateRequest,
  ): Promise<SynthesisTagEntryUpdateResult>;
  deleteTagVocabularyEntry(
    request: SynthesisTagVocabularyEntryDeleteRequest,
  ): Promise<SynthesisTagEntryDeleteResult>;
  promoteStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagPromotionResult>;
  discardStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagDiscardResult>;
  clearStagedTagSuggestions(): Promise<SynthesisTagDiscardResult>;
  previewTagVocabularyImport(
    request: SynthesisTagImportPreviewRequest,
  ): Promise<SynthesisTagImportPreview>;
  applyTagVocabularyImport(
    request: SynthesisTagImportApplyRequest,
  ): Promise<SynthesisTagMutationResult>;
  replaceTagAuditRecords(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<SynthesisTagAuditReplaceResult>;
  clearTagAuditRecord(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<{ ok: true }>;
  beginTagAuditRun(
    request: TagAuditRunBeginRequestDto,
  ): Promise<TagAuditRunBeginResultDto>;
  appendTagAuditRun(
    request: TagAuditRunAppendRequestDto,
  ): Promise<TagAuditRunAppendResultDto>;
  promoteTagAuditRun(
    request: TagAuditRunPromoteRequestDto,
  ): Promise<TagAuditRunResultDto>;
  abortTagAuditRun(
    request: TagAuditRunAbortRequestDto,
  ): Promise<TagAuditRunAbortResultDto>;
  prepareTagRegulationAcknowledgement(
    request: TagRegulationAcknowledgementPrepareRequestDto,
  ): Promise<TagRegulationAcknowledgementPrepareResultDto>;
  commitTagRegulationAcknowledgement(
    request: TagRegulationVerifiedCommitDto,
  ): Promise<TagRegulationAcknowledgementResultDto>;
}
