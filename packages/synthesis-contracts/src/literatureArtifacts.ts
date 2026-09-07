import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import literatureScoreArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json" with { type: "json" };
import {
  CanonicalLiteratureArtifactValidationError,
  validateCanonicalArtifactJson,
  type ContractValidationIssue,
  type ContractValidationResult,
} from "./sourceReferenceArtifact.js";

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

export type LiteratureScorePaperType =
  | "empirical"
  | "review"
  | "theoretical"
  | "qualitative"
  | "mixed_methods"
  | "other";

export type LiteratureScoreEvidence = {
  line_start: number;
  line_end: number;
  quote: string;
};

export type LiteratureScoreCriterion = {
  criterion_key: string;
  name: string;
  status: "scored" | "not_applicable";
  score: number | null;
  max_score: number;
  reason: string;
  evidence: LiteratureScoreEvidence[];
};

export type LiteratureScoreDimensionArtifact = {
  dimension_key: string;
  name: string;
  configured_weight: number;
  effective_weight: number;
  raw_score: number;
  applicable_max_score: number;
  score: number | null;
  confidence: number | null;
  summary: string;
  criteria: LiteratureScoreCriterion[];
};

/**
 * The portable score file is the native `literature_score.v1` object. The
 * Skill's surrounding `{ literature_score: ... }` value is a renderer input
 * wrapper and is intentionally outside this canonical contract.
 */
export type LiteratureScoreArtifact = {
  schema: typeof LITERATURE_SCORE_SCHEMA;
  rubric_id: string;
  paper_type: LiteratureScorePaperType;
  paper_type_reason: string;
  overall_score: number;
  confidence: number;
  confidence_adjusted_score: number;
  dimensions: LiteratureScoreDimensionArtifact[];
};

function createValidator(schema: object): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, logger: false });
  return ajv.compile(schema);
}

function validationIssues(
  errors: ErrorObject[] | null | undefined,
): ContractValidationIssue[] {
  return (errors || []).map((error) => ({
    path:
      error.instancePath ||
      (typeof error.params?.missingProperty === "string"
        ? `/${error.params.missingProperty}`
        : "/"),
    code: "schema_invalid",
    message: error.message || "invalid literature score artifact",
  }));
}

const literatureScoreValidator = createValidator(literatureScoreArtifactSchema);

export function validateLiteratureScoreArtifact(
  value: unknown,
): ContractValidationResult<LiteratureScoreArtifact> {
  // Keep this check aligned with Source Reference/Citation so every Broker
  // artifact has the same strict JSON and 1 MiB domain boundary.
  const preflight = validateCanonicalArtifactJson(value);
  if (!preflight.ok) return preflight;
  if (!literatureScoreValidator(preflight.value)) {
    return {
      ok: false,
      issues: validationIssues(literatureScoreValidator.errors),
    };
  }
  return { ok: true, value: preflight.value as LiteratureScoreArtifact };
}

export function parseLiteratureScoreArtifact(
  value: unknown,
): LiteratureScoreArtifact {
  const result = validateLiteratureScoreArtifact(value);
  if (!result.ok) {
    throw new CanonicalLiteratureArtifactValidationError(result.issues);
  }
  return result.value;
}
