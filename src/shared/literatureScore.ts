import {
  LITERATURE_SCORE_NOTE_KIND,
  LITERATURE_SCORE_PAYLOAD_TYPE,
  LITERATURE_SCORE_SCHEMA,
  parseLiteratureScoreArtifact,
  type LiteratureQualityDiagnostic,
  type LiteratureQualitySnapshot,
  type LiteratureScoreArtifact,
} from "../../packages/synthesis-contracts/src/literatureArtifacts";

export {
  LITERATURE_SCORE_NOTE_KIND,
  LITERATURE_SCORE_PAYLOAD_TYPE,
  LITERATURE_SCORE_SCHEMA,
};
export type { LiteratureQualityDiagnostic, LiteratureQualitySnapshot };

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

export function parseLiteratureScore(
  value: unknown,
): LiteratureScoreSummary | null {
  let score: LiteratureScoreArtifact;
  try {
    score = parseLiteratureScoreArtifact(value);
  } catch {
    return null;
  }
  return {
    schema: score.schema,
    rubricId: score.rubric_id,
    paperType: score.paper_type,
    paperTypeReason: score.paper_type_reason,
    overallScore: score.overall_score,
    confidence: score.confidence,
    confidenceAdjustedScore: score.confidence_adjusted_score,
    dimensions: score.dimensions.map((dimension) => ({
      dimensionKey: dimension.dimension_key,
      name: dimension.name,
      score: dimension.score,
      confidence: dimension.confidence,
      summary: dimension.summary,
    })),
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
  const payloadHash =
    typeof args.payloadHash === "string" && args.payloadHash.trim()
      ? args.payloadHash.trim()
      : undefined;
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
      ...(payloadHash ? { payload_hash: payloadHash } : {}),
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
    ...(payloadHash ? { payload_hash: payloadHash } : {}),
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
