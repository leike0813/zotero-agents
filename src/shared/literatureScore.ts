import {
  LITERATURE_SCORE_NOTE_KIND,
  LITERATURE_SCORE_PAYLOAD_TYPE,
  LITERATURE_SCORE_SCHEMA,
  type LiteratureQualityDiagnostic,
  type LiteratureQualitySnapshot,
} from "../../packages/synthesis-contracts/src/literatureArtifacts";

export {
  LITERATURE_SCORE_NOTE_KIND,
  LITERATURE_SCORE_PAYLOAD_TYPE,
  LITERATURE_SCORE_SCHEMA,
};
export type { LiteratureQualityDiagnostic, LiteratureQualitySnapshot };

export const LITERATURE_SCORE_DIMENSION_KEYS = [
  "methodological_rigor",
  "evidence_completeness",
  "reproducibility",
  "innovation_signals",
  "research_impact_potential",
  "writing_quality",
] as const;

export type LiteratureScoreDimension = {
  dimensionKey: string;
  name: string;
  score: number | null;
  confidence: number | null;
  summary: string;
};

export type LiteratureScoreSummary = {
  schema: typeof LITERATURE_SCORE_SCHEMA;
  rubricId: string;
  paperType: string;
  paperTypeReason: string;
  overallScore: number;
  confidence: number;
  confidenceAdjustedScore: number;
  dimensions: LiteratureScoreDimension[];
};

export type LiteratureStarModel = {
  rating: number;
  fills: Array<0 | 0.5 | 1>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedNumber(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

function nonEmptyString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export function unwrapLiteratureScore(value: unknown) {
  const outer = record(value);
  if (!outer) {
    return null;
  }
  return record(outer.literature_score) || outer;
}

export function parseLiteratureScore(
  value: unknown,
): LiteratureScoreSummary | null {
  const score = unwrapLiteratureScore(value);
  if (!score || score.schema !== LITERATURE_SCORE_SCHEMA) {
    return null;
  }
  const rubricId = nonEmptyString(score.rubric_id);
  const paperType = nonEmptyString(score.paper_type);
  const paperTypeReason = nonEmptyString(score.paper_type_reason);
  const overallScore = boundedNumber(score.overall_score, 0, 100);
  const confidence = boundedNumber(score.confidence, 0, 1);
  const confidenceAdjustedScore = boundedNumber(
    score.confidence_adjusted_score,
    0,
    100,
  );
  if (
    !rubricId ||
    !paperType ||
    !paperTypeReason ||
    overallScore === null ||
    confidence === null ||
    confidenceAdjustedScore === null ||
    !Array.isArray(score.dimensions) ||
    score.dimensions.length !== LITERATURE_SCORE_DIMENSION_KEYS.length
  ) {
    return null;
  }

  const dimensions: LiteratureScoreDimension[] = [];
  const seen = new Set<string>();
  for (const rawDimension of score.dimensions) {
    const dimension = record(rawDimension);
    const dimensionKey = nonEmptyString(dimension?.dimension_key);
    const name = nonEmptyString(dimension?.name);
    const summary = nonEmptyString(dimension?.summary);
    const dimensionScore =
      dimension?.score === null
        ? null
        : boundedNumber(dimension?.score, 0, 100);
    const dimensionConfidence =
      dimension?.confidence === null
        ? null
        : boundedNumber(dimension?.confidence, 0, 1);
    if (
      !dimensionKey ||
      !name ||
      !summary ||
      (dimensionScore === null && dimension?.score !== null) ||
      (dimensionConfidence === null && dimension?.confidence !== null) ||
      !LITERATURE_SCORE_DIMENSION_KEYS.includes(
        dimensionKey as (typeof LITERATURE_SCORE_DIMENSION_KEYS)[number],
      ) ||
      seen.has(dimensionKey)
    ) {
      return null;
    }
    seen.add(dimensionKey);
    dimensions.push({
      dimensionKey,
      name,
      score: dimensionScore,
      confidence: dimensionConfidence,
      summary,
    });
  }
  if (
    LITERATURE_SCORE_DIMENSION_KEYS.some(
      (dimensionKey) => !seen.has(dimensionKey),
    )
  ) {
    return null;
  }

  return {
    schema: LITERATURE_SCORE_SCHEMA,
    rubricId,
    paperType,
    paperTypeReason,
    overallScore,
    confidence,
    confidenceAdjustedScore,
    dimensions,
  };
}

export function literatureQualityPrior(
  overallScore: number,
  confidence: number,
) {
  const boundedScore = Math.max(0, Math.min(100, overallScore));
  const boundedConfidence = Math.max(0, Math.min(1, confidence));
  return Number(
    (0.5 + boundedConfidence * (boundedScore / 100 - 0.5)).toFixed(6),
  );
}

export function buildLiteratureQualitySnapshot(args: {
  payload?: unknown;
  payloadHash?: string;
  missing?: boolean;
}): LiteratureQualitySnapshot {
  const payloadHash = nonEmptyString(args.payloadHash) || undefined;
  if (args.missing) {
    return {
      status: "missing",
      quality_prior: 0.5,
      diagnostics: ["literature_score_missing"],
    };
  }
  const score = parseLiteratureScore(args.payload);
  if (!score) {
    return {
      status: "invalid",
      quality_prior: 0.5,
      payload_hash: payloadHash,
      diagnostics: ["literature_score_invalid"],
    };
  }
  return {
    status: "available",
    schema: score.schema,
    rubric_id: score.rubricId,
    paper_type: score.paperType,
    overall_score: score.overallScore,
    confidence: score.confidence,
    confidence_adjusted_score: score.confidenceAdjustedScore,
    quality_prior: literatureQualityPrior(score.overallScore, score.confidence),
    payload_hash: payloadHash,
    diagnostics: [],
  };
}

export function literatureScoreToStars(score: number): LiteratureStarModel {
  const bounded = Math.max(0, Math.min(100, Number(score) || 0));
  const rating = Math.round(bounded / 10) / 2;
  return {
    rating,
    fills: Array.from({ length: 5 }, (_, index) => {
      const fill = rating - index;
      return fill >= 1 ? 1 : fill >= 0.5 ? 0.5 : 0;
    }),
  };
}
