import { rebuildSynthesisHostItemRef, } from "./itemRef.js";
export const SYNTHESIS_TAG_VOCABULARY_APPLICATION_CONTRACT_VERSION = "synthesis-tag-vocabulary-application.v1";
export const SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS = Object.freeze({
    entries: 25_000,
    aliases: 50_000,
    abbrev: 10_000,
    facets: 256,
    perEntryAliases: 256,
    string: 4096,
    staged: 10_000,
    audit: 10_000,
    page: 100,
});
export class SynthesisTagVocabularyApplicationContractError extends Error {
    location;
    code = "invalid_request";
    constructor(location) {
        super(`Invalid Tag Vocabulary application value at ${location}`);
        this.location = location;
        this.name = "SynthesisTagVocabularyApplicationContractError";
    }
}
const HASH = /^sha256:[a-f0-9]{64}$/;
function invalid(location) {
    throw new SynthesisTagVocabularyApplicationContractError(location);
}
function object(value, location) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return invalid(location);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
        invalid(location);
    return value;
}
function exact(value, fields, location) {
    const allowed = new Set(fields);
    if (Object.keys(value).some((field) => !allowed.has(field))) {
        invalid(`${location}.fields`);
    }
}
function string(value, location, optional = false) {
    if (value === undefined && optional)
        return undefined;
    if (typeof value !== "string")
        return invalid(location);
    const normalized = value.trim();
    if ((!normalized && !optional) ||
        normalized.length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.string) {
        return invalid(location);
    }
    return normalized || undefined;
}
function hashOrNull(value, location) {
    if (value === null)
        return null;
    if (typeof value !== "string" || !HASH.test(value))
        return invalid(location);
    return value;
}
function revision(value, location) {
    if (!Number.isSafeInteger(value) || Number(value) < 0)
        return invalid(location);
    return Number(value);
}
function boolean(value, location) {
    if (typeof value !== "boolean")
        return invalid(location);
    return value;
}
function stringList(value, location, max) {
    if (!Array.isArray(value) || value.length > max)
        return invalid(location);
    const rows = value.map((entry, index) => string(entry, `${location}[${index}]`));
    if (new Set(rows).size !== rows.length)
        invalid(`${location}.unique`);
    return rows;
}
function entry(value, index) {
    const location = `tagCandidate.entries[${index}]`;
    const input = object(value, location);
    exact(input, [
        "tag",
        "facet",
        "note",
        "deprecated",
        "replacement",
        "aliases",
        "abbrev",
        "source",
        "usageCount",
        "lastSyncedAt",
        "createdAt",
        "updatedAt",
    ], location);
    if (input.deprecated !== undefined && typeof input.deprecated !== "boolean") {
        invalid(`${location}.deprecated`);
    }
    const engineEntry = {
        tag: string(input.tag, `${location}.tag`),
        facet: string(input.facet, `${location}.facet`),
        aliases: stringList(input.aliases, `${location}.aliases`, SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.perEntryAliases).sort((left, right) => left.localeCompare(right)),
        abbrev: stringList(input.abbrev, `${location}.abbrev`, SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.perEntryAliases).sort((left, right) => left.localeCompare(right)),
    };
    const note = string(input.note, `${location}.note`, true);
    const replacement = string(input.replacement, `${location}.replacement`, true);
    if (note)
        engineEntry.note = note;
    if (input.deprecated === true)
        engineEntry.deprecated = true;
    if (replacement)
        engineEntry.replacement = replacement;
    if (`${engineEntry.tag} ${engineEntry.note || ""} ${engineEntry.aliases.join(" ")} ${engineEntry.abbrev.join(" ")}`.toLowerCase()
        .length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.string) {
        invalid(`${location}.searchText`);
    }
    const usageCount = input.usageCount;
    if (usageCount !== undefined &&
        (!Number.isSafeInteger(usageCount) || Number(usageCount) < 0)) {
        invalid(`${location}.usageCount`);
    }
    return {
        ...engineEntry,
        ...(string(input.source, `${location}.source`, true)
            ? { source: string(input.source, `${location}.source`, true) }
            : {}),
        ...(usageCount === undefined ? {} : { usageCount: Number(usageCount) }),
        ...["lastSyncedAt", "createdAt", "updatedAt"].reduce((result, field) => {
            const normalized = string(input[field], `${location}.${field}`, true);
            return normalized ? { ...result, [field]: normalized } : result;
        }, {}),
    };
}
function stringRecord(value, location, max, lowercaseKeys = false) {
    const input = object(value, location);
    const pairs = Object.entries(input);
    if (pairs.length > max)
        invalid(location);
    const result = new Map();
    for (const [rawKey, rawValue] of pairs) {
        const cleaned = string(rawKey, `${location}.key`);
        const key = lowercaseKeys ? cleaned.toLowerCase() : cleaned;
        if (result.has(key))
            invalid(`${location}.unique`);
        result.set(key, string(rawValue, `${location}.${rawKey}`));
    }
    return Object.fromEntries([...result.entries()].sort(([left], [right]) => left.localeCompare(right)));
}
function protocol(value) {
    const input = object(value, "tagCandidate.protocol");
    exact(input, ["version", "tagPattern", "maxTagLength", "facets"], "tagCandidate.protocol");
    if (!Number.isSafeInteger(input.maxTagLength) ||
        Number(input.maxTagLength) <= 0) {
        invalid("tagCandidate.protocol.maxTagLength");
    }
    const tagPattern = string(input.tagPattern, "tagCandidate.protocol.tagPattern");
    try {
        new RegExp(tagPattern);
    }
    catch {
        invalid("tagCandidate.protocol.tagPattern");
    }
    return {
        version: string(input.version, "tagCandidate.protocol.version"),
        tagPattern,
        maxTagLength: Number(input.maxTagLength),
        facets: stringList(input.facets, "tagCandidate.protocol.facets", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.facets).sort((left, right) => left.localeCompare(right)),
    };
}
export function rebuildSynthesisTagVocabularyApplicationCandidate(value) {
    const input = object(value, "tagCandidate");
    exact(input, ["entries", "aliases", "abbrev", "protocol"], "tagCandidate");
    if (!Array.isArray(input.entries) ||
        input.entries.length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.entries) {
        invalid("tagCandidate.entries");
    }
    const entries = input.entries.map(entry);
    if (new Set(entries.map((row) => row.tag.toLowerCase())).size !== entries.length) {
        invalid("tagCandidate.entries.unique");
    }
    return {
        entries: entries.sort((left, right) => left.facet.localeCompare(right.facet) ||
            left.tag.localeCompare(right.tag, "en", { sensitivity: "base" })),
        aliases: stringRecord(input.aliases, "tagCandidate.aliases", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.aliases),
        abbrev: stringRecord(input.abbrev, "tagCandidate.abbrev", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.abbrev, true),
        protocol: protocol(input.protocol),
    };
}
export function rebuildSynthesisTagVocabularyApplicationSaveRequest(value) {
    const input = object(value, "tagSave");
    exact(input, ["expectedVocabularyHash", "candidate"], "tagSave");
    return {
        expectedVocabularyHash: hashOrNull(input.expectedVocabularyHash, "tagSave.expectedVocabularyHash"),
        candidate: rebuildSynthesisTagVocabularyApplicationCandidate(input.candidate),
    };
}
export function rebuildSynthesisTagVocabularyApplicationPageRequest(value) {
    const input = object(value, "tagPage");
    exact(input, ["cursor", "limit"], "tagPage");
    const limit = Number(input.limit);
    if (!Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.page) {
        invalid("tagPage.limit");
    }
    return { cursor: string(input.cursor, "tagPage.cursor", true) || "", limit };
}
function stagedSuggestion(value, location) {
    const input = object(value, location);
    exact(input, [
        "tag",
        "facet",
        "note",
        "sourceFlow",
        "parentBindings",
        "createdAt",
        "updatedAt",
    ], location);
    if (!Array.isArray(input.parentBindings) ||
        input.parentBindings.length > 10_000) {
        invalid(`${location}.parentBindings`);
    }
    const parentBindings = input.parentBindings.map((row, index) => rebuildSynthesisHostItemRef(row, `${location}.parentBindings[${index}]`));
    const keys = parentBindings.map((row) => `${row.libraryId}\n${row.itemKey}`);
    if (new Set(keys).size !== keys.length)
        invalid(`${location}.parentBindings.unique`);
    return {
        tag: string(input.tag, `${location}.tag`),
        facet: string(input.facet, `${location}.facet`),
        ...(string(input.note, `${location}.note`, true)
            ? { note: string(input.note, `${location}.note`, true) }
            : {}),
        ...(string(input.sourceFlow, `${location}.sourceFlow`, true)
            ? { sourceFlow: string(input.sourceFlow, `${location}.sourceFlow`, true) }
            : {}),
        parentBindings: parentBindings.sort((left, right) => left.libraryId - right.libraryId ||
            left.itemKey.localeCompare(right.itemKey)),
        ...(string(input.createdAt, `${location}.createdAt`, true)
            ? { createdAt: string(input.createdAt, `${location}.createdAt`, true) }
            : {}),
        ...(string(input.updatedAt, `${location}.updatedAt`, true)
            ? { updatedAt: string(input.updatedAt, `${location}.updatedAt`, true) }
            : {}),
    };
}
export function rebuildSynthesisTagVocabularyApplicationStageRequest(value) {
    const input = object(value, "tagStage");
    exact(input, ["expectedStagedRevision", "entries"], "tagStage");
    if (!Array.isArray(input.entries) ||
        input.entries.length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.staged) {
        invalid("tagStage.entries");
    }
    return {
        expectedStagedRevision: revision(input.expectedStagedRevision, "tagStage.expectedStagedRevision"),
        entries: input.entries.map((row, index) => stagedSuggestion(row, `tagStage.entries[${index}]`)),
    };
}
export function rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest(value) {
    const input = object(value, "tagUpdateStaged");
    exact(input, ["expectedStagedRevision", "originalTag", "entry"], "tagUpdateStaged");
    return {
        expectedStagedRevision: revision(input.expectedStagedRevision, "tagUpdateStaged.expectedStagedRevision"),
        originalTag: string(input.originalTag, "tagUpdateStaged.originalTag"),
        entry: stagedSuggestion(input.entry, "tagUpdateStaged.entry"),
    };
}
export function rebuildSynthesisTagVocabularyApplicationSelectionRequest(value) {
    const input = object(value, "tagSelection");
    exact(input, ["expectedVocabularyHash", "expectedStagedRevision", "tags"], "tagSelection");
    return {
        expectedVocabularyHash: hashOrNull(input.expectedVocabularyHash, "tagSelection.expectedVocabularyHash"),
        expectedStagedRevision: revision(input.expectedStagedRevision, "tagSelection.expectedStagedRevision"),
        tags: stringList(input.tags, "tagSelection.tags", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.staged),
    };
}
export function rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest(value) {
    const input = object(value, "tagEntryUpdate");
    exact(input, ["expectedVocabularyHash", "originalTag", "tag", "facet", "note"], "tagEntryUpdate");
    return {
        expectedVocabularyHash: hashOrNull(input.expectedVocabularyHash, "tagEntryUpdate.expectedVocabularyHash"),
        originalTag: string(input.originalTag, "tagEntryUpdate.originalTag"),
        tag: string(input.tag, "tagEntryUpdate.tag"),
        facet: string(input.facet, "tagEntryUpdate.facet"),
        note: string(input.note, "tagEntryUpdate.note", true),
    };
}
export function rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest(value) {
    const input = object(value, "tagEntryDelete");
    exact(input, ["expectedVocabularyHash", "originalTag"], "tagEntryDelete");
    return {
        expectedVocabularyHash: hashOrNull(input.expectedVocabularyHash, "tagEntryDelete.expectedVocabularyHash"),
        originalTag: string(input.originalTag, "tagEntryDelete.originalTag"),
    };
}
export function rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest(value) {
    const input = object(value, "tagRebuildIndex");
    exact(input, ["expectedVocabularyHash"], "tagRebuildIndex");
    const expectedVocabularyHash = hashOrNull(input.expectedVocabularyHash, "tagRebuildIndex.expectedVocabularyHash");
    if (!expectedVocabularyHash)
        invalid("tagRebuildIndex.expectedVocabularyHash");
    return { expectedVocabularyHash };
}
export function rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest(value) {
    const input = object(value, "tagAuditReplace");
    exact(input, ["libraryId", "entries"], "tagAuditReplace");
    if (!Number.isSafeInteger(input.libraryId) || Number(input.libraryId) <= 0) {
        invalid("tagAuditReplace.libraryId");
    }
    if (!Array.isArray(input.entries) ||
        input.entries.length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.audit) {
        invalid("tagAuditReplace.entries");
    }
    const libraryId = Number(input.libraryId);
    const entries = input.entries.map((row, index) => {
        const location = `tagAuditReplace.entries[${index}]`;
        const entry = object(row, location);
        exact(entry, ["itemKey", "needsTagRegulation", "nonCompliantTags"], location);
        if (typeof entry.needsTagRegulation !== "boolean") {
            invalid(`${location}.needsTagRegulation`);
        }
        return {
            libraryId,
            itemKey: string(entry.itemKey, `${location}.itemKey`),
            needsTagRegulation: entry.needsTagRegulation,
            nonCompliantTags: stringList(entry.nonCompliantTags, `${location}.nonCompliantTags`, 10_000),
        };
    });
    if (new Set(entries.map((row) => row.itemKey)).size !== entries.length) {
        invalid("tagAuditReplace.entries.unique");
    }
    return { libraryId, entries };
}
export function rebuildSynthesisTagVocabularyApplicationAuditClearRequest(value) {
    const input = object(value, "tagAuditClear");
    exact(input, ["libraryId", "itemKey"], "tagAuditClear");
    if (!Number.isSafeInteger(input.libraryId) || Number(input.libraryId) <= 0) {
        invalid("tagAuditClear.libraryId");
    }
    return {
        libraryId: Number(input.libraryId),
        itemKey: string(input.itemKey, "tagAuditClear.itemKey"),
    };
}
export function rebuildSynthesisTagVocabularyApplicationState(value) {
    const input = object(value, "tagState");
    exact(input, [
        "vocabularyHash",
        "stagedRevision",
        "indexHash",
        "indexBasisHash",
        "indexStale",
        "entryCount",
        "stagedCount",
        "auditCount",
        "pendingEffectCount",
    ], "tagState");
    return {
        vocabularyHash: hashOrNull(input.vocabularyHash, "tagState.vocabularyHash"),
        stagedRevision: revision(input.stagedRevision, "tagState.stagedRevision"),
        indexHash: hashOrNull(input.indexHash, "tagState.indexHash"),
        indexBasisHash: hashOrNull(input.indexBasisHash, "tagState.indexBasisHash"),
        indexStale: boolean(input.indexStale, "tagState.indexStale"),
        entryCount: revision(input.entryCount, "tagState.entryCount"),
        stagedCount: revision(input.stagedCount, "tagState.stagedCount"),
        auditCount: revision(input.auditCount, "tagState.auditCount"),
        pendingEffectCount: revision(input.pendingEffectCount, "tagState.pendingEffectCount"),
    };
}
export function rebuildSynthesisTagVocabularyApplicationStagedPage(value) {
    const input = object(value, "tagStagedPage");
    exact(input, ["entries", "nextCursor", "stagedRevision"], "tagStagedPage");
    if (!Array.isArray(input.entries) ||
        input.entries.length > SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.page) {
        invalid("tagStagedPage.entries");
    }
    const nextCursor = input.nextCursor;
    if (nextCursor !== null && typeof nextCursor !== "string") {
        invalid("tagStagedPage.nextCursor");
    }
    return {
        entries: input.entries.map((row, index) => stagedSuggestion(row, `tagStagedPage.entries[${index}]`)),
        nextCursor: nextCursor === null
            ? null
            : string(nextCursor, "tagStagedPage.nextCursor"),
        stagedRevision: revision(input.stagedRevision, "tagStagedPage.stagedRevision"),
    };
}
const MUTATION_STATUSES = new Set([
    "committed",
    "unchanged",
    "not_found",
    "conflict",
    "basis_mismatch",
    "tag_vocabulary_busy",
    "invalid_request",
    "engine_failed",
    "worker_failed",
    "stopping",
    "repair_required",
]);
export function rebuildSynthesisTagVocabularyApplicationMutationResult(value) {
    const input = object(value, "tagMutationResult");
    exact(input, [
        "status",
        "vocabularyHash",
        "stagedRevision",
        "warnings",
        "changedTags",
        "diagnostics",
    ], "tagMutationResult");
    if (!MUTATION_STATUSES.has(input.status)) {
        invalid("tagMutationResult.status");
    }
    if (!Array.isArray(input.diagnostics) || input.diagnostics.length > 20) {
        invalid("tagMutationResult.diagnostics");
    }
    return {
        status: input.status,
        vocabularyHash: hashOrNull(input.vocabularyHash, "tagMutationResult.vocabularyHash"),
        stagedRevision: revision(input.stagedRevision, "tagMutationResult.stagedRevision"),
        warnings: stringList(input.warnings, "tagMutationResult.warnings", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.entries),
        changedTags: stringList(input.changedTags, "tagMutationResult.changedTags", SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.entries),
        diagnostics: input.diagnostics.map((value, index) => {
            const location = `tagMutationResult.diagnostics[${index}]`;
            const diagnostic = object(value, location);
            exact(diagnostic, ["code", "severity"], location);
            if (diagnostic.severity !== "warning" &&
                diagnostic.severity !== "error") {
                invalid(`${location}.severity`);
            }
            return {
                code: string(diagnostic.code, `${location}.code`),
                severity: diagnostic.severity,
            };
        }),
    };
}
