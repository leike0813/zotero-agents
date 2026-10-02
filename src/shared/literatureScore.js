import { LITERATURE_SCORE_NOTE_KIND, LITERATURE_SCORE_PAYLOAD_TYPE, LITERATURE_SCORE_SCHEMA, parseLiteratureScoreArtifact, } from "../../packages/synthesis-contracts/src/literatureArtifacts";
export { LITERATURE_SCORE_NOTE_KIND, LITERATURE_SCORE_PAYLOAD_TYPE, LITERATURE_SCORE_SCHEMA, };
export function parseStoredLiteratureScoreArtifact(value) {
    let candidate = value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value;
        const keys = Object.keys(record).sort();
        if (keys.length === 4 &&
            keys[0] === "entry" &&
            keys[1] === "format" &&
            keys[2] === "literature_score" &&
            keys[3] === "version" &&
            record.version === 1 &&
            record.format === "json" &&
            typeof record.entry === "string" &&
            record.entry.trim()) {
            candidate = record.literature_score;
        }
    }
    try {
        return parseLiteratureScoreArtifact(candidate);
    }
    catch {
        return null;
    }
}
export function parseLiteratureScore(value) {
    const score = parseStoredLiteratureScoreArtifact(value);
    if (!score)
        return null;
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
export function literatureQualityPrior(overallScore, confidence) {
    const boundedScore = Math.max(0, Math.min(100, overallScore));
    const boundedConfidence = Math.max(0, Math.min(1, confidence));
    return Number((0.5 + boundedConfidence * (boundedScore / 100 - 0.5)).toFixed(6));
}
export function buildLiteratureQualitySnapshot(args) {
    const payloadHash = typeof args.payloadHash === "string" && args.payloadHash.trim()
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
export function literatureScoreToStars(score) {
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
