export const LITERATURE_SCORE_SCHEMA = "literature_score.v1" as const;
export const LITERATURE_SCORE_PAYLOAD_TYPE = "literature-score-json" as const;
export const LITERATURE_SCORE_NOTE_KIND = "literature-score" as const;

export const SYNTHESIS_PAPER_ARTIFACT_TYPES = [
  "digest",
  "references",
  "citation_analysis",
  "literature_score",
] as const;

export type SynthesisPaperArtifactType =
  (typeof SYNTHESIS_PAPER_ARTIFACT_TYPES)[number];

export const SYNTHESIS_PAPER_ARTIFACT_PAYLOAD_TYPES: Record<
  SynthesisPaperArtifactType,
  string
> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
  literature_score: LITERATURE_SCORE_PAYLOAD_TYPE,
};

export type LiteratureQualityDiagnostic =
  | "literature_score_missing"
  | "literature_score_invalid";

export type LiteratureQualitySnapshot = {
  status: "available" | "missing" | "invalid";
  schema?: typeof LITERATURE_SCORE_SCHEMA;
  rubric_id?: string;
  paper_type?: string;
  overall_score?: number;
  confidence?: number;
  confidence_adjusted_score?: number;
  quality_prior: number;
  payload_hash?: string;
  diagnostics: LiteratureQualityDiagnostic[];
};
