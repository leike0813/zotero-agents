import Ajv2020 from "ajv/dist/2020.js";
import citationAnalysisArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json" with { type: "json" };
import sourceReferenceArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json" with { type: "json" };
import { toSynthesisJsonValue } from "./common.js";
import { byteLengthSynthesisContractText } from "./canonicalJson.js";
export const SOURCE_REFERENCE_ARTIFACT_SCHEMA = "source_reference_artifact.v1";
export const CITATION_ANALYSIS_ARTIFACT_SCHEMA = "citation_analysis_artifact.v1";
export const CANONICAL_ARTIFACT_MAX_BYTES = 1_048_576;
export const CITATION_FUNCTIONS = [
    "background",
    "baseline",
    "contrast",
    "component",
    "dataset",
    "tooling",
    "historical",
    "uncategorized",
];
export class CanonicalLiteratureArtifactValidationError extends Error {
    issues;
    constructor(issues) {
        super("canonical literature artifact validation failed");
        this.name = "CanonicalLiteratureArtifactValidationError";
        this.issues = issues;
    }
}
const runtimeCrypto = () => globalThis.crypto;
export function generateSourceReferenceId() {
    const crypto = runtimeCrypto();
    if (typeof crypto?.randomUUID === "function") {
        return crypto.randomUUID();
    }
    if (typeof crypto?.getRandomValues !== "function") {
        throw new Error("secure_uuid_generation_unavailable");
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
    return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join(""),
    ].join("-");
}
export function ensureSourceReferenceId(explicitId, idFactory = generateSourceReferenceId) {
    if (typeof explicitId === "string" && explicitId.length > 0) {
        return explicitId;
    }
    return idFactory();
}
function validationIssues(errors) {
    return (errors || []).map((error) => ({
        path: error.instancePath ||
            (typeof error.params?.missingProperty === "string"
                ? `/${error.params.missingProperty}`
                : "/"),
        code: "schema_invalid",
        message: error.message || "invalid canonical literature artifact",
    }));
}
function createValidator(schema) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, logger: false });
    return ajv.compile(schema);
}
const sourceReferenceValidator = createValidator(sourceReferenceArtifactSchema);
const citationAnalysisValidator = createValidator(citationAnalysisArtifactSchema);
/**
 * Apply the shared strict-JSON and Broker-domain size gate before Ajv sees a
 * canonical artifact. Ajv validates object shape, while this boundary also
 * rejects class instances, undefined/function values, and cyclic objects that
 * JSON.stringify would otherwise silently alter or fail to represent.
 */
