import type { SynthesisJsonObject, SynthesisJsonValue } from "./common";

export type SynthesisTagVocabularySnapshot = SynthesisJsonObject;

export type SynthesisTagStagedSuggestion = SynthesisJsonObject & {
  tag: string;
};

export type SynthesisTagSelectionRequest = {
  tags: string[];
};

export type SynthesisTagCommandResult = SynthesisJsonObject;

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
  promoteStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagCommandResult>;
  discardStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagCommandResult>;
  clearStagedTagSuggestions(): Promise<SynthesisTagCommandResult>;
  replaceTagAuditRecords(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<SynthesisJsonObject>;
  clearTagAuditRecord(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<{ ok: true }>;
}
