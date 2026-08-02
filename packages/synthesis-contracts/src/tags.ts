import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";
import type { SynthesisHostItemRef } from "./itemRef";
import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";

export type SynthesisTagVocabularySnapshot = SynthesisJsonObject;

export type SynthesisTagStagedSuggestion = SynthesisJsonObject & {
  tag: string;
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
  saveTagVocabulary(request: SynthesisJsonObject): Promise<SynthesisJsonValue>;
  validateTagVocabulary(): Promise<SynthesisJsonValue>;
  rebuildTagVocabularyIndex(): Promise<SynthesisPublicMaintenanceOperation>;
  exportTagVocabularyForRegulator(): Promise<string[]>;
  listStagedTagSuggestions(): Promise<SynthesisTagStagedSuggestion[]>;
  stageTagSuggestions(
    request: SynthesisJsonObject,
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
