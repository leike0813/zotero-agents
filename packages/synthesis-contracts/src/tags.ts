import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";

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
  parentBindings: number[];
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
  loadTagVocabulary(): Promise<SynthesisTagVocabularySnapshot>;
  saveTagVocabulary(request: SynthesisJsonObject): Promise<SynthesisJsonValue>;
  validateTagVocabulary(): Promise<SynthesisJsonValue>;
  rebuildTagVocabularyIndex(): Promise<SynthesisJsonObject>;
  exportTagVocabularyForRegulator(): Promise<string[]>;
  listStagedTagSuggestions(): Promise<SynthesisTagStagedSuggestion[]>;
  stageTagSuggestions(
    request: SynthesisJsonObject,
  ): Promise<SynthesisJsonValue>;
  updateStagedTagSuggestion(
    request: SynthesisStagedTagUpdateRequest,
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
