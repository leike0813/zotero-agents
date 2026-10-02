import { SynthesisClientError, assertSynthesisExactFields, toSynthesisJsonObject, toSynthesisJsonValue, } from "./common.js";
export const SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT = 50;
export const SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX = 100;
export const SYNTHESIS_HOST_READ_REF_LIMIT_MAX = 100;
function invalid(location) {
    throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
        location,
    });
}
function stringValue(value, location, allowEmpty = true) {
    if (typeof value !== "string" ||
        (!allowEmpty && value.length === 0) ||
        value.length > 65_536) {
        invalid(location);
    }
    return value;
}
function positiveInteger(value, location, maximum = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > maximum) {
        invalid(location);
    }
    return value;
}
function nonNegativeInteger(value, location, maximum = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > maximum) {
        invalid(location);
    }
    return value;
}
function stringArray(value, location, maximum = 10_000) {
    if (!Array.isArray(value) || value.length > maximum)
        invalid(location);
    return value.map((entry, index) => stringValue(entry, `${location}[${index}]`));
}
function diagnostics(value, location) {
    return stringArray(value, location, 20);
}
function rebuildLibraryItem(value, location) {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, [
        "paperRef",
        "libraryId",
        "itemKey",
        "itemType",
        "title",
        "year",
        "date",
        "creators",
        "tags",
        "collections",
        "doi",
        "arxiv",
        "isbn",
        "url",
        "citekey",
        "dateAdded",
    ], ["updatedAt", "metadataHash"], location);
    const updatedAt = record.updatedAt === undefined
        ? undefined
        : stringValue(record.updatedAt, `${location}.updatedAt`);
    const metadataHash = record.metadataHash === undefined
        ? undefined
        : stringValue(record.metadataHash, `${location}.metadataHash`, false);
    return {
        paperRef: stringValue(record.paperRef, `${location}.paperRef`, false),
        libraryId: positiveInteger(record.libraryId, `${location}.libraryId`),
        itemKey: stringValue(record.itemKey, `${location}.itemKey`, false),
        itemType: stringValue(record.itemType, `${location}.itemType`),
        title: stringValue(record.title, `${location}.title`),
        year: stringValue(record.year, `${location}.year`),
        date: stringValue(record.date, `${location}.date`),
        creators: stringArray(record.creators, `${location}.creators`),
        tags: stringArray(record.tags, `${location}.tags`),
        collections: stringArray(record.collections, `${location}.collections`),
        doi: stringValue(record.doi, `${location}.doi`),
        arxiv: stringValue(record.arxiv, `${location}.arxiv`),
        isbn: stringValue(record.isbn, `${location}.isbn`),
        url: stringValue(record.url, `${location}.url`),
        citekey: stringValue(record.citekey, `${location}.citekey`),
        dateAdded: stringValue(record.dateAdded, `${location}.dateAdded`),
        ...(updatedAt === undefined ? {} : { updatedAt }),
        ...(metadataHash === undefined ? {} : { metadataHash }),
    };
}
function rebuildPageFields(value, location) {
    const record = toSynthesisJsonObject(value, location);
    const snapshotRevision = record.snapshotRevision === undefined
        ? undefined
        : stringValue(record.snapshotRevision, `${location}.snapshotRevision`, false);
    if (typeof record.hasMore !== "boolean")
        invalid(`${location}.hasMore`);
    if (typeof record.returned !== "number" ||
        !Number.isSafeInteger(record.returned) ||
        record.returned < 0) {
        invalid(`${location}.returned`);
    }
    return {
        cursor: stringValue(record.cursor, `${location}.cursor`),
        nextCursor: stringValue(record.nextCursor, `${location}.nextCursor`),
        ...(snapshotRevision === undefined ? {} : { snapshotRevision }),
        hasMore: record.hasMore,
        returned: record.returned,
        limit: positiveInteger(record.limit, `${location}.limit`, 100),
    };
}
export function rebuildSynthesisHostPageRequest(value) {
    const record = toSynthesisJsonObject(value, "hostPageRequest");
    assertSynthesisExactFields(record, ["libraryId"], ["cursor", "limit"], "hostPageRequest");
    return {
        libraryId: positiveInteger(record.libraryId, "hostPageRequest.libraryId"),
        ...(record.cursor === undefined
            ? {}
            : { cursor: stringValue(record.cursor, "hostPageRequest.cursor") }),
        ...(record.limit === undefined
            ? {}
            : {
                limit: positiveInteger(record.limit, "hostPageRequest.limit", SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX),
            }),
    };
}
export function rebuildSynthesisHostLibraryItemsPageResult(value) {
    const record = toSynthesisJsonObject(value, "hostLibraryItemsPageResult");
    assertSynthesisExactFields(record, ["cursor", "nextCursor", "hasMore", "returned", "limit", "items"], ["snapshotRevision"], "hostLibraryItemsPageResult");
    if (!Array.isArray(record.items) || record.items.length > 100) {
        invalid("hostLibraryItemsPageResult.items");
    }
    return {
        ...rebuildPageFields(record, "hostLibraryItemsPageResult"),
        items: record.items.map((entry, index) => rebuildLibraryItem(entry, `hostLibraryItemsPageResult.items[${index}]`)),
    };
}
export function rebuildSynthesisHostLibraryItemsByRefRequest(value) {
    const record = toSynthesisJsonObject(value, "hostLibraryItemsByRefRequest");
    assertSynthesisExactFields(record, ["libraryId", "paperRefs"], [], "hostLibraryItemsByRefRequest");
    const paperRefs = stringArray(record.paperRefs, "hostLibraryItemsByRefRequest.paperRefs", SYNTHESIS_HOST_READ_REF_LIMIT_MAX);
    if (paperRefs.length === 0)
        invalid("hostLibraryItemsByRefRequest.paperRefs");
    return {
        libraryId: positiveInteger(record.libraryId, "hostLibraryItemsByRefRequest.libraryId"),
        paperRefs,
    };
}
export function rebuildSynthesisHostLibraryItemsByRefResult(value) {
    const record = toSynthesisJsonObject(value, "hostLibraryItemsByRefResult");
    assertSynthesisExactFields(record, ["items", "missingPaperRefs"], [], "hostLibraryItemsByRefResult");
    if (!Array.isArray(record.items) || record.items.length > 100) {
        invalid("hostLibraryItemsByRefResult.items");
    }
    return {
        items: record.items.map((entry, index) => rebuildLibraryItem(entry, `hostLibraryItemsByRefResult.items[${index}]`)),
        missingPaperRefs: stringArray(record.missingPaperRefs, "hostLibraryItemsByRefResult.missingPaperRefs", 100),
    };
}
export function rebuildSynthesisHostArtifactScanPageRequest(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactScanPageRequest");
    assertSynthesisExactFields(record, ["libraryId"], ["cursor", "limit", "paperRefs", "artifactTypes"], "hostArtifactScanPageRequest");
    const page = rebuildSynthesisHostPageRequest({
        libraryId: record.libraryId,
        ...(record.cursor === undefined ? {} : { cursor: record.cursor }),
        ...(record.limit === undefined ? {} : { limit: record.limit }),
    });
    const artifactTypes = record.artifactTypes === undefined
        ? undefined
        : stringArray(record.artifactTypes, "hostArtifactScanPageRequest.artifactTypes", 4);
    if (artifactTypes?.some((entry) => entry !== "digest" &&
        entry !== "references" &&
        entry !== "citation_analysis" &&
        entry !== "literature_score")) {
        invalid("hostArtifactScanPageRequest.artifactTypes");
    }
    return {
        ...page,
        ...(record.paperRefs === undefined
            ? {}
            : {
                paperRefs: stringArray(record.paperRefs, "hostArtifactScanPageRequest.paperRefs", 100),
            }),
        ...(artifactTypes === undefined
            ? {}
            : { artifactTypes: artifactTypes }),
    };
}
export function rebuildSynthesisHostArtifactReadinessRequest(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactReadinessRequest");
    assertSynthesisExactFields(record, ["libraryId", "paperRefs"], ["artifactTypes"], "hostArtifactReadinessRequest");
    const rebuilt = rebuildSynthesisHostArtifactScanPageRequest(record);
    if (!rebuilt.paperRefs?.length) {
        invalid("hostArtifactReadinessRequest.paperRefs");
    }
    return {
        libraryId: rebuilt.libraryId,
        paperRefs: rebuilt.paperRefs,
        ...(rebuilt.artifactTypes ? { artifactTypes: rebuilt.artifactTypes } : {}),
    };
}
function rebuildLiteratureQuality(value, location) {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, ["status", "quality_prior", "diagnostics"], [
        "schema",
        "rubric_id",
        "paper_type",
        "overall_score",
        "confidence",
        "confidence_adjusted_score",
        "payload_hash",
    ], location);
    if (record.status !== "available" &&
        record.status !== "missing" &&
        record.status !== "invalid") {
        invalid(`${location}.status`);
    }
    const status = record.status;
    const numeric = (field) => {
        const entry = record[field];
        if (entry !== undefined &&
            (typeof entry !== "number" || !Number.isFinite(entry))) {
            invalid(`${location}.${field}`);
        }
        return entry;
    };
    const qualityPrior = numeric("quality_prior");
    if (qualityPrior === undefined)
        invalid(`${location}.quality_prior`);
    const rebuiltDiagnostics = stringArray(record.diagnostics, `${location}.diagnostics`, 2);
    if (rebuiltDiagnostics.some((entry) => entry !== "literature_score_missing" &&
        entry !== "literature_score_invalid")) {
        invalid(`${location}.diagnostics`);
    }
    return {
        status,
        ...(record.schema === undefined
            ? {}
            : record.schema === "literature_score.v1"
                ? { schema: record.schema }
                : invalid(`${location}.schema`)),
        ...(record.rubric_id === undefined
            ? {}
            : {
                rubric_id: stringValue(record.rubric_id, `${location}.rubric_id`, false),
            }),
        ...(record.paper_type === undefined
            ? {}
            : {
                paper_type: stringValue(record.paper_type, `${location}.paper_type`, false),
            }),
        ...(numeric("overall_score") === undefined
            ? {}
            : { overall_score: numeric("overall_score") }),
        ...(numeric("confidence") === undefined
            ? {}
            : { confidence: numeric("confidence") }),
        ...(numeric("confidence_adjusted_score") === undefined
            ? {}
            : { confidence_adjusted_score: numeric("confidence_adjusted_score") }),
        quality_prior: qualityPrior,
        ...(record.payload_hash === undefined
            ? {}
            : {
                payload_hash: stringValue(record.payload_hash, `${location}.payload_hash`, false),
            }),
        diagnostics: rebuiltDiagnostics,
    };
}
function rebuildArtifactDescriptor(value, location) {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, ["paperRef", "artifactType", "payloadType", "status", "diagnostics"], ["locator", "payloadHash", "estimatedSize", "literatureQuality"], location);
    if (record.artifactType !== "digest" &&
        record.artifactType !== "references" &&
        record.artifactType !== "citation_analysis" &&
        record.artifactType !== "literature_score") {
        invalid(`${location}.artifactType`);
    }
    if (record.status !== "available" &&
        record.status !== "missing" &&
        record.status !== "decode_error" &&
        record.status !== "unsupported") {
        invalid(`${location}.status`);
    }
    const status = record.status;
    const base = {
        paperRef: stringValue(record.paperRef, `${location}.paperRef`, false),
        artifactType: record.artifactType,
        payloadType: stringValue(record.payloadType, `${location}.payloadType`, false),
        status,
        ...(record.locator === undefined
            ? {}
            : { locator: stringValue(record.locator, `${location}.locator`, false) }),
        ...(record.payloadHash === undefined
            ? {}
            : {
                payloadHash: stringValue(record.payloadHash, `${location}.payloadHash`, false),
            }),
        ...(record.estimatedSize === undefined
            ? {}
            : {
                estimatedSize: nonNegativeInteger(record.estimatedSize, `${location}.estimatedSize`),
            }),
        diagnostics: diagnostics(record.diagnostics, `${location}.diagnostics`),
    };
    if (record.artifactType === "literature_score") {
        if (record.literatureQuality === undefined)
            invalid(`${location}.literatureQuality`);
        return {
            ...base,
            artifactType: "literature_score",
            literatureQuality: rebuildLiteratureQuality(record.literatureQuality, `${location}.literatureQuality`),
        };
    }
    if (record.literatureQuality !== undefined)
        invalid(`${location}.literatureQuality`);
    return base;
}
export function rebuildSynthesisHostArtifactScanPageResult(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactScanPageResult");
    assertSynthesisExactFields(record, ["cursor", "nextCursor", "hasMore", "returned", "limit", "artifacts"], ["snapshotRevision"], "hostArtifactScanPageResult");
    if (!Array.isArray(record.artifacts) || record.artifacts.length > 400) {
        invalid("hostArtifactScanPageResult.artifacts");
    }
    return {
        ...rebuildPageFields(record, "hostArtifactScanPageResult"),
        artifacts: record.artifacts.map((entry, index) => rebuildArtifactDescriptor(entry, `hostArtifactScanPageResult.artifacts[${index}]`)),
    };
}
export function rebuildSynthesisHostArtifactReadinessResult(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactReadinessResult");
    assertSynthesisExactFields(record, ["artifacts"], [], "hostArtifactReadinessResult");
    if (!Array.isArray(record.artifacts) || record.artifacts.length > 400) {
        invalid("hostArtifactReadinessResult.artifacts");
    }
    return {
        artifacts: record.artifacts.map((entry, index) => rebuildArtifactDescriptor(entry, `hostArtifactReadinessResult.artifacts[${index}]`)),
    };
}
export function rebuildSynthesisHostArtifactReadRequest(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactReadRequest");
    assertSynthesisExactFields(record, ["locator", "expectedHash"], [], "hostArtifactReadRequest");
    return {
        locator: stringValue(record.locator, "hostArtifactReadRequest.locator", false),
        expectedHash: stringValue(record.expectedHash, "hostArtifactReadRequest.expectedHash", false),
    };
}
export function rebuildSynthesisHostArtifactReadResult(value) {
    const record = toSynthesisJsonObject(value, "hostArtifactReadResult");
    assertSynthesisExactFields(record, ["status", "diagnostics"], ["payloadHash", "currentHash", "content", "referencesBasis"], "hostArtifactReadResult");
    if (record.status !== "available" &&
        record.status !== "missing" &&
        record.status !== "decode_error" &&
        record.status !== "stale") {
        invalid("hostArtifactReadResult.status");
    }
    const status = record.status;
    const content = record.content === undefined
        ? undefined
        : (() => {
            const item = toSynthesisJsonObject(record.content, "hostArtifactReadResult.content");
            if (item.kind === "json") {
                assertSynthesisExactFields(item, ["kind", "value"], [], "hostArtifactReadResult.content");
                return {
                    kind: "json",
                    value: toSynthesisJsonValue(item.value, "hostArtifactReadResult.content.value"),
                };
            }
            if (item.kind === "text") {
                assertSynthesisExactFields(item, ["kind", "text", "mediaType"], [], "hostArtifactReadResult.content");
                if (item.mediaType !== "text/markdown" &&
                    item.mediaType !== "text/plain") {
                    invalid("hostArtifactReadResult.content.mediaType");
                }
                const mediaType = item.mediaType;
                return {
                    kind: "text",
                    text: stringValue(item.text, "hostArtifactReadResult.content.text"),
                    mediaType,
                };
            }
            return invalid("hostArtifactReadResult.content.kind");
        })();
    return {
        status,
        ...(record.payloadHash === undefined
            ? {}
            : {
                payloadHash: stringValue(record.payloadHash, "hostArtifactReadResult.payloadHash", false),
            }),
        ...(record.currentHash === undefined
            ? {}
            : {
                currentHash: stringValue(record.currentHash, "hostArtifactReadResult.currentHash", false),
            }),
        ...(content === undefined ? {} : { content }),
        ...(record.referencesBasis === undefined
            ? {}
            : {
                referencesBasis: stringValue(record.referencesBasis, "hostArtifactReadResult.referencesBasis", false),
            }),
        diagnostics: diagnostics(record.diagnostics, "hostArtifactReadResult.diagnostics"),
    };
}
