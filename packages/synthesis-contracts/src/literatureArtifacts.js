import Ajv2020 from "ajv/dist/2020.js";
import literatureScoreArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json" with { type: "json" };
import { CanonicalLiteratureArtifactValidationError, validateCanonicalArtifactJson, } from "./sourceReferenceArtifact.js";
export const LITERATURE_SCORE_SCHEMA = "literature_score.v1";
export const LITERATURE_SCORE_PAYLOAD_TYPE = "literature-score-json";
export const LITERATURE_SCORE_NOTE_KIND = "literature-score";
export const SYNTHESIS_PAPER_ARTIFACT_TYPES = [
    "digest",
    "references",
    "citation_analysis",
    "literature_score",
];
export const SYNTHESIS_PAPER_ARTIFACT_PAYLOAD_TYPES = {
    digest: "digest-markdown",
    references: "references-json",
    citation_analysis: "citation-analysis-json",
    literature_score: LITERATURE_SCORE_PAYLOAD_TYPE,
};
function createValidator(schema) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, logger: false });
    return ajv.compile(schema);
}
function validationIssues(errors) {
    return (errors || []).map((error) => ({
        path: error.instancePath ||
            (typeof error.params?.missingProperty === "string"
                ? `/${error.params.missingProperty}`
                : "/"),
        code: "schema_invalid",
        message: error.message || "invalid literature score artifact",
    }));
}
const literatureScoreValidator = createValidator(literatureScoreArtifactSchema);
export function validateLiteratureScoreArtifact(value) {
    // Keep this check aligned with Source Reference/Citation so every Broker
    // artifact has the same strict JSON and 1 MiB domain boundary.
    const preflight = validateCanonicalArtifactJson(value);
    if (!preflight.ok)
        return preflight;
    if (!literatureScoreValidator(preflight.value)) {
        return {
            ok: false,
            issues: validationIssues(literatureScoreValidator.errors),
        };
    }
    return { ok: true, value: preflight.value };
}
export function parseLiteratureScoreArtifact(value) {
    const result = validateLiteratureScoreArtifact(value);
    if (!result.ok) {
        throw new CanonicalLiteratureArtifactValidationError(result.issues);
    }
    return result.value;
}
