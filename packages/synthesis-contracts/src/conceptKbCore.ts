export type SynthesisConceptKbConceptStatus =
  | "active"
  | "review"
  | "deprecated";
export type SynthesisConceptKbConfidence = "high" | "medium" | "low";

export type SynthesisConceptKbIndexConcept = {
  conceptId: string;
  label: string;
  aliases: string[];
  conceptType: string;
  domain: string;
  status: SynthesisConceptKbConceptStatus;
  shortDefinition?: string;
  definition?: string;
};

export type SynthesisConceptKbIndexSense = {
  senseId: string;
  conceptId: string;
  label: string;
  shortDefinition?: string;
  definition?: string;
  confidence: SynthesisConceptKbConfidence;
};

export type SynthesisConceptKbIndexAlias = {
  aliasId: string;
  alias: string;
  normalized: string;
  conceptId: string;
  senseId?: string;
  status: SynthesisConceptKbConceptStatus;
  confidence: SynthesisConceptKbConfidence;
};

export type SynthesisConceptKbIndexRequest = {
  contractVersion: "synthesis-concept-kb-index.v1";
  algorithmVersion: "concept-kb-index.v1";
  concepts: SynthesisConceptKbIndexConcept[];
  senses: SynthesisConceptKbIndexSense[];
  aliases: SynthesisConceptKbIndexAlias[];
  sourceManifestHash: string;
  rebuiltAt: string;
};

export type SynthesisConceptKbIndexSearchRow = {
  conceptId: string;
  label: string;
  normalized: string;
  conceptType: string;
  domain: string;
};

export type SynthesisConceptKbOverlayEntry = {
  conceptId: string;
  senseId?: string;
  alias: string;
  label: string;
  shortDefinition?: string;
  definition?: string;
  confidence: SynthesisConceptKbConfidence;
};

export type SynthesisConceptKbIndexResult = {
  contractVersion: "synthesis-concept-kb-index.v1";
  algorithmVersion: "concept-kb-index.v1";
  schemaVersion: "1.0.0";
  sourceManifestHash: string;
  rebuiltAt: string;
  search: SynthesisConceptKbIndexSearchRow[];
  overlayEntries: SynthesisConceptKbOverlayEntry[];
};

export type SynthesisConceptKbQueryRequest = {
  contractVersion: "synthesis-concept-kb-index.v1";
  algorithmVersion: "concept-kb-query.v1";
  concepts: SynthesisConceptKbIndexConcept[];
  senses: SynthesisConceptKbIndexSense[];
  aliases: SynthesisConceptKbIndexAlias[];
  labels: string[];
};

export type SynthesisConceptKbQueryAliasMatch = {
  aliasId: string;
  conceptId: string;
};

export type SynthesisConceptKbQueryMatch = {
  label: string;
  exactConceptIds: string[];
  aliasMatches: SynthesisConceptKbQueryAliasMatch[];
  senseIds: string[];
  ambiguous: boolean;
};

export type SynthesisConceptKbQueryResult = {
  contractVersion: "synthesis-concept-kb-index.v1";
  algorithmVersion: "concept-kb-query.v1";
  matches: SynthesisConceptKbQueryMatch[];
};