export function validateCanonicalArtifactJson(value, maxBytes = CANONICAL_ARTIFACT_MAX_BYTES) {
    let normalized;
    try {
        normalized = toSynthesisJsonValue(value);
    }
    catch (error) {
        return {
            ok: false,
            issues: [
                {
                    path: "/",
                    code: "json_invalid",
                    message: error instanceof Error
                        ? error.message
                        : "canonical artifact is not strict JSON",
                },
            ],
        };
    }
    const serialized = JSON.stringify(normalized);
    if (serialized === undefined ||
        byteLengthSynthesisContractText(serialized) > maxBytes) {
        return {
            ok: false,
            issues: [
                {
                    path: "/",
                    code: "resource_limited",
                    message: `canonical artifact exceeds ${maxBytes} bytes`,
                },
            ],
        };
    }
    return { ok: true, value: normalized };
}
function validateArtifact(value, validator, maxBytes = CANONICAL_ARTIFACT_MAX_BYTES) {
    const preflight = validateCanonicalArtifactJson(value, maxBytes);
    if (!preflight.ok)
        return preflight;
    if (!validator(preflight.value)) {
        return { ok: false, issues: validationIssues(validator.errors) };
    }
    return { ok: true, value: preflight.value };
}
export function validateSourceReferenceArtifact(value) {
    const result = validateArtifact(value, sourceReferenceValidator);
    if (!result.ok)
        return result;
    const seen = new Set();
    const issues = [];
    result.value.references.forEach((reference, index) => {
        if (seen.has(reference.sourceReferenceId)) {
            issues.push({
                path: `/references/${index}/sourceReferenceId`,
                code: "duplicate_source_reference_id",
                message: "Source Reference IDs must be unique within the artifact",
            });
        }
        seen.add(reference.sourceReferenceId);
    });
    return issues.length ? { ok: false, issues } : result;
}
export function parseSourceReferenceArtifact(value) {
    const result = validateSourceReferenceArtifact(value);
    if (!result.ok)
        throw new CanonicalLiteratureArtifactValidationError(result.issues);
    return result.value;
}
export function validateCitationAnalysisArtifact(value, maxBytes = CANONICAL_ARTIFACT_MAX_BYTES) {
    const result = validateArtifact(value, citationAnalysisValidator, maxBytes);
    if (!result.ok)
        return result;
    const seen = new Set();
    const issues = [];
    result.value.items.forEach((item, itemIndex) => {
        item.mentions.forEach((mention, mentionIndex) => {
            if (seen.has(mention.mention_id)) {
                issues.push({
                    path: `/items/${itemIndex}/mentions/${mentionIndex}/mention_id`,
                    code: "duplicate_mention_id",
                    message: "Citation mention IDs must be unique within the artifact",
                });
            }
            seen.add(mention.mention_id);
        });
    });
    result.value.unresolved.forEach((mention, index) => {
        if (seen.has(mention.mention_id)) {
            issues.push({
                path: `/unresolved/${index}/mention_id`,
                code: "duplicate_mention_id",
                message: "Citation mention IDs must be unique within the artifact",
            });
        }
        seen.add(mention.mention_id);
    });
    return issues.length ? { ok: false, issues } : result;
}
export function parseCitationAnalysisArtifact(value, maxBytes = CANONICAL_ARTIFACT_MAX_BYTES) {
    const result = validateCitationAnalysisArtifact(value, maxBytes);
    if (!result.ok)
        throw new CanonicalLiteratureArtifactValidationError(result.issues);
    return result.value;
}
function snippetWithMarkerContext(snippet, marker, maxCharacters) {
    const characters = Array.from(snippet);
    if (characters.length <= maxCharacters)
        return snippet;
    if (maxCharacters === 0)
        return "";
    const markerCharacters = Array.from(marker || "");
    let markerIndex = -1;
    if (markerCharacters.length) {
        markerIndex = characters.findIndex((_, index) => markerCharacters.every((character, offset) => characters[index + offset] === character));
    }
    if (markerIndex < 0 || maxCharacters < 3) {
        return `${characters.slice(0, maxCharacters - 1).join("")}…`;
    }
    if (markerIndex + markerCharacters.length <= maxCharacters - 1) {
        return `${characters.slice(0, maxCharacters - 1).join("")}…`;
    }
    if (characters.length - markerIndex <= maxCharacters - 1) {
        return `…${characters.slice(-(maxCharacters - 1)).join("")}`;
    }
    const windowLength = maxCharacters - 2;
    const start = Math.max(1, Math.min(characters.length - windowLength - 1, markerIndex - Math.floor((windowLength - markerCharacters.length) / 2)));
    return `…${characters.slice(start, start + windowLength).join("")}…`;
}
export function compactCitationAnalysisSnippets(value, maxCharacters, maxInputBytes = CANONICAL_ARTIFACT_MAX_BYTES) {
    if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 0) {
        throw new RangeError("maxCharacters must be a non-negative safe integer");
    }
    const artifact = parseCitationAnalysisArtifact(value, maxInputBytes);
    let truncatedSnippetCount = 0;
    const compactMention = (mention) => {
        const snippet = mention.snippet;
        if (snippet === null || Array.from(snippet).length <= maxCharacters) {
            return mention;
        }
        truncatedSnippetCount += 1;
        return {
            ...mention,
            snippet: snippetWithMarkerContext(snippet, mention.marker, maxCharacters),
        };
    };
    return {
        artifact: {
            ...artifact,
            items: artifact.items.map((item) => ({
                ...item,
                mentions: item.mentions.map(compactMention),
            })),
            unresolved: artifact.unresolved.map(compactMention),
        },
        truncatedSnippetCount,
        maxSnippetCharacters: maxCharacters,
    };
}
export function validateCitationAgainstReferences(citation, references) {
    const citationResult = validateCitationAnalysisArtifact(citation);
    if (!citationResult.ok)
        return citationResult;
    const referencesResult = validateSourceReferenceArtifact(references);
    if (!referencesResult.ok) {
        return {
            ok: false,
            issues: referencesResult.issues.map((issue) => ({
                ...issue,
                path: `/references${issue.path === "/" ? "" : issue.path}`,
            })),
        };
    }
    const ids = new Set(referencesResult.value.references.map((reference) => reference.sourceReferenceId));
    const issues = [];
    citation.items.forEach((item, index) => {
        if (!ids.has(item.sourceReferenceId)) {
            issues.push({
                path: `/items/${index}/sourceReferenceId`,
                code: "unknown_source_reference_id",
                message: "Citation item references an ID absent from the current References artifact",
            });
        }
    });
    for (const bucket of ["early", "mid", "recent"]) {
        citation.timeline[bucket].sourceReferenceIds.forEach((id, index) => {
            if (!ids.has(id)) {
                issues.push({
                    path: `/timeline/${bucket}/sourceReferenceIds/${index}`,
                    code: "unknown_source_reference_id",
                    message: "Citation timeline references an ID absent from the current References artifact",
                });
            }
        });
    }
    return issues.length ? { ok: false, issues } : { ok: true, value: citation };
}
export function attachReferencesBasis(citation, referencesBasis) {
    parseCitationAnalysisArtifact(citation);
    if (!referencesBasis)
        throw new Error("references_basis_required");
    return { ...citation, referencesBasis };
}
/**
 * Decode the runtime-stored form and keep the basis outside the public
 * canonical Citation input contract.
 */
