import { summarizeLibraryGeneratedArtifacts } from "../zoteroHost/libraryArtifactReadiness";
import { queryZoteroLibraryPage, ZoteroLibraryCursorError, } from "../zoteroHost/zoteroLibraryPageQuery";
import { SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT, SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX, SYNTHESIS_HOST_READ_REF_LIMIT_MAX, SynthesisClientError, toSynthesisJsonValue, } from "../../../packages/synthesis-contracts/src/index";
import { createZoteroHostCapabilityBroker, } from "../zoteroHostCapabilityBroker";
import { parseCitationAnalysisArtifact, parseSourceReferenceArtifact, } from "../../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import { hashCanonicalJson, hashMarkdown } from "./foundation";
import { buildReferenceSidecarMetadataFingerprintPayload, PAPER_ARTIFACT_PAYLOAD_TYPES, PAPER_ARTIFACT_TYPES, } from "./registry";
import { buildLiteratureQualitySnapshot, literatureQualityPrior, parseLiteratureScore, } from "../../shared/literatureScore";
import { yieldToEventLoop } from "../../utils/runtimeCompatibility";
const ARTIFACT_TYPE_ALIASES = {
    digest: "digest",
    "digest-markdown": "digest",
    references: "references",
    reference: "references",
    "references-json": "references",
    citation_analysis: "citation_analysis",
    citationAnalysis: "citation_analysis",
    "citation-analysis": "citation_analysis",
    "citation-analysis-json": "citation_analysis",
    literature_score: "literature_score",
    literatureScore: "literature_score",
    "literature-score": "literature_score",
    "literature-score-json": "literature_score",
};
function cleanString(value) {
    return String(value || "").trim();
}
function managedNoteKind(value) {
    return value === "custom" ||
        value === "conversation-note" ||
        value === "digest" ||
        value === "references" ||
        value === "citation-analysis" ||
        value === "literature-score"
        ? value
        : null;
}
function normalizeLibraryId(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
function readField(item, field) {
    try {
        return cleanString(item?.getField?.(field));
    }
    catch {
        return "";
    }
}
function extractCitekeyFromExtra(extraValue) {
    const match = String(extraValue || "").match(/(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i);
    return cleanString(match?.[1]);
}
function getCitekey(item) {
    return (readField(item, "citationKey") ||
        cleanString(item?.toJSON?.()?.citationKey) ||
        extractCitekeyFromExtra(readField(item, "extra")));
}
function getYearFromValue(value) {
    return (cleanString(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[1] || "");
}
function getYear(item) {
    const json = typeof item?.toJSON === "function" ? item.toJSON?.() || {} : {};
    const candidates = [
        readField(item, "year"),
        cleanString(item?.year),
        cleanString(json?.year),
        readField(item, "date"),
        cleanString(json?.date),
    ];
    for (const candidate of candidates) {
        const year = getYearFromValue(candidate);
        if (year) {
            return year;
        }
    }
    return "";
}
function getTitle(item) {
    return readField(item, "title") || cleanString(item?.getDisplayTitle?.());
}
function getCreators(item) {
    try {
        const creators = item?.getCreators?.() || [];
        const names = creators
            .map((creator) => cleanString([creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
            creator.name ||
            creator.lastName ||
            creator.firstName))
            .filter(Boolean);
        if (names.length) {
            return names;
        }
    }
    catch {
        // fall through to firstCreator
    }
    const firstCreator = cleanString(item?.firstCreator);
    return firstCreator ? [firstCreator] : [];
}
function getTags(item) {
    try {
        return Array.from(new Set((item?.getTags?.() || [])
            .map((entry) => cleanString(entry?.tag))
            .filter(Boolean))).sort((left, right) => left.localeCompare(right));
    }
    catch {
        return [];
    }
}
function collectionRefs(item) {
    try {
        return (item?.getCollections?.() || [])
            .map((entry) => cleanString(entry))
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right));
    }
    catch {
        return [];
    }
}
function zoteroRuntime() {
    const zotero = globalThis.Zotero;
    if (!zotero) {
        throw new Error("Zotero runtime is unavailable for synthesis library adapter");
    }
    return zotero;
}
const SYNTHESIS_CANONICAL_PAGE_LIMIT = 100;
async function readCanonicalPages(readPage, rowsFromPage, resource) {
    const rows = [];
    let cursor;
    for (;;) {
        const page = await readPage({
            limit: SYNTHESIS_CANONICAL_PAGE_LIMIT,
            ...(cursor ? { cursor } : {}),
        });
        rows.push(...rowsFromPage(page));
        if (!page.hasMore) {
            return rows;
        }
        const nextCursor = cleanString(page.nextCursor);
        if (!nextCursor || nextCursor === cursor) {
            throw new Error(`${resource} page cursor did not advance`);
        }
        cursor = nextCursor;
        await yieldToEventLoop();
    }
}
async function childNotes(item, broker) {
    const parentRef = {
        libraryId: normalizeLibraryId(item?.libraryID),
        key: cleanString(item?.key),
    };
    if (!parentRef.key) {
        return [];
    }
    const notes = await readCanonicalPages((page) => broker.library.getItemNotes(parentRef, page), (page) => page.notes, "item notes");
    const rows = [];
    for (const note of notes) {
        try {
            const detail = await broker.library.getNoteDetail(note.ref, {
                format: "text",
            });
            const issue = detail.kind === "managed" &&
                detail.noteKind === "citation-analysis" &&
                detail.health?.state === "stale"
                ? "references_basis_mismatch"
                : null;
            rows.push({
                key: cleanString(note.ref.key),
                title: cleanString(note.title || detail.title),
                updatedAt: cleanString(note.revision || detail.revision),
                noteKind: detail.kind === "managed" ? detail.noteKind : null,
                payload: detail.kind === "managed" ? detail.payload : null,
                ...(detail.kind === "managed" && detail.provenance
                    ? { provenance: detail.provenance }
                    : {}),
                issue,
            });
        }
        catch (error) {
            const code = typeof error === "object" && error && "code" in error
                ? cleanString(error.code)
                : "";
            const details = typeof error === "object" && error && "details" in error
                ? error.details
                : undefined;
            const ambiguousNote = code === "conflict" &&
                details !== null &&
                typeof details === "object" &&
                !Array.isArray(details) &&
                details.reason === "ambiguous_state" &&
                details.kind === "note";
            if (code !== "invalid_artifact" &&
                code !== "legacy_artifact_requires_migration" &&
                code !== "resource_limited" &&
                !ambiguousNote) {
                throw error;
            }
            const diagnosticNoteKind = details && typeof details === "object" && !Array.isArray(details)
                ? managedNoteKind(details.noteKind) ||
                    managedNoteKind(details.managedType)
                : null;
            rows.push({
                key: cleanString(note.ref.key),
                title: cleanString(note.title),
                updatedAt: cleanString(note.revision),
                noteKind: diagnosticNoteKind,
                payload: null,
                issue: ambiguousNote ? "ambiguous_state" : code,
            });
        }
    }
    return rows.filter((note) => note.key);
}
async function paperInputFromItem(item, fallbackLibraryId, broker) {
    const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
    const notes = await childNotes(item, broker);
    return {
        libraryId,
        itemKey: cleanString(item?.key),
        title: getTitle(item),
        year: getYear(item),
        itemType: cleanString(item?.itemType),
        tags: getTags(item),
        collections: collectionRefs(item),
        notes,
        creators: getCreators(item),
        doi: readField(item, "DOI"),
        arxiv: readField(item, "arXiv"),
        isbn: readField(item, "ISBN"),
        url: readField(item, "url"),
        citekey: getCitekey(item),
        dateAdded: cleanString(item?.dateAdded),
        ...(await literatureAnalysisSummaryFromNotes(notes)),
    };
}
async function paperInputSummaryFromItem(item, fallbackLibraryId) {
    const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
    return {
        libraryId,
        itemKey: cleanString(item?.key),
        title: getTitle(item),
        year: getYear(item),
        itemType: cleanString(item?.itemType),
        tags: getTags(item),
        collections: collectionRefs(item),
        creators: getCreators(item),
        doi: readField(item, "DOI"),
        arxiv: readField(item, "arXiv"),
        isbn: readField(item, "ISBN"),
        url: readField(item, "url"),
        citekey: getCitekey(item),
        dateAdded: cleanString(item?.dateAdded),
    };
}
async function literatureAnalysisSummaryFromNotes(notes) {
    const readiness = await summarizeLibraryGeneratedArtifacts(notes.map((note) => ({
        key: note.key,
        title: note.title || "",
        updatedAt: note.updatedAt || "",
        noteKind: note.noteKind ?? null,
        payload: note.payload ?? null,
        issue: note.issue ?? null,
        ...(note.provenance ? { provenance: note.provenance } : {}),
    })));
    const score = readiness.score;
    return {
        literatureAnalysisArtifacts: {
            digest: readiness.artifacts.has("digest"),
            references: readiness.artifacts.has("references"),
            citationAnalysis: readiness.artifacts.has("citation-analysis"),
            literatureScore: readiness.scoreStatus,
        },
        literatureScore: score || undefined,
    };
}
function metadataFingerprintFromItem(item, fallbackLibraryId) {
    const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
    const itemKey = cleanString(item?.key);
    const deleted = typeof item?.isDeleted === "function"
        ? item.isDeleted()
        : Boolean(item?.deleted);
    const metadata = buildReferenceSidecarMetadataFingerprintPayload({
        title: getTitle(item),
        year: getYear(item),
        itemType: cleanString(item?.itemType),
        creators: getCreators(item),
        tags: getTags(item),
        collections: collectionRefs(item),
        doi: readField(item, "DOI"),
        isbn: readField(item, "ISBN"),
        url: readField(item, "url"),
        arxiv: "",
    });
    return {
        library_id: libraryId,
        item_key: itemKey,
        paper_ref: `${libraryId}:${itemKey}`,
        deleted,
        hash: hashCanonicalJson(metadata),
        updated_at: cleanString(item?.dateModified || item?.dateAdded) || undefined,
    };
}
function isVisibleTopLevelRegular(item) {
    if (!item) {
        return false;
    }
    const regular = typeof item?.isRegularItem === "function"
        ? item.isRegularItem()
        : !item?.isNote?.() && !item?.isAttachment?.();
    const topLevel = typeof item?.isTopLevelItem === "function"
        ? item.isTopLevelItem()
        : !Number(item?.parentItemID || item?.parentID || 0);
    const deleted = typeof item?.isDeleted === "function"
        ? item.isDeleted()
        : Boolean(item?.deleted);
    return regular && topLevel && !deleted;
}
function itemByLibraryAndKey(libraryId, itemKey) {
    const zotero = zoteroRuntime();
    return zotero.Items?.getByLibraryAndKey?.(libraryId, itemKey) || null;
}
function resolveCollection(ref, libraryId) {
    const zotero = zoteroRuntime();
    const numeric = Number(ref);
    const byId = Number.isFinite(numeric)
        ? zotero.Collections?.get?.(numeric)
        : null;
    if (byId) {
        return byId;
    }
    return zotero.Collections?.getByLibraryAndKey?.(libraryId, ref) || null;
}
function collectionIndex(inputs, libraryId) {
    const counts = new Map();
    for (const input of inputs) {
        for (const ref of input.collections || []) {
            const key = cleanString(ref);
            if (key) {
                counts.set(key, (counts.get(key) || 0) + 1);
            }
        }
    }
    return [...counts.entries()]
        .map(([ref, count]) => {
        const collection = resolveCollection(ref, libraryId);
        return {
            id: cleanString(collection?.id || ref),
            key: cleanString(collection?.key || ref),
            name: cleanString(collection?.name || ref),
            library_id: normalizeLibraryId(collection?.libraryID, libraryId),
            item_count: count,
        };
    })
        .sort((left, right) => left.name.localeCompare(right.name));
}
export function buildLibraryIndexFromRegistryInputs(libraryId, inputs) {
    const tagCounts = new Map();
    const papers = inputs.map((input) => {
        for (const tag of input.tags || []) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
        return {
            paper_ref: `${input.libraryId}:${input.itemKey}`,
            library_id: input.libraryId,
            item_key: input.itemKey,
            title: input.title,
            year: cleanString(input.year),
            item_type: cleanString(input.itemType),
            creators: [...(input.creators || [])],
            tags: [...(input.tags || [])],
            collections: [...(input.collections || [])],
        };
    });
    return {
        libraryId,
        papers: papers.sort((left, right) => left.title.localeCompare(right.title)),
        tags: [...tagCounts.entries()]
            .map(([tag, count]) => ({ tag, count }))
            .sort((left, right) => left.tag.localeCompare(right.tag)),
        collections: collectionIndex(inputs, libraryId),
        diagnostics: inputs.length ? [] : ["library_index_empty"],
    };
}
function normalizeArtifactType(value) {
    const text = cleanString(value);
    return ARTIFACT_TYPE_ALIASES[text] || null;
}
export function normalizeReferenceSidecarArtifactTypes(values) {
    const rawValues = Array.isArray(values) ? values : [];
    const normalized = rawValues
        .map(normalizeArtifactType)
        .filter((entry) => !!entry);
    const source = normalized.length ? normalized : PAPER_ARTIFACT_TYPES;
    return Array.from(new Set(source));
}
function payloadBlocksForInput(input) {
    const noteRows = [...(input.notes || [])].sort((left, right) => cleanString(left.key).localeCompare(cleanString(right.key)));
    const rows = [];
    const payloadTypesSeen = [];
    const decodeErrors = [];
    const untypedDecodeErrors = [];
    const managedArtifactTypes = {
        digest: "digest",
        references: "references",
        "citation-analysis": "citation_analysis",
        "literature-score": "literature_score",
    };
    for (const note of noteRows) {
        const directType = note.noteKind
            ? managedArtifactTypes[note.noteKind]
            : undefined;
        const directBlocks = directType
            ? [
                {
                    source: "managed-note-detail",
                    payloadType: PAPER_ARTIFACT_PAYLOAD_TYPES[directType],
                    format: directType === "digest" ? "markdown" : "json",
                    payload: note.payload ?? undefined,
                    ...(directType === "digest" && typeof note.payload === "string"
                        ? { markdown: note.payload, decodedText: note.payload }
                        : {}),
                    ...(note.issue ? { errors: [note.issue] } : {}),
                },
            ]
            : [];
        const blocks = directBlocks;
        if (note.issue && !directType) {
            const issue = `${cleanString(note.key) || "unknown-note"}:unknown:${note.issue}`;
            decodeErrors.push(issue);
            untypedDecodeErrors.push(issue);
        }
        for (const block of blocks) {
            const payloadType = cleanString(block.payloadType);
            if (payloadType) {
                payloadTypesSeen.push(payloadType);
            }
            if (block.errors?.length) {
                decodeErrors.push(`${cleanString(note.key) || "unknown-note"}:${payloadType}:${block.errors.join("; ")}`);
            }
            rows.push({ note, block });
        }
    }
    return {
        rows,
        noteKeysSeen: noteRows.map((note) => cleanString(note.key)).filter(Boolean),
        childNoteCount: noteRows.length,
        payloadTypesSeen: Array.from(new Set(payloadTypesSeen)).sort((left, right) => left.localeCompare(right)),
        decodeErrors,
        untypedDecodeErrors,
    };
}
function payloadProbeFields(args) {
    return {
        probe_source: "paper_artifacts.read",
        item_found: args.inputFound,
        child_note_count: args.childNoteCount || 0,
        note_keys_seen: [...(args.noteKeysSeen || [])],
        payload_types_seen: [...(args.payloadTypesSeen || [])],
    };
}
function firstPayloadBlock(args) {
    const payloadType = PAPER_ARTIFACT_PAYLOAD_TYPES[args.artifactType];
    const acceptedSources = new Set(["managed-note-detail"]);
    let decodeError = null;
    for (const row of args.scan.rows) {
        if (row.block.payloadType !== payloadType) {
            continue;
        }
        if (!acceptedSources.has(cleanString(row.block.source))) {
            continue;
        }
        if (!row.block.errors?.length) {
            return { ...row, decodeError: false };
        }
        decodeError ||= row;
    }
    return decodeError ? { ...decodeError, decodeError: true } : null;
}
function rolesByReference(payload) {
    const bySourceReferenceId = new Map();
    try {
        const citation = parseCitationAnalysisArtifact(payload);
        for (const item of citation.items) {
            if (!item.function)
                continue;
            bySourceReferenceId.set(item.sourceReferenceId, [item.function]);
        }
    }
    catch {
        // The host read reports the artifact as unavailable; it must not invent
        // positional or title-based linkage for an invalid Citation artifact.
    }
    return bySourceReferenceId;
}
function extractReferences(input) {
    const scan = payloadBlocksForInput(input);
    const referencesBlock = firstPayloadBlock({
        input,
        scan,
        artifactType: "references",
    });
    if (!referencesBlock) {
        return [];
    }
    const citationBlock = firstPayloadBlock({
        input,
        scan,
        artifactType: "citation_analysis",
    });
    let references;
    try {
        references = parseSourceReferenceArtifact(referencesBlock.block.payload).references;
    }
    catch {
        return [];
    }
    const roleMaps = rolesByReference(citationBlock?.block.payload);
    return references.map((entry) => {
        const title = cleanString(entry.bibliography.title);
        const raw = cleanString(entry.extraction?.raw);
        const roles = roleMaps.get(entry.sourceReferenceId) || [];
        return {
            sourceReferenceId: entry.sourceReferenceId,
            citekey: cleanString(entry.matching.citekey),
            doi: cleanString(entry.matching.DOI),
            isbn: cleanString(entry.matching.ISBN),
            url: cleanString(entry.matching.url),
            title,
            year: entry.bibliography.year === null ? "" : String(entry.bibliography.year),
            authors: entry.bibliography.authors.map(cleanString).filter(Boolean),
            raw,
            roles: [...new Set(roles)].sort((left, right) => left.localeCompare(right)),
        };
    });
}
export function buildCitationGraphInputsFromRegistryInputs(inputs) {
    return inputs.map((input) => ({
        libraryId: input.libraryId,
        itemKey: input.itemKey,
        title: input.title,
        year: cleanString(input.year),
        authors: [...(input.creators || [])],
        doi: cleanString(input.doi),
        arxiv: cleanString(input.arxiv),
        isbn: cleanString(input.isbn),
        url: cleanString(input.url),
        citekey: cleanString(input.citekey),
        dateAdded: cleanString(input.dateAdded),
        references: extractReferences(input),
    }));
}
function artifactHash(block) {
    if (block.format === "json") {
        return hashCanonicalJson(block.payload);
    }
    return hashMarkdown(block.markdown || block.decodedText || "");
}
function validateCanonicalArtifactPayload(type, payload) {
    if (type === "references") {
        parseSourceReferenceArtifact(payload);
    }
    else if (type === "citation_analysis") {
        parseCitationAnalysisArtifact(payload);
    }
}
export function readArtifactsFromRegistryInputs(inputs, args) {
    const refs = new Set([
        ...(args.paper_refs || []),
        ...(args.paperRefs || []),
        args.paper_ref,
        args.paperRef,
    ]
        .map(cleanString)
        .filter(Boolean));
    const requestedTypes = normalizeReferenceSidecarArtifactTypes(args.artifact_types || args.artifactTypes);
    const artifacts = [];
    const diagnostics = [];
    const matchedRefs = new Set();
    for (const input of inputs) {
        const paperRef = `${input.libraryId}:${input.itemKey}`;
        if (refs.size && !refs.has(paperRef) && !refs.has(input.itemKey)) {
            continue;
        }
        matchedRefs.add(paperRef);
        matchedRefs.add(input.itemKey);
        const scan = payloadBlocksForInput(input);
        const baseProbe = payloadProbeFields({
            inputFound: true,
            childNoteCount: scan.childNoteCount,
            noteKeysSeen: scan.noteKeysSeen,
            payloadTypesSeen: scan.payloadTypesSeen,
        });
        diagnostics.push(`${paperRef}:probe:notes=${scan.childNoteCount}:payloads=${scan.payloadTypesSeen.join(",") || "none"}`);
        diagnostics.push(...scan.decodeErrors.map((entry) => `${paperRef}:decode_error:${entry}`));
        for (const type of requestedTypes) {
            const found = firstPayloadBlock({ input, scan, artifactType: type });
            if (!found) {
                if (scan.untypedDecodeErrors.length) {
                    artifacts.push({
                        ...baseProbe,
                        paper_ref: paperRef,
                        artifact_type: type,
                        status: "decode_error",
                        payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                        missing_reason: "payload_decode_error",
                        diagnostics: [...scan.untypedDecodeErrors],
                    });
                    continue;
                }
                diagnostics.push(`${paperRef}:${PAPER_ARTIFACT_PAYLOAD_TYPES[type]}:missing`);
                artifacts.push({
                    ...baseProbe,
                    paper_ref: paperRef,
                    artifact_type: type,
                    status: "missing",
                    payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                    missing_reason: "payload_not_found",
                    diagnostics: [
                        `${paperRef}:${PAPER_ARTIFACT_PAYLOAD_TYPES[type]}:missing`,
                        `child_note_count=${scan.childNoteCount}`,
                        `payload_types_seen=${scan.payloadTypesSeen.join(",") || "none"}`,
                    ],
                });
                continue;
            }
            if (found.decodeError) {
                const errors = found.block.errors || ["decode_error"];
                diagnostics.push(`${paperRef}:${PAPER_ARTIFACT_PAYLOAD_TYPES[type]}:decode_error:${errors.join("; ")}`);
                artifacts.push({
                    ...baseProbe,
                    paper_ref: paperRef,
                    artifact_type: type,
                    status: "decode_error",
                    payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                    note_key: found.note.key,
                    note_title: cleanString(found.note.title),
                    missing_reason: "payload_decode_error",
                    diagnostics: errors,
                });
                continue;
            }
            if (type === "literature_score" &&
                !parseLiteratureScore(found.block.payload)) {
                const error = "literature_score.v1 schema validation failed";
                const payloadHash = artifactHash(found.block);
                diagnostics.push(`${paperRef}:${PAPER_ARTIFACT_PAYLOAD_TYPES[type]}:decode_error:${error}`);
                artifacts.push({
                    ...baseProbe,
                    paper_ref: paperRef,
                    artifact_type: type,
                    status: "decode_error",
                    payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                    note_key: found.note.key,
                    note_title: cleanString(found.note.title),
                    hash: payloadHash,
                    payload_hash: payloadHash,
                    missing_reason: "payload_decode_error",
                    diagnostics: [error],
                });
                continue;
            }
            if (type === "references" || type === "citation_analysis") {
                try {
                    validateCanonicalArtifactPayload(type, found.block.payload);
                }
                catch (error) {
                    const message = error instanceof Error
                        ? error.message
                        : "canonical artifact schema validation failed";
                    const payloadHash = artifactHash(found.block);
                    diagnostics.push(`${paperRef}:${PAPER_ARTIFACT_PAYLOAD_TYPES[type]}:decode_error:${message}`);
                    artifacts.push({
                        ...baseProbe,
                        paper_ref: paperRef,
                        artifact_type: type,
                        status: "decode_error",
                        payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                        note_key: found.note.key,
                        note_title: cleanString(found.note.title),
                        hash: payloadHash,
                        payload_hash: payloadHash,
                        missing_reason: "payload_decode_error",
                        diagnostics: [message],
                    });
                    continue;
                }
            }
            const payloadHash = artifactHash(found.block);
            artifacts.push({
                ...baseProbe,
                paper_ref: paperRef,
                artifact_type: type,
                status: "available",
                payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                note_key: found.note.key,
                note_title: cleanString(found.note.title),
                hash: payloadHash,
                payload_hash: payloadHash,
                payload: found.block.payload,
                ...(type === "citation_analysis" &&
                    cleanString(found.note.provenance?.referencesBasis)
                    ? {
                        referencesBasis: cleanString(found.note.provenance?.referencesBasis),
                    }
                    : {}),
                markdown: found.block.markdown,
                decoded_text: found.block.decodedText,
                diagnostics: [],
            });
        }
    }
    for (const ref of refs) {
        if (matchedRefs.has(ref)) {
            continue;
        }
        diagnostics.push(`${ref}:paper_not_found`);
        for (const type of requestedTypes) {
            artifacts.push({
                ...payloadProbeFields({ inputFound: false }),
                paper_ref: ref,
                artifact_type: type,
                status: "missing",
                payload_type: PAPER_ARTIFACT_PAYLOAD_TYPES[type],
                missing_reason: "paper_not_found",
                diagnostics: [`${ref}:paper_not_found`],
            });
        }
    }
    return { artifacts, diagnostics, sourceItems: inputs };
}
const HOST_ARTIFACT_LOCATOR_PREFIX = "synthesis-artifact:v1:";
function invalidHostRead(message, details = {}) {
    throw new SynthesisClientError("invalid_request", message, toSynthesisJsonValue(details));
}
function validateHostLibraryId(value) {
    const libraryId = Number(value);
    if (!Number.isInteger(libraryId) || libraryId <= 0) {
        invalidHostRead("Host libraryId must be a positive integer", {
            libraryId: Number.isFinite(libraryId) ? libraryId : String(value),
        });
    }
    return libraryId;
}
function validateHostPageLimit(value) {
    if (value === undefined) {
        return SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT;
    }
    const limit = Number(value);
    if (!Number.isInteger(limit) ||
        limit <= 0 ||
        limit > SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX) {
        invalidHostRead("Host read page limit is invalid", {
            limit: Number.isFinite(limit) ? limit : String(value),
            maxLimit: SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX,
        });
    }
    return limit;
}
function hostPaperRef(libraryId, itemKey) {
    return `${libraryId}:${itemKey}`;
}
function parseHostPaperRef(value, expectedLibraryId) {
    const normalized = cleanString(value);
    const match = normalized.match(/^(\d+):([^:\s]+)$/);
    if (!match) {
        invalidHostRead("Host paper ref is invalid", { paperRef: normalized });
    }
    const libraryId = Number(match?.[1]);
    const itemKey = cleanString(match?.[2]);
    if (libraryId !== expectedLibraryId || !itemKey) {
        return null;
    }
    return { libraryId, itemKey, paperRef: normalized };
}
async function hostItemSummary(item, fallbackLibraryId) {
    const input = await paperInputSummaryFromItem(item, fallbackLibraryId);
    const date = readField(item, "date");
    const paperRef = hostPaperRef(input.libraryId, input.itemKey);
    return {
        paperRef,
        libraryId: input.libraryId,
        itemKey: input.itemKey,
        itemType: cleanString(input.itemType),
        title: cleanString(input.title),
        year: cleanString(input.year),
        date,
        creators: [...(input.creators || [])],
        tags: [...(input.tags || [])],
        collections: [...(input.collections || [])],
        doi: cleanString(input.doi),
        arxiv: cleanString(input.arxiv),
        isbn: cleanString(input.isbn),
        url: cleanString(input.url),
        citekey: cleanString(input.citekey),
        dateAdded: cleanString(input.dateAdded),
        updatedAt: cleanString(item?.dateModified || item?.dateAdded) || undefined,
        metadataHash: metadataFingerprintFromItem(item, fallbackLibraryId).hash,
    };
}
async function hostItemSummaries(items, libraryId) {
    const summaries = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(4, items.length) }, async () => {
        for (;;) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= items.length)
                return;
            summaries[index] = await hostItemSummary(items[index], libraryId);
        }
    });
    await Promise.all(workers);
    return summaries;
}
function encodeArtifactLocator(args) {
    return `${HOST_ARTIFACT_LOCATOR_PREFIX}${[
        String(args.libraryId),
        args.itemKey,
        args.noteKey,
        args.artifactType,
    ]
        .map((part) => encodeURIComponent(part))
        .join(":")}`;
}
function decodeArtifactLocator(locator) {
    const value = cleanString(locator);
    if (!value.startsWith(HOST_ARTIFACT_LOCATOR_PREFIX)) {
        invalidHostRead("Host artifact locator is invalid");
    }
    const parts = value.slice(HOST_ARTIFACT_LOCATOR_PREFIX.length).split(":");
    if (parts.length !== 4) {
        invalidHostRead("Host artifact locator is invalid");
    }
    try {
        const [libraryRaw, itemRaw, noteRaw, typeRaw] = parts.map((part) => decodeURIComponent(part));
        const libraryId = validateHostLibraryId(libraryRaw);
        const itemKey = cleanString(itemRaw);
        const noteKey = cleanString(noteRaw);
        const artifactType = cleanString(typeRaw);
        if (!itemKey || !noteKey || !PAPER_ARTIFACT_TYPES.includes(artifactType)) {
            invalidHostRead("Host artifact locator is invalid");
        }
        return { libraryId, itemKey, noteKey, artifactType };
    }
    catch (error) {
        if (error instanceof SynthesisClientError) {
            throw error;
        }
        invalidHostRead("Host artifact locator is invalid");
    }
}
function hostArtifactDescriptor(artifact) {
    const parsed = parseHostPaperRef(artifact.paper_ref, artifact.paper_ref ? Number(String(artifact.paper_ref).split(":")[0]) : 0);
    const libraryId = parsed?.libraryId || 0;
    const itemKey = parsed?.itemKey || "";
    const artifactType = artifact.artifact_type;
    const locator = artifact.status === "available" && artifact.note_key && itemKey
        ? encodeArtifactLocator({
            libraryId,
            itemKey,
            noteKey: artifact.note_key,
            artifactType,
        })
        : undefined;
    const descriptor = {
        paperRef: artifact.paper_ref,
        payloadType: artifact.payload_type,
        status: artifact.status,
        ...(locator ? { locator } : {}),
        ...(artifact.payload_hash || artifact.hash
            ? { payloadHash: cleanString(artifact.payload_hash || artifact.hash) }
            : {}),
        ...(artifact.status === "available"
            ? {
                estimatedSize: new TextEncoder().encode(JSON.stringify(hostArtifactContent(artifact, artifactType))).byteLength,
            }
            : {}),
        diagnostics: [...(artifact.diagnostics || [])],
    };
    if (artifactType === "literature_score") {
        return {
            ...descriptor,
            artifactType,
            literatureQuality: buildLiteratureQualitySnapshot({
                payload: artifact.payload,
                payloadHash: cleanString(artifact.payload_hash || artifact.hash),
                missing: artifact.status === "missing",
            }),
        };
    }
    return { ...descriptor, artifactType };
}
function hostArtifactContent(artifact, artifactType) {
    return artifactType === "digest"
        ? {
            kind: "text",
            text: cleanString(artifact.markdown || artifact.decoded_text || artifact.payload),
            mediaType: "text/markdown",
        }
        : {
            kind: "json",
            value: toSynthesisJsonValue(artifact.payload),
        };
}
export function createZoteroSynthesisHostReadPort(args = {}) {
    const configuredLibraryId = normalizeLibraryId(args.libraryId, 0) ||
        normalizeLibraryId(zoteroRuntime().Libraries?.userLibraryID, 1);
    const snapshotBroker = createZoteroHostCapabilityBroker();
    const snapshotOwner = {
        ownerId: `synthesis-host-read:${configuredLibraryId}`,
    };
    async function syncSnapshot(request) {
        const libraryId = validateHostLibraryId(request.libraryId);
        if (libraryId !== configuredLibraryId) {
            invalidHostRead("Host libraryId is outside the configured scope", {
                libraryId,
            });
        }
        return snapshotBroker.library.syncSnapshot(request, snapshotOwner);
    }
    async function listItemsPage(request) {
        const libraryId = validateHostLibraryId(request.libraryId);
        if (libraryId !== configuredLibraryId) {
            invalidHostRead("Host libraryId is outside the configured scope", {
                libraryId,
            });
        }
        const limit = validateHostPageLimit(request.limit);
        const cursor = cleanString(request.cursor);
        let page;
        try {
            page = await queryZoteroLibraryPage({
                libraryId,
                limit,
                cursor: cursor || undefined,
            }, {
                defaultLibraryId: configuredLibraryId,
                defaultLimit: limit,
                maxLimit: SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX,
            });
        }
        catch (error) {
            if (error instanceof ZoteroLibraryCursorError) {
                invalidHostRead("Host read cursor is invalid");
            }
            throw error;
        }
        return {
            items: await hostItemSummaries(page.items, libraryId),
            cursor,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            returned: page.items.length,
            limit,
        };
    }
    async function getItemsByRef(request) {
        const libraryId = validateHostLibraryId(request.libraryId);
        if (libraryId !== configuredLibraryId) {
            invalidHostRead("Host libraryId is outside the configured scope", {
                libraryId,
            });
        }
        if (!Array.isArray(request.paperRefs) ||
            request.paperRefs.length > SYNTHESIS_HOST_READ_REF_LIMIT_MAX) {
            invalidHostRead("Host paper ref request is invalid", {
                maxRefs: SYNTHESIS_HOST_READ_REF_LIMIT_MAX,
            });
        }
        const items = [];
        const missingPaperRefs = [];
        const seen = new Set();
        for (const raw of request.paperRefs) {
            const parsed = parseHostPaperRef(raw, libraryId);
            const paperRef = cleanString(raw);
            if (seen.has(paperRef)) {
                continue;
            }
            seen.add(paperRef);
            const item = parsed
                ? itemByLibraryAndKey(parsed.libraryId, parsed.itemKey)
                : null;
            if (!item || !isVisibleTopLevelRegular(item)) {
                missingPaperRefs.push(paperRef);
                continue;
            }
            items.push(await hostItemSummary(item, libraryId));
        }
        return { items, missingPaperRefs };
    }
    return {
        library: { syncSnapshot, listItemsPage, getItemsByRef },
        artifacts: {
            async readiness(request) {
                const libraryId = validateHostLibraryId(request.libraryId);
                if (libraryId !== configuredLibraryId) {
                    invalidHostRead("Host libraryId is outside the configured scope", {
                        libraryId,
                    });
                }
                const artifactTypes = request.artifactTypes?.length
                    ? request.artifactTypes
                    : [...PAPER_ARTIFACT_TYPES];
                if (!Array.isArray(request.paperRefs) ||
                    request.paperRefs.length === 0 ||
                    request.paperRefs.length > SYNTHESIS_HOST_READ_REF_LIMIT_MAX ||
                    artifactTypes.some((type) => !PAPER_ARTIFACT_TYPES.includes(type))) {
                    invalidHostRead("Host artifact readiness request is invalid");
                }
                const refs = request.paperRefs.map((paperRef) => {
                    const parsed = parseHostPaperRef(paperRef, libraryId);
                    if (!parsed || parsed.libraryId !== libraryId) {
                        invalidHostRead("Host paper ref request is invalid");
                    }
                    return { libraryId: parsed.libraryId, key: parsed.itemKey };
                });
                const readiness = await snapshotBroker.library.getArtifactReadiness(refs);
                return {
                    artifacts: readiness.flatMap((item, index) => {
                        const paperRef = request.paperRefs[index];
                        const available = new Set(item.artifacts.flatMap((kind) => kind === "source-markdown"
                            ? []
                            : [
                                kind === "citation-analysis"
                                    ? "citation_analysis"
                                    : kind === "literature-score"
                                        ? "literature_score"
                                        : kind,
                            ]));
                        return artifactTypes.map((artifactType) => {
                            const summary = item.literatureScore.summary;
                            const scoreStatus = item.literatureScore.status;
                            const status = artifactType === "literature_score" &&
                                scoreStatus === "invalid"
                                ? "decode_error"
                                : available.has(artifactType)
                                    ? "available"
                                    : "missing";
                            const descriptor = {
                                paperRef,
                                artifactType,
                                payloadType: PAPER_ARTIFACT_PAYLOAD_TYPES[artifactType],
                                status,
                                diagnostics: artifactType === "literature_score" &&
                                    scoreStatus === "invalid"
                                    ? ["literature_score_invalid"]
                                    : [],
                            };
                            if (artifactType === "literature_score") {
                                return {
                                    ...descriptor,
                                    artifactType,
                                    literatureQuality: scoreStatus === "available" && summary
                                        ? {
                                            status: "available",
                                            schema: summary.schema,
                                            rubric_id: summary.rubricId,
                                            paper_type: summary.paperType,
                                            overall_score: summary.overallScore,
                                            confidence: summary.confidence,
                                            confidence_adjusted_score: summary.confidenceAdjustedScore,
                                            quality_prior: literatureQualityPrior(summary.overallScore, summary.confidence),
                                            diagnostics: [],
                                        }
                                        : {
                                            status: scoreStatus,
                                            quality_prior: 0.5,
                                            diagnostics: [
                                                scoreStatus === "invalid"
                                                    ? "literature_score_invalid"
                                                    : "literature_score_missing",
                                            ],
                                        },
                                };
                            }
                            return { ...descriptor, artifactType };
                        });
                    }),
                };
            },
            async scanPage(request) {
                const libraryId = validateHostLibraryId(request.libraryId);
                const limit = validateHostPageLimit(request.limit);
                const artifactTypes = request.artifactTypes?.length
                    ? request.artifactTypes
                    : [...PAPER_ARTIFACT_TYPES];
                if (artifactTypes.some((type) => !PAPER_ARTIFACT_TYPES.includes(type))) {
                    invalidHostRead("Host artifact type is invalid");
                }
                let summaries;
                let cursor = cleanString(request.cursor);
                let nextCursor = "";
                let hasMore = false;
                if (request.paperRefs?.length) {
                    const lookup = await getItemsByRef({
                        libraryId,
                        paperRefs: request.paperRefs,
                    });
                    summaries = lookup.items.slice(0, limit);
                }
                else {
                    const page = await listItemsPage(request);
                    summaries = page.items;
                    cursor = page.cursor;
                    nextCursor = page.nextCursor;
                    hasMore = page.hasMore;
                }
                const inputs = await Promise.all(summaries.map(async (summary) => {
                    const item = itemByLibraryAndKey(summary.libraryId, summary.itemKey);
                    return item
                        ? paperInputFromItem(item, summary.libraryId, snapshotBroker)
                        : null;
                }));
                const scan = readArtifactsFromRegistryInputs(inputs.filter((input) => Boolean(input)), { artifact_types: artifactTypes });
                return {
                    artifacts: scan.artifacts.map(hostArtifactDescriptor),
                    cursor,
                    nextCursor,
                    hasMore,
                    returned: summaries.length,
                    limit,
                };
            },
            async read(request) {
                const locator = decodeArtifactLocator(request.locator);
                const expectedHash = cleanString(request.expectedHash);
                if (!expectedHash) {
                    invalidHostRead("Host artifact expectedHash is required");
                }
                const item = itemByLibraryAndKey(locator.libraryId, locator.itemKey);
                if (!item || !isVisibleTopLevelRegular(item)) {
                    return {
                        status: "missing",
                        diagnostics: ["paper_not_found"],
                    };
                }
                const result = readArtifactsFromRegistryInputs([await paperInputFromItem(item, locator.libraryId, snapshotBroker)], {
                    paper_refs: [hostPaperRef(locator.libraryId, locator.itemKey)],
                    artifact_types: [locator.artifactType],
                });
                const artifact = result.artifacts.find((entry) => entry.artifact_type === locator.artifactType &&
                    cleanString(entry.note_key) === locator.noteKey);
                if (!artifact || artifact.status !== "available") {
                    return {
                        status: (artifact?.status === "decode_error"
                            ? "decode_error"
                            : "missing"),
                        diagnostics: [...(artifact?.diagnostics || result.diagnostics)],
                    };
                }
                const currentHash = cleanString(artifact.payload_hash || artifact.hash);
                if (currentHash !== expectedHash) {
                    return {
                        status: "stale",
                        currentHash,
                        diagnostics: ["artifact_hash_changed"],
                    };
                }
                const content = hostArtifactContent(artifact, locator.artifactType);
                return {
                    status: "available",
                    payloadHash: currentHash,
                    content,
                    ...(locator.artifactType === "citation_analysis" &&
                        cleanString(artifact.referencesBasis)
                        ? { referencesBasis: cleanString(artifact.referencesBasis) }
                        : {}),
                    diagnostics: [...(artifact.diagnostics || [])],
                };
            },
        },
    };
}
