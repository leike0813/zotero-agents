export type SynthesisTagVocabularyEngineEntry = {
  tag: string;
  facet: string;
  note?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases: string[];
  abbrev: string[];
};

export type SynthesisTagVocabularyEngineProtocol = {
  version: string;
  tagPattern: string;
  maxTagLength: number;
  facets: string[];
};

export type SynthesisTagVocabularyWarning = {
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
};

export type SynthesisTagVocabularyIndexSearchRow = {
  tag: string;
  normalized: string;
  facet: string;
  aliases: string[];
  abbrev: string[];
};

export type SynthesisTagVocabularyIndexResult = {
  contractVersion: "synthesis-tag-vocabulary.v1";
  algorithmVersion: "tag-vocabulary-index.v1";
  schemaVersion: "1.0.0";
  sourceManifestHash: string;
  rebuiltAt: string;
  tags: string[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  search: SynthesisTagVocabularyIndexSearchRow[];
  validationWarnings: SynthesisTagVocabularyWarning[];
};