export function parseStoredCitationAnalysisArtifact(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CanonicalLiteratureArtifactValidationError([
            {
                path: "/",
                code: "schema_invalid",
                message: "stored Citation artifact must be an object",
            },
        ]);
    }
    const candidate = value;
    if (typeof candidate.referencesBasis !== "string" ||
        !candidate.referencesBasis) {
        throw new CanonicalLiteratureArtifactValidationError([
            {
                path: "/referencesBasis",
                code: "schema_invalid",
                message: "stored Citation artifact requires a non-empty referencesBasis",
            },
        ]);
    }
    const { referencesBasis } = candidate;
    const { referencesBasis: _ignored, ...publicValue } = candidate;
    const citation = parseCitationAnalysisArtifact(publicValue);
    return { ...citation, referencesBasis };
}
/**
 * Accept either public Citation input or a runtime-stored artifact and return
 * the validated public input projection for Broker/import callers.
 */
/**
 * Produce the portable Citation artifact from either public input or a
 * runtime-stored form. Runtime-only `referencesBasis` is deliberately
 * stripped before export; callers must recompute it against the imported
 * complete References artifact.
 */
export function exportCanonicalCitationAnalysisArtifact(value) {
    if (value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "referencesBasis" in value) {
        const candidate = value;
        const { referencesBasis: _ignored, ...publicValue } = candidate;
        return parseCitationAnalysisArtifact(publicValue);
    }
    return parseCitationAnalysisArtifact(value);
}
/** Backward-named input projection; canonical export owns the implementation. */
export function toCitationAnalysisInput(value) {
    return exportCanonicalCitationAnalysisArtifact(value);
}
