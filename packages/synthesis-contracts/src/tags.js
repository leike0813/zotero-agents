import { rebuildSynthesisHostItemRef, } from "./itemRef";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
import { assertSynthesisExactFields, SynthesisClientError, toSynthesisJsonObject, } from "./common";
import { byteLengthSynthesisContractText } from "./canonicalJson";
export function rebuildTagVocabularyRegulatorExportDto(value) {
    const result = toSynthesisJsonObject(value, "tagVocabularyRegulatorExport");
    assertSynthesisExactFields(result, ["vocabularyHash", "allowedTags"], [], "tagVocabularyRegulatorExport");
    if (typeof result.vocabularyHash !== "string" ||
        !result.vocabularyHash.trim() ||
        result.vocabularyHash.length > 256 ||
        !Array.isArray(result.allowedTags) ||
        result.allowedTags.length > 100_000 ||
        result.allowedTags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 200) ||
        byteLengthSynthesisContractText(JSON.stringify(result)) > 16 * 1024 * 1024) {
        throw new SynthesisClientError("invalid_request", "Tag regulator vocabulary export is invalid", { location: "tagVocabularyRegulatorExport" });
    }
    return result;
}
export const SYNTHESIS_TAG_AUDIT_APPEND_MAX_ROWS = 500;
export const SYNTHESIS_TAG_AUDIT_ROW_MAX_TAGS = 100;
export const SYNTHESIS_TAG_AUDIT_APPEND_MAX_BYTES = 8 * 1024 * 1024;
function invalidTagAudit(location) {
    throw new SynthesisClientError("invalid_request", "Tag audit input is invalid", {
        location,
    });
}
function boundedAuditString(value, location) {
    if (typeof value !== "string" || !value.trim() || value.length > 256) {
        return invalidTagAudit(location);
    }
    return value;
}
function rebuildAuditTags(value, location) {
    if (!Array.isArray(value) ||
        value.length > SYNTHESIS_TAG_AUDIT_ROW_MAX_TAGS) {
        return invalidTagAudit(location);
    }
    const tags = value.map((entry, index) => {
        if (typeof entry !== "string" || !entry.trim() || entry.length > 200) {
            return invalidTagAudit(`${location}[${index}]`);
        }
        return entry;
    });
    if (new Set(tags).size !== tags.length ||
        tags.some((tag, index) => index > 0 && tags[index - 1] >= tag)) {
        return invalidTagAudit(location);
    }
    return tags;
}
export function rebuildTagAuditStagingEntries(value) {
    if (!Array.isArray(value) ||
        value.length > SYNTHESIS_TAG_AUDIT_APPEND_MAX_ROWS) {
        return invalidTagAudit("tagAudit.entries");
    }
    const entries = value.map((entry, index) => {
        const location = `tagAudit.entries[${index}]`;
        const input = toSynthesisJsonObject(entry, location);
        assertSynthesisExactFields(input, [
            "target",
            "auditedRevision",
            "auditedTagDigest",
            "auditedTags",
            "evaluation",
        ], [], location);
        const auditedTags = rebuildAuditTags(input.auditedTags, `${location}.auditedTags`);
        const evaluation = toSynthesisJsonObject(input.evaluation, `${location}.evaluation`);
        if (evaluation.state === "compliant") {
            assertSynthesisExactFields(evaluation, ["state"], [], `${location}.evaluation`);
            return {
                target: rebuildSynthesisHostItemRef(input.target, `${location}.target`),
                auditedRevision: boundedAuditString(input.auditedRevision, `${location}.auditedRevision`),
                auditedTagDigest: boundedAuditString(input.auditedTagDigest, `${location}.auditedTagDigest`),
                auditedTags,
                evaluation: { state: "compliant" },
            };
        }
        assertSynthesisExactFields(evaluation, ["state", "nonCompliantTags"], [], `${location}.evaluation`);
        if (evaluation.state !== "needs_regulation") {
            return invalidTagAudit(`${location}.evaluation.state`);
        }
        const nonCompliantTags = rebuildAuditTags(evaluation.nonCompliantTags, `${location}.evaluation.nonCompliantTags`);
        const audited = new Set(auditedTags);
        if (nonCompliantTags.some((tag) => !audited.has(tag))) {
            return invalidTagAudit(`${location}.evaluation.nonCompliantTags`);
        }
        return {
            target: rebuildSynthesisHostItemRef(input.target, `${location}.target`),
            auditedRevision: boundedAuditString(input.auditedRevision, `${location}.auditedRevision`),
            auditedTagDigest: boundedAuditString(input.auditedTagDigest, `${location}.auditedTagDigest`),
            auditedTags,
            evaluation: { state: "needs_regulation", nonCompliantTags },
        };
    });
    if (byteLengthSynthesisContractText(JSON.stringify(entries)) >
        SYNTHESIS_TAG_AUDIT_APPEND_MAX_BYTES) {
        return invalidTagAudit("tagAudit.entries");
    }
    return entries;
}
export function rebuildTagRegulationVerifiedCommitDto(value) {
    const input = toSynthesisJsonObject(value, "tagRegulationVerifiedCommit");
    assertSynthesisExactFields(input, [
        "schema",
        "target",
        "receiptId",
        "expectedSnapshotRevision",
        "auditedRevision",
        "currentRevision",
        "finalTagDigest",
        "finalTags",
        "vocabularyHash",
    ], [], "tagRegulationVerifiedCommit");
    if (input.schema !== "zotero-agents.tag-regulation-verified-commit.v1") {
        return invalidTagAudit("tagRegulationVerifiedCommit.schema");
    }
    return {
        schema: input.schema,
        target: rebuildSynthesisHostItemRef(input.target, "tagRegulationVerifiedCommit.target"),
        receiptId: boundedAuditString(input.receiptId, "tagRegulationVerifiedCommit.receiptId"),
        expectedSnapshotRevision: boundedAuditString(input.expectedSnapshotRevision, "tagRegulationVerifiedCommit.expectedSnapshotRevision"),
        auditedRevision: boundedAuditString(input.auditedRevision, "tagRegulationVerifiedCommit.auditedRevision"),
        currentRevision: boundedAuditString(input.currentRevision, "tagRegulationVerifiedCommit.currentRevision"),
        finalTagDigest: boundedAuditString(input.finalTagDigest, "tagRegulationVerifiedCommit.finalTagDigest"),
        finalTags: rebuildAuditTags(input.finalTags, "tagRegulationVerifiedCommit.finalTags"),
        vocabularyHash: boundedAuditString(input.vocabularyHash, "tagRegulationVerifiedCommit.vocabularyHash"),
    };
}
export function rebuildSynthesisTagCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}
export const SYNTHESIS_TAG_IMPORT_ACTIONS = [
    "use-imported",
    "merge-non-conflicting",
];
