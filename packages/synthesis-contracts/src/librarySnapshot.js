export const ZOTERO_LIBRARY_SNAPSHOT_SCHEMA = "zotero-agents.library-full-index.v1";
export const ZOTERO_LIBRARY_SNAPSHOT_SCOPE = "top-level-regular";
export const ZOTERO_LIBRARY_SNAPSHOT_ORDER = "stable_identity";
export const ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_DEFAULT = 500;
export const ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX = 1_000;
export const ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT = 1_000_000;
export const ZOTERO_LIBRARY_SNAPSHOT_TTL_MS = 30 * 60 * 1_000;
function invalid(location) {
    throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
        location,
    });
}
function stringValue(value, location, allowEmpty = false) {
    if (typeof value !== "string" ||
        (!allowEmpty && !value) ||
        value.length > 65_536) {
        invalid(location);
    }
    return value;
}
function integer(value, location, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < minimum ||
        value > maximum) {
        invalid(location);
    }
    return value;
}
function strings(value, location) {
    if (!Array.isArray(value) ||
        value.length > ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT) {
        invalid(location);
    }
    return value.map((entry, index) => stringValue(entry, `${location}[${index}]`, true));
}
function nullableString(value, location) {
    return value === null ? null : stringValue(value, location, true);
}
function rebuildRef(value, location) {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, ["libraryId", "key"], [], location);
    return {
        libraryId: integer(record.libraryId, `${location}.libraryId`, 1),
        key: stringValue(record.key, `${location}.key`),
    };
}
function rebuildCreator(value, location) {
    const record = toSynthesisJsonObject(value, location);
    if (record.representation === "two_field") {
        assertSynthesisExactFields(record, ["representation", "creatorType", "firstName", "lastName"], [], location);
        return {
            representation: "two_field",
            creatorType: stringValue(record.creatorType, `${location}.creatorType`),
            firstName: stringValue(record.firstName, `${location}.firstName`, true),
            lastName: stringValue(record.lastName, `${location}.lastName`, true),
        };
    }
    if (record.representation === "single_field") {
        assertSynthesisExactFields(record, ["representation", "creatorType", "name"], [], location);
        return {
            representation: "single_field",
            creatorType: stringValue(record.creatorType, `${location}.creatorType`),
            name: stringValue(record.name, `${location}.name`),
        };
    }
    invalid(`${location}.representation`);
}
export function rebuildZoteroLibrarySnapshotRequest(value) {
    const location = "librarySnapshotRequest";
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, ["libraryId"], ["batchSize", "snapshotId", "cursor"], location);
    if ((record.snapshotId === undefined) !== (record.cursor === undefined)) {
        invalid(`${location}.continuation`);
    }
    return {
        libraryId: integer(record.libraryId, `${location}.libraryId`, 1),
        ...(record.batchSize === undefined
            ? {}
            : {
                batchSize: integer(record.batchSize, `${location}.batchSize`, 1, ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX),
            }),
        ...(record.snapshotId === undefined
            ? {}
            : {
                snapshotId: stringValue(record.snapshotId, `${location}.snapshotId`),
                cursor: stringValue(record.cursor, `${location}.cursor`),
            }),
    };
}
export function rebuildZoteroLibrarySnapshotItem(value, location = "librarySnapshotItem") {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, [
        "ref",
        "kind",
        "itemType",
        "title",
        "parentRef",
        "state",
        "revision",
        "tags",
        "collectionRefs",
        "creators",
        "date",
        "year",
        "publicationTitle",
        "identifiers",
        "url",
        "noteCount",
        "attachmentCount",
        "annotationCount",
        "modifiedAt",
    ], [], location);
    if (record.kind !== "regular")
        invalid(`${location}.kind`);
    if (record.state !== "active")
        invalid(`${location}.state`);
    const identifiers = toSynthesisJsonObject(record.identifiers, `${location}.identifiers`);
    assertSynthesisExactFields(identifiers, ["doi", "isbn", "issn", "arxiv", "pmid"], [], `${location}.identifiers`);
    if (!Array.isArray(record.collectionRefs)) {
        invalid(`${location}.collectionRefs`);
    }
    if (!Array.isArray(record.creators))
        invalid(`${location}.creators`);
    return {
        ref: rebuildRef(record.ref, `${location}.ref`),
        kind: "regular",
        itemType: stringValue(record.itemType, `${location}.itemType`, true),
        title: stringValue(record.title, `${location}.title`, true),
        parentRef: record.parentRef === null
            ? null
            : rebuildRef(record.parentRef, `${location}.parentRef`),
        state: "active",
        revision: stringValue(record.revision, `${location}.revision`),
        tags: strings(record.tags, `${location}.tags`),
        collectionRefs: record.collectionRefs.map((entry, index) => rebuildRef(entry, `${location}.collectionRefs[${index}]`)),
        creators: record.creators.map((entry, index) => rebuildCreator(entry, `${location}.creators[${index}]`)),
        date: stringValue(record.date, `${location}.date`, true),
        year: nullableString(record.year, `${location}.year`),
        publicationTitle: stringValue(record.publicationTitle, `${location}.publicationTitle`, true),
        identifiers: {
            doi: nullableString(identifiers.doi, `${location}.identifiers.doi`),
            isbn: nullableString(identifiers.isbn, `${location}.identifiers.isbn`),
            issn: nullableString(identifiers.issn, `${location}.identifiers.issn`),
            arxiv: nullableString(identifiers.arxiv, `${location}.identifiers.arxiv`),
            pmid: nullableString(identifiers.pmid, `${location}.identifiers.pmid`),
        },
        url: nullableString(record.url, `${location}.url`),
        noteCount: integer(record.noteCount, `${location}.noteCount`),
        attachmentCount: integer(record.attachmentCount, `${location}.attachmentCount`),
        annotationCount: integer(record.annotationCount, `${location}.annotationCount`),
        modifiedAt: stringValue(record.modifiedAt, `${location}.modifiedAt`, true),
    };
}
export function rebuildZoteroLibrarySnapshotCompletionEvidence(value, location = "librarySnapshotCompletionEvidence") {
    const record = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(record, [
        "snapshotId",
        "schema",
        "libraryId",
        "scope",
        "totalItems",
        "totalBatches",
        "order",
        "contentDigest",
        "completedAt",
    ], [], location);
    if (record.schema !== ZOTERO_LIBRARY_SNAPSHOT_SCHEMA ||
        record.scope !== ZOTERO_LIBRARY_SNAPSHOT_SCOPE ||
        record.order !== ZOTERO_LIBRARY_SNAPSHOT_ORDER) {
        invalid(`${location}.basis`);
    }
    const contentDigest = stringValue(record.contentDigest, `${location}.contentDigest`);
    if (!/^sha256:[a-f0-9]{64}$/u.test(contentDigest)) {
        invalid(`${location}.contentDigest`);
    }
    return {
        snapshotId: stringValue(record.snapshotId, `${location}.snapshotId`),
        schema: ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
        libraryId: integer(record.libraryId, `${location}.libraryId`, 1),
        scope: ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
        totalItems: integer(record.totalItems, `${location}.totalItems`, 0, ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT),
        totalBatches: integer(record.totalBatches, `${location}.totalBatches`),
        order: ZOTERO_LIBRARY_SNAPSHOT_ORDER,
        contentDigest,
        completedAt: stringValue(record.completedAt, `${location}.completedAt`),
    };
}
export function rebuildZoteroLibrarySnapshotPage(value) {
    const location = "librarySnapshotPage";
    const record = toSynthesisJsonObject(value, location);
    const completed = record.outcome === "completed";
    if (!completed && record.outcome !== "active")
        invalid(`${location}.outcome`);
    assertSynthesisExactFields(record, [
        "schema",
        "snapshotId",
        "libraryId",
        "scope",
        "order",
        "batchSize",
        "batchIndex",
        "items",
        "returned",
        "deliveredItems",
        "deliveredBatches",
        "outcome",
        "nextCursor",
        "hasMore",
        ...(completed ? ["completionEvidence"] : []),
    ], [], location);
    if (record.schema !== ZOTERO_LIBRARY_SNAPSHOT_SCHEMA ||
        record.scope !== ZOTERO_LIBRARY_SNAPSHOT_SCOPE ||
        record.order !== ZOTERO_LIBRARY_SNAPSHOT_ORDER ||
        !Array.isArray(record.items)) {
        invalid(`${location}.basis`);
    }
    const page = {
        schema: ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
        snapshotId: stringValue(record.snapshotId, `${location}.snapshotId`),
        libraryId: integer(record.libraryId, `${location}.libraryId`, 1),
        scope: ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
        order: ZOTERO_LIBRARY_SNAPSHOT_ORDER,
        batchSize: integer(record.batchSize, `${location}.batchSize`, 1, ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX),
        batchIndex: integer(record.batchIndex, `${location}.batchIndex`),
        items: record.items.map((entry, index) => rebuildZoteroLibrarySnapshotItem(entry, `${location}.items[${index}]`)),
        returned: integer(record.returned, `${location}.returned`),
        deliveredItems: integer(record.deliveredItems, `${location}.deliveredItems`),
        deliveredBatches: integer(record.deliveredBatches, `${location}.deliveredBatches`),
    };
    if (page.returned !== page.items.length)
        invalid(`${location}.returned`);
    if (completed) {
        if (record.nextCursor !== null || record.hasMore !== false) {
            invalid(`${location}.terminal`);
        }
        const completionEvidence = rebuildZoteroLibrarySnapshotCompletionEvidence(record.completionEvidence, `${location}.completionEvidence`);
        if (completionEvidence.snapshotId !== page.snapshotId ||
            completionEvidence.libraryId !== page.libraryId ||
            completionEvidence.totalItems !== page.deliveredItems ||
            completionEvidence.totalBatches !== page.deliveredBatches) {
            invalid(`${location}.completionEvidence.basis`);
        }
        return {
            ...page,
            outcome: "completed",
            nextCursor: null,
            hasMore: false,
            completionEvidence,
        };
    }
    if (record.hasMore !== true)
        invalid(`${location}.hasMore`);
    return {
        ...page,
        outcome: "active",
        nextCursor: stringValue(record.nextCursor, `${location}.nextCursor`),
        hasMore: true,
    };
}
import { SynthesisClientError, assertSynthesisExactFields, toSynthesisJsonObject, } from "./common.js";
