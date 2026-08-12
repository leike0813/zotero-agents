import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";
import type { SynthesisHostItemRef } from "./itemRef";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";

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
  version?: string;
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
  manifest: SynthesisJsonObject;
  validation_warnings: SynthesisTagValidationWarning[];
  projection?: SynthesisJsonObject;
  import_preview?: SynthesisJsonObject;
};

export type SynthesisTagVocabularySaveRequest = {
  entries: SynthesisTagVocabularyEntry[];
  aliases?: Record<string, string>;
  abbrev?: Record<string, string>;
  protocol?: SynthesisTagProtocol | null;
  transactionId?: string;
};

export type SynthesisTagStagedSuggestion = SynthesisJsonObject & {
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

export type SynthesisTagCommandResult = SynthesisJsonObject;

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
  ): Promise<SynthesisJsonValue>;
  validateTagVocabulary(): Promise<SynthesisJsonValue>;
  rebuildTagVocabularyIndex(): Promise<SynthesisPublicMaintenanceOperation>;
  exportTagVocabularyForRegulator(): Promise<string[]>;
  listStagedTagSuggestions(): Promise<SynthesisTagStagedSuggestion[]>;
  stageTagSuggestions(
    request: SynthesisTagSuggestionStageRequest,
  ): Promise<SynthesisJsonValue>;
  updateStagedTagSuggestion(
    request: SynthesisStagedTagUpdateRequest,
  ): Promise<SynthesisTagCommandResult>;
  updateTagVocabularyEntry(
    request: SynthesisTagVocabularyEntryUpdateRequest,
  ): Promise<SynthesisTagCommandResult>;
  deleteTagVocabularyEntry(
    request: SynthesisTagVocabularyEntryDeleteRequest,
  ): Promise<SynthesisTagCommandResult>;
  promoteStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagCommandResult>;
  discardStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagCommandResult>;
  clearStagedTagSuggestions(): Promise<SynthesisTagCommandResult>;
  previewTagVocabularyImport(
    request: SynthesisTagImportPreviewRequest,
  ): Promise<SynthesisTagCommandResult>;
  applyTagVocabularyImport(
    request: SynthesisTagImportApplyRequest,
  ): Promise<SynthesisTagCommandResult>;
  replaceTagAuditRecords(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<SynthesisJsonObject>;
  clearTagAuditRecord(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<{ ok: true }>;
}
