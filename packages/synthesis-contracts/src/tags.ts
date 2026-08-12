import type { SynthesisHostItemRef } from "./itemRef";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";

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
  "client.exportTagVocabularyForRegulator": string[];
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
  exportTagVocabularyForRegulator(): Promise<string[]>;
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
}
