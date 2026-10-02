import { validateCitationAnalysisArtifact, validateSourceReferenceArtifact, } from "../../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import { validateLiteratureScoreArtifact } from "../../../packages/synthesis-contracts/src/literatureArtifacts";
import { parseStoredLiteratureScoreArtifact } from "../../shared/literatureScore";
import { buildMarkdownBackedNoteContent, buildStructuredNoteContent, renderMarkdownToHtml, ZoteroNotePayloadResourceLimitError, } from "./notePayloadCodec";
import { listNotePayloadBlocksForItemPage, selectPreferredNotePayloadBlock, } from "./zoteroNotePayloadResolver";
import { hashSynthesisContractCanonicalJson } from "../../../packages/synthesis-contracts/src/index";
import { assertWorkflowHostStrictJsonValue } from "../../workflows/workflowHostErrorContract";
export const MANAGED_NOTE_PAYLOAD_TYPES = {
    custom: "custom-markdown",
    "conversation-note": "conversation-note-markdown",
    digest: "digest-markdown",
    references: "references-json",
    "citation-analysis": "citation-analysis-json",
    "literature-score": "literature-score-json",
};
export const MANAGED_NOTE_SCHEMA_VERSIONS = {
    custom: "managed_note.custom.v1",
    "conversation-note": "managed_note.conversation.v1",
    digest: "literature_digest.v1",
    references: "source_reference_artifact.v1",
    "citation-analysis": "citation_analysis_artifact.v1",
    "literature-score": "literature_score.v1",
};
const MANAGED_NOTE_KINDS = new Set([
    "custom",
    "conversation-note",
    "digest",
    "references",
    "citation-analysis",
    "literature-score",
]);
export const MANAGED_NOTE_RESULT_LIMIT = 1_048_576;
/** Semantic-owner error. The Broker maps this into its stable host error DTO. */
export class ManagedNoteOwnerError extends Error {
    code;
    details;
    retryable;
    constructor(code, message, details = {}, retryable = false) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ManagedNoteOwnerError";
        this.retryable = retryable;
    }
}
export const MIGRATION_NOTE_PAYLOAD_MAX_BYTES = 4 * 1024 * 1024;
const localControls = new WeakMap();
export function registerZoteroManagedNoteLocalControl(broker, control) {
    localControls.set(broker, control);
}
export function getZoteroManagedNoteLocalControl(broker) {
    const control = localControls.get(broker);
    if (!control)
        throw new Error("Broker does not own managed note control");
    return control;
}
async function readAllPayloadBlocksForMigration(note, options) {
    const blocks = [];
    let cursor;
    for (;;) {
        const page = await listNotePayloadBlocksForItemPage(note, { limit: 100, ...(cursor ? { cursor } : {}) }, {
            runNativeSlice: options.runNativeSlice,
            checkCanceled: options.checkCanceled,
            maxPayloadBytes: options.maxPayloadBytes,
        });
        blocks.push(...page.blocks);
        if (!page.hasMore)
            return blocks;
        const nextCursor = page.nextCursor || undefined;
        if (!nextCursor || nextCursor === cursor) {
            throw new ManagedNoteOwnerError("execution_failed", "legacy payload source returned an invalid continuation", { reason: "invalid_continuation" }, true);
        }
        cursor = nextCursor;
    }
}
function migrationPayloadValue(block) {
    if (block.errors?.length) {
        return { error: block.errors.join("; ") };
    }
    try {
        if (block.format === "json") {
            const value = block.payload ?? JSON.parse(block.decodedText || "");
            return { value: jsonClone(value) };
        }
        if (block.format === "markdown") {
            return { value: jsonClone(block.markdown || block.decodedText || "") };
        }
        return { value: jsonClone(block.decodedText || "") };
    }
    catch (error) {
        return {
            error: error instanceof Error
                ? error.message
                : "legacy payload could not be decoded",
        };
    }
}
/**
 * Read the detached legacy facts needed by the migration owner. This path
 * intentionally does not call readManagedNoteDetail, whose strict inspector
 * rejects legacy storage before the converter can classify it.
 */
export async function readLegacyManagedNoteForMigration(note, options = {}) {
    const runNativeSlice = options.runNativeSlice ||
        ((run) => Promise.resolve().then(run));
    options.checkCanceled?.();
    const initialRevision = options.readRevision
        ? await runNativeSlice(options.readRevision)
        : undefined;
    const html = await runNativeSlice(() => String(note.getNote?.() || ""));
    let blocks;
    try {
        blocks = await readAllPayloadBlocksForMigration(note, {
            ...options,
            runNativeSlice,
            maxPayloadBytes: MIGRATION_NOTE_PAYLOAD_MAX_BYTES,
        });
    }
    catch (error) {
        if (error instanceof ZoteroNotePayloadResourceLimitError) {
            throw new ManagedNoteOwnerError("resource_limited", "legacy payload source exceeds the Broker limit", {
                resource: "bytes",
                limit: error.limit,
            });
        }
        throw new ManagedNoteOwnerError("execution_failed", "legacy payload source could not be read completely", {
            phase: "read",
            recovery: "retry_same_operation",
        }, true);
    }
    let kind = "legacy";
    try {
        const title = await runNativeSlice(() => String(note.getField?.("title") || "").trim() || titleFromHtml(html));
        const inspection = classifyManagedNoteContent(html, blocks, title);
        kind = inspection.kind === "managed" ? "canonical_managed" : "ordinary";
    }
    catch (error) {
        if (!(error instanceof ManagedNoteOwnerError &&
            [
                "legacy_artifact_requires_migration",
                "invalid_artifact",
                "conflict",
            ].includes(error.code))) {
            throw error;
        }
    }
    const finalRevision = options.readRevision
        ? await runNativeSlice(options.readRevision)
        : noteRevision(note);
    if (initialRevision !== undefined && finalRevision !== initialRevision) {
        throw new ManagedNoteOwnerError("conflict", "managed note changed while it was being read", { reason: "revision_mismatch", kind: "note" }, true);
    }
    return {
        kind,
        html,
        payloads: [
            ...blocks.map((block) => ({
                payloadType: String(block.payloadType || "").trim(),
                ...migrationPayloadValue(block),
                ...(block.attachmentKey
                    ? {
                        attachmentRef: {
                            libraryId: noteRef(note).libraryId,
                            key: String(block.attachmentKey).trim(),
                        },
                    }
                    : {}),
                ...(block.sourceStorage ? { sourceStorage: block.sourceStorage } : {}),
                ...(block.payloadStorageVersion !== undefined
                    ? { payloadStorageVersion: block.payloadStorageVersion }
                    : {}),
                ...(block.payloadHash ? { payloadHash: block.payloadHash } : {}),
            })),
        ],
        revision: finalRevision,
    };
}
function textFromHtml(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/giu, " ")
        .replace(/<script[\s\S]*?<\/script>/giu, " ")
        .replace(/<[^>]+>/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
}
function titleFromHtml(html) {
    const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu);
    if (!match)
        return "";
    return decodeManagedHtmlEntities(textFromHtml(match[1]));
}
function escapeManagedHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function decodeManagedHtmlEntities(value) {
    return String(value ?? "")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&apos;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&");
}
function managedAttribute(tag, name) {
    const escaped = name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const match = tag.match(new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    const value = match?.[1] || match?.[2] || match?.[3] || "";
    return decodeManagedHtmlEntities(value).trim();
}
function managedSourceRefFromHtml(html, fallbackLibraryId) {
    const marker = html.match(/<[^>]*data-zs-meta\s*=\s*(?:"source-attachment"|'source-attachment'|source-attachment)[^>]*>/i)?.[0];
    if (!marker)
        return undefined;
    const key = managedAttribute(marker, "data-zs-source_attachment_item_key");
    const libraryId = Number(managedAttribute(marker, "data-zs-source_attachment_library_id") ||
        fallbackLibraryId);
    if (!key || !Number.isSafeInteger(libraryId) || libraryId <= 0) {
        return undefined;
    }
    return { libraryId, key };
}
function managedRepresentativeImageFromHtml(html, fallbackLibraryId) {
    const block = html.match(/<div\b[^>]*data-zs-block\s*=\s*(?:"representative-image"|'representative-image'|representative-image)[^>]*>[\s\S]*?<\/div>/i)?.[0];
    if (!block)
        return undefined;
    const descriptorKey = managedAttribute(block.match(/<div\b[^>]*>/i)?.[0] || "", "data-zs-representative_image_attachment_key");
    const images = [...block.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
    const image = images.find((tag) => managedAttribute(tag, "data-attachment-key") === descriptorKey &&
        !/data-zs-payload-anchor\s*=/i.test(tag)) ||
        images.find((tag) => Boolean(managedAttribute(tag, "data-attachment-key")) &&
            !/data-zs-payload-anchor\s*=/i.test(tag));
    const key = managedAttribute(image || "", "data-attachment-key") || descriptorKey;
    const libraryId = fallbackLibraryId;
    if (!key || !Number.isSafeInteger(libraryId) || libraryId <= 0) {
        return undefined;
    }
    return {
        attachmentRef: { libraryId, key },
        alt: managedAttribute(image || "", "alt") || "Representative image",
    };
}
function literatureScoreStars(score) {
    return Math.round(Math.max(0, Math.min(100, score)) / 10) / 2;
}
function literatureScoreRadarSvg(score) {
    const width = 640;
    const height = 520;
    const centerX = 320;
    const centerY = 250;
    const radius = 175;
    const point = (index, value = 100) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / score.dimensions.length;
        const distance = radius * (Math.max(0, Math.min(100, value)) / 100);
        return [
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
        ];
    };
    const rings = [20, 40, 60, 80, 100]
        .map((value) => `<polygon points="${score.dimensions
        .map((_, index) => point(index, value).join(","))
        .join(" ")}" fill="none" stroke="#c8ccd0" stroke-width="1"/>`)
        .join("");
    const axes = score.dimensions
        .map((_, index) => {
        const [x, y] = point(index, 100);
        return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#c8ccd0" stroke-width="1"/>`;
    })
        .join("");
    const polygon = score.dimensions
        .map((dimension, index) => point(index, dimension.score ?? 0).join(","))
        .join(" ");
    const labels = score.dimensions
        .map((dimension, index) => {
        const [x, y] = point(index, 116);
        return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="13" fill="#2f3337">${escapeManagedHtml(dimension.name)}</text>`;
    })
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><g>${rings}${axes}<polygon points="${polygon}" fill="#d28a00" fill-opacity="0.28" stroke="#b36d00" stroke-width="3"/>${labels}</g></svg>`;
}
function renderLiteratureScoreBody(score) {
    const rows = score.dimensions
        .map((dimension) => `<tr><td>${escapeManagedHtml(dimension.name)}</td><td>${dimension.score === null ? "N/A" : escapeManagedHtml(dimension.score)}</td><td>${dimension.confidence === null ? "N/A" : escapeManagedHtml(dimension.confidence)}</td><td>${escapeManagedHtml(dimension.summary)}</td></tr>`)
        .join("");
    return [
        '<div data-schema-version="9" data-zs-note-kind="literature-score">',
        "<h1>Literature Score</h1>",
        `<p><strong>${escapeManagedHtml(score.overall_score)}/100</strong> (${escapeManagedHtml(literatureScoreStars(score.overall_score))}/5 stars)</p>`,
        `<p>Paper type: ${escapeManagedHtml(score.paper_type)} · Confidence: ${escapeManagedHtml(score.confidence)} · Confidence-adjusted score: ${escapeManagedHtml(score.confidence_adjusted_score)}</p>`,
        `<div data-zs-block="literature-score-radar">${literatureScoreRadarSvg(score)}</div>`,
        '<table data-zs-view="literature-score-dimensions"><thead><tr><th>Dimension</th><th>Score</th><th>Confidence</th><th>Summary</th></tr></thead>',
        `<tbody>${rows}</tbody></table>`,
        "</div>",
    ].join("\n");
}
function renderReferencesBody(payload) {
    const rows = (payload.references || [])
        .map((reference, index) => {
        const bibliography = reference.bibliography || {};
        const source = bibliography.publicationTitle ||
            bibliography.conferenceName ||
            bibliography.university ||
            bibliography.archiveID ||
            "";
        const locator = [
            bibliography.volume ? `Vol. ${bibliography.volume}` : "",
            bibliography.issue ? `No. ${bibliography.issue}` : "",
            bibliography.pages ? `pp. ${bibliography.pages}` : "",
            bibliography.place || "",
        ]
            .filter(Boolean)
            .join("; ");
        return `<tr><td>${index + 1}</td><td>${escapeManagedHtml(bibliography.year ?? "")}</td><td>${escapeManagedHtml(bibliography.title || "")}</td><td>${escapeManagedHtml((bibliography.authors || []).join("; "))}</td><td>${escapeManagedHtml(source)}</td><td>${escapeManagedHtml(locator)}</td></tr>`;
    })
        .join("");
    return `<table data-zs-view="references-table"><thead><tr><th>#</th><th>Year</th><th>Title</th><th>Authors</th><th>Source</th><th>Locator</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderCitationAnalysisBody(payload) {
    const timelineRows = Object.entries(payload.timeline || {})
        .map(([period, entry]) => `<tr><td>${escapeManagedHtml(period)}</td><td>${escapeManagedHtml(entry.summary || "")}</td><td>${escapeManagedHtml((entry.sourceReferenceIds || []).join(", "))}</td></tr>`)
        .join("");
    const itemRows = (payload.items || [])
        .map((item) => `<tr><td>${escapeManagedHtml(item.sourceReferenceId || "")}</td><td>${escapeManagedHtml(item.function || "")}</td><td>${escapeManagedHtml(item.role_in_context || "")}</td><td>${escapeManagedHtml(item.topic || "")}</td><td>${escapeManagedHtml(item.usage || "")}</td><td>${escapeManagedHtml(item.summary || "")}</td></tr>`)
        .join("");
    const unresolvedRows = (payload.unresolved || [])
        .map((item) => `<tr><td>${escapeManagedHtml(item.marker || "")}</td><td>${escapeManagedHtml(item.reason || "")}</td><td>${escapeManagedHtml(item.snippet || "")}</td></tr>`)
        .join("");
    return [
        payload.summary
            ? `<p data-zs-view="citation-summary">${escapeManagedHtml(payload.summary)}</p>`
            : "",
        payload.meta
            ? `<p data-zs-view="citation-meta">Language: ${escapeManagedHtml(payload.meta.language || "")} · Mapping reliability: ${escapeManagedHtml(payload.meta.mapping_reliability || "")}</p>`
            : "",
        timelineRows
            ? `<table data-zs-view="citation-timeline"><thead><tr><th>Period</th><th>Summary</th><th>References</th></tr></thead><tbody>${timelineRows}</tbody></table>`
            : "",
        itemRows
            ? `<table data-zs-view="citation-items"><thead><tr><th>Reference</th><th>Function</th><th>Role</th><th>Topic</th><th>Usage</th><th>Summary</th></tr></thead><tbody>${itemRows}</tbody></table>`
            : "",
        unresolvedRows
            ? `<table data-zs-view="citation-unresolved"><thead><tr><th>Marker</th><th>Reason</th><th>Snippet</th></tr></thead><tbody>${unresolvedRows}</tbody></table>`
            : "",
    ]
        .filter(Boolean)
        .join("\n");
}
function jsonClone(value) {
    let encoded;
    try {
        encoded = JSON.stringify(value);
    }
    catch {
        throw new ManagedNoteOwnerError("invalid_request", "managed payload is not strict JSON", { reason: "invalid_type" });
    }
    if (encoded === undefined) {
        throw new ManagedNoteOwnerError("invalid_request", "managed payload is not strict JSON", { reason: "invalid_type" });
    }
    return JSON.parse(encoded);
}
function byteLength(value) {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function finalizeManagedNoteDetail(detail) {
    let detailBytes = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const next = byteLength({ ...detail, detailBytes });
        if (next === detailBytes)
            break;
        detailBytes = next;
    }
    if (detailBytes > MANAGED_NOTE_RESULT_LIMIT) {
        throw new ManagedNoteOwnerError("resource_limited", "managed note detail exceeds the Broker limit", {
            resource: "bytes",
            limit: MANAGED_NOTE_RESULT_LIMIT,
            observed: detailBytes,
        });
    }
    return { ...detail, detailBytes };
}
function knownKind(block) {
    const blockKind = block.noteKind;
    if (MANAGED_NOTE_KINDS.has(blockKind) &&
        MANAGED_NOTE_PAYLOAD_TYPES[blockKind] === block.payloadType) {
        return blockKind;
    }
    const match = Object.entries(MANAGED_NOTE_PAYLOAD_TYPES).find(([, payloadType]) => payloadType === block.payloadType);
    return match ? match[0] : null;
}
export function managedNoteKindHint(noteHtml) {
    const html = String(noteHtml || "");
    const kinds = new Set();
    const addKind = (value) => {
        const direct = value;
        if (MANAGED_NOTE_KINDS.has(direct)) {
            kinds.add(direct);
            return;
        }
        const entry = Object.entries(MANAGED_NOTE_PAYLOAD_TYPES).find(([, payloadType]) => payloadType === value);
        if (entry)
            kinds.add(entry[0]);
    };
    for (const match of html.matchAll(/data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu)) {
        addKind(String(match[1] || match[2] || match[3] || "").trim());
    }
    for (const match of html.matchAll(/data-zs-(?:payload|payload-anchor)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu)) {
        addKind(String(match[1] || match[2] || match[3] || "").trim());
    }
    return kinds.size === 1 ? Array.from(kinds)[0] : null;
}
function reservedMarker(html) {
    const payloadAnchor = html.match(/data-zs-payload-anchor\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/iu);
    if (Object.values(MANAGED_NOTE_PAYLOAD_TYPES).includes(String(payloadAnchor?.[1] || payloadAnchor?.[2] || payloadAnchor?.[3] || "").trim())) {
        return true;
    }
    const noteKind = html.match(/data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/iu);
    if (MANAGED_NOTE_KINDS.has(String(noteKind?.[1] || noteKind?.[2] || noteKind?.[3] || ""))) {
        return true;
    }
    return Object.values(MANAGED_NOTE_PAYLOAD_TYPES).some((payloadType) => {
        const escaped = payloadType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`data-zs-payload\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped})`, "iu").test(html);
    });
}
function semanticBlockValue(kind, block) {
    if (block.errors?.length || block.payload === undefined)
        return undefined;
    const value = jsonClone(block.payload);
    if (kind === "citation-analysis" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)) {
        const { referencesBasis: _referencesBasis, ...canonical } = value;
        return canonical;
    }
    return value;
}
function semanticBlockHash(kind, block) {
    const value = semanticBlockValue(kind, block);
    return value === undefined
        ? undefined
        : hashSynthesisContractCanonicalJson({
            payloadType: block.payloadType,
            value,
        });
}
/**
 * Canonical semantic identity for one decoded payload view. Both the HTML
 * payload block and the v2 attachment block use this projection when the
 * broker decides whether they describe one value or conflicting values.
 */
export function managedNotePayloadSemanticHash(kind, block) {
    return semanticBlockHash(kind, block);
}
/**
 * Classify already detached note facts. Readiness and transfer callers can
 * reuse this without re-reading a Zotero note or payload attachment.
 */
export function classifyManagedNoteContent(html, blocks, title = titleFromHtml(html)) {
    const candidates = blocks
        .map((block) => ({ block, kind: knownKind(block) }))
        .filter((entry) => Boolean(entry.kind));
    const normalizedTitle = title || textFromHtml(html).slice(0, 80);
    if (candidates.length === 0) {
        if (reservedMarker(html)) {
            throw new ManagedNoteOwnerError("legacy_artifact_requires_migration", "note contains a legacy managed artifact", { managedType: "unknown", noteKind: "unknown" });
        }
        return { kind: "ordinary", title: normalizedTitle };
    }
    const kinds = new Set(candidates.map((entry) => entry.kind));
    if (kinds.size !== 1) {
        throw new ManagedNoteOwnerError("conflict", "managed note payload is ambiguous", { reason: "ambiguous_state", kind: "note" });
    }
    const kind = candidates[0].kind;
    if (candidates.some(({ block }) => block.sourceStorage === "embedded-image-attachment-v1" ||
        block.payloadStorageVersion === 1)) {
        throw new ManagedNoteOwnerError("legacy_artifact_requires_migration", "managed note uses a legacy payload storage version", { managedType: kind, noteKind: kind });
    }
    if (candidates.some(({ block }) => !semanticBlockHash(kind, block))) {
        throw new ManagedNoteOwnerError("invalid_artifact", "managed note payload is unreadable", { managedType: kind, noteKind: kind });
    }
    const hashes = new Set(candidates.map(({ block }) => semanticBlockHash(kind, block)));
    if (hashes.size !== 1) {
        throw new ManagedNoteOwnerError("conflict", "managed note payload is ambiguous", { reason: "ambiguous_state", kind: "note" });
    }
    const block = selectPreferredNotePayloadBlock([...blocks], candidates[0].block.payloadType);
    if (!block || knownKind(block) !== kind) {
        throw new ManagedNoteOwnerError("invalid_artifact", "managed note payload storage is invalid", { managedType: kind, noteKind: kind });
    }
    return {
        kind: "managed",
        noteKind: kind,
        title: normalizedTitle,
        payload: normalizePayload(kind, block, normalizedTitle),
        block,
    };
}
export function transferPayloadValueFromBlock(block) {
    if (block.errors?.length) {
        throw new ManagedNoteOwnerError("invalid_artifact", "managed note payload is unreadable", {
            managedType: block.noteKind || "unknown",
            noteKind: block.noteKind || "unknown",
        });
    }
    if (block.payload !== undefined)
        return jsonClone(block.payload);
    if (block.format === "markdown" || block.format === "text") {
        return String(block.markdown ?? block.decodedText ?? "");
    }
    try {
        return jsonClone(JSON.parse(String(block.decodedText || "null")));
    }
    catch {
        return null;
    }
}
function transferPayloadSummaryFromBlock(block, libraryId) {
    const attachmentKey = String(block.attachmentKey || "").trim();
    const issues = block.errors?.length
        ? [{ code: "content_invalid", retryable: false }]
        : [];
    const source = attachmentKey && Number.isSafeInteger(libraryId) && (libraryId || 0) > 0
        ? {
            kind: "embedded_attachment",
            attachmentRef: { libraryId: libraryId, key: attachmentKey },
        }
        : { kind: "inline" };
    return {
        payloadType: String(block.payloadType || "").trim(),
        noteKind: String(block.noteKind || "").trim(),
        version: String(block.logicalSchemaVersion || block.version || "1"),
        format: block.format,
        encoding: String(block.encoding || "embedded-image-attachment"),
        estimatedBytes: Number(block.estimatedSize || 0),
        source,
        state: issues.length ? "invalid" : "available",
        issues,
    };
}
/**
 * Classify detached transfer facts without asking Zotero for another note or
 * payload read. The transfer owner supplies the already decoded payloads;
 * this seam applies the same strict managed-artifact validation as reads.
 */
export function classifyManagedNoteTransfer(input) {
    const suppliedCandidates = input.payloads.map((payload) => ({
        payload,
        block: {
            source: payload.summary.source.kind === "embedded_attachment"
                ? "embedded-image-attachment"
                : "html-payload-block",
            sourceStorage: payload.summary.source.kind === "embedded_attachment"
                ? "embedded-image-attachment-v2"
                : "html-payload-block",
            payloadStorageVersion: payload.summary.source.kind === "embedded_attachment" ? 2 : undefined,
            payloadType: payload.summary.payloadType,
            noteKind: payload.summary.noteKind,
            version: payload.summary.version,
            encoding: payload.summary.encoding,
            encodedValue: "",
            estimatedSize: payload.summary.estimatedBytes,
            format: payload.summary.format,
            payload: jsonClone(payload.value),
            markdown: typeof payload.value === "string" ? payload.value : undefined,
        },
        fromEmbeddedBlock: false,
    }));
    const embeddedCandidates = (input.embeddedPayloads || []).map((block) => ({
        block,
        payload: {
            summary: transferPayloadSummaryFromBlock(block, input.libraryId),
            value: transferPayloadValueFromBlock(block),
        },
        fromEmbeddedBlock: true,
    }));
    const candidates = [...suppliedCandidates, ...embeddedCandidates];
    const candidatesByType = new Map();
    for (const candidate of candidates) {
        const payloadType = String(candidate.payload.summary.payloadType || "").trim();
        if (!payloadType) {
            throw new ManagedNoteOwnerError("invalid_artifact", "managed note payload identity is missing", { managedType: "unknown", noteKind: "unknown" });
        }
        const group = candidatesByType.get(payloadType) || [];
        group.push(candidate);
        candidatesByType.set(payloadType, group);
    }
    const payloads = [];
    for (const [payloadType, group] of candidatesByType) {
        if (group.length === 1) {
            payloads.push(group[0].payload);
            continue;
        }
        if (group.some((candidate) => candidate.payload.summary.state !== "available")) {
            throw new ManagedNoteOwnerError("conflict", "managed note payload candidates are ambiguous", { reason: "ambiguous_state", kind: "note" });
        }
        const values = new Set(group.map((candidate) => semanticBlockHash(candidate.block.noteKind, candidate.block)));
        const embeddedRefs = new Set(group
            .map((candidate) => candidate.payload.summary.source.kind === "embedded_attachment"
            ? `${candidate.payload.summary.source.attachmentRef.libraryId}:${candidate.payload.summary.source.attachmentRef.key}`
            : "")
            .filter(Boolean));
        if (values.size !== 1 || embeddedRefs.size > 1) {
            throw new ManagedNoteOwnerError("conflict", `managed note payload candidates are ambiguous for ${payloadType}`, { reason: "ambiguous_state", kind: "note" });
        }
        payloads.push((group.find((candidate) => candidate.fromEmbeddedBlock) || group[0])
            .payload);
    }
    const selectedCandidates = payloads.map((payload) => {
        const group = candidatesByType.get(payload.summary.payloadType) || [];
        return group.find((candidate) => candidate.payload === payload) || group[0];
    });
    const blocks = selectedCandidates.map((candidate) => candidate.block);
    const classified = classifyManagedNoteContent(input.html, blocks, input.title);
    if (classified.kind === "ordinary") {
        return { kind: "ordinary", title: classified.title, payloads };
    }
    const payload = classified.noteKind === "citation-analysis" &&
        classified.payload &&
        typeof classified.payload === "object" &&
        !Array.isArray(classified.payload)
        ? (() => {
            const { referencesBasis: _referencesBasis, ...canonical } = classified.payload;
            return canonical;
        })()
        : classified.payload;
    return {
        kind: "managed",
        title: classified.title,
        noteKind: classified.noteKind,
        payload,
        payloads,
    };
}
function normalizePayload(kind, block, title) {
    if (block.sourceStorage === "embedded-image-attachment-v1" ||
        block.payloadStorageVersion === 1) {
        throw new ManagedNoteOwnerError("legacy_artifact_requires_migration", "managed note uses a legacy payload storage version", { managedType: kind, noteKind: kind });
    }
    if (block.errors?.length || block.payload === undefined) {
        throw new ManagedNoteOwnerError("invalid_artifact", "managed note payload is unreadable", { managedType: kind, noteKind: kind });
    }
    const payload = jsonClone(block.payload);
    if (kind === "custom") {
        if (typeof payload !== "string" || !payload.trim()) {
            throw new ManagedNoteOwnerError("invalid_artifact", "custom note markdown is invalid", { managedType: kind, noteKind: kind });
        }
        return {
            title,
            markdown: payload,
        };
    }
    if (kind === "conversation-note") {
        if (typeof payload === "string" &&
            block.format === "markdown" &&
            payload.trim()) {
            return { title, markdown: payload };
        }
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new ManagedNoteOwnerError("invalid_artifact", "conversation note payload is invalid", { managedType: kind, noteKind: kind });
        }
        const record = payload;
        const keys = Object.keys(record).sort();
        if (keys.length !== 4 ||
            keys[0] !== "content" ||
            keys[1] !== "format" ||
            keys[2] !== "path" ||
            keys[3] !== "version" ||
            record.version !== 1 ||
            record.format !== "markdown" ||
            typeof record.path !== "string" ||
            !record.path.trim()) {
            throw new ManagedNoteOwnerError("invalid_artifact", "conversation note payload has an invalid shape", { managedType: kind, noteKind: kind });
        }
        const content = record.content;
        if (typeof content !== "string" || !content.trim()) {
            throw new ManagedNoteOwnerError("invalid_artifact", "conversation note markdown is missing", { managedType: kind, noteKind: kind });
        }
        return { title, markdown: content };
    }
    if (kind === "digest") {
        const markdown = typeof payload === "string"
            ? payload
            : block.format === "markdown" && typeof block.markdown === "string"
                ? block.markdown
                : null;
        if (markdown === null) {
            throw new ManagedNoteOwnerError("invalid_artifact", "digest markdown representation is invalid", { managedType: kind, noteKind: kind });
        }
        if (!markdown.trim()) {
            throw new ManagedNoteOwnerError("invalid_artifact", "digest markdown is invalid", { managedType: kind, noteKind: kind });
        }
        return { markdown };
    }
    if (kind === "references") {
        const validated = validateSourceReferenceArtifact(payload);
        if (!validated.ok) {
            throw new ManagedNoteOwnerError("invalid_artifact", "references artifact is invalid", { managedType: kind, noteKind: kind });
        }
        return validated.value;
    }
    if (kind === "citation-analysis") {
        const record = payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload
            : null;
        const { referencesBasis, ...canonical } = record || {};
        const validated = validateCitationAnalysisArtifact(canonical);
        if (!validated.ok ||
            (referencesBasis !== undefined && typeof referencesBasis !== "string")) {
            throw new ManagedNoteOwnerError("invalid_artifact", "citation analysis artifact is invalid", { managedType: kind, noteKind: kind });
        }
        return {
            ...validated.value,
            ...(referencesBasis !== undefined
                ? { referencesBasis: String(referencesBasis) }
                : {}),
        };
    }
    if (kind === "literature-score") {
        const score = parseStoredLiteratureScoreArtifact(payload);
        if (!score) {
            throw new ManagedNoteOwnerError("invalid_artifact", "literature score artifact is invalid", { managedType: kind, noteKind: kind });
        }
        return score;
    }
    return payload;
}
/**
 * Derive Citation health from the complete References payload. The stored
 * basis is evidence only; the current basis is always recomputed from the
 * validated canonical References value.
 */
export function deriveCitationHealth(storedBasis, referencesPayload) {
    const references = validateSourceReferenceArtifact(referencesPayload);
    if (!references.ok)
        return { state: "stale" };
    const currentReferencesBasis = hashSynthesisContractCanonicalJson(references.value);
    return {
        state: storedBasis && storedBasis === currentReferencesBasis
            ? "current"
            : "stale",
        currentReferencesBasis,
    };
}
function ownerRecord(value, field) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ManagedNoteOwnerError("invalid_request", `${field} must be an object`, {
            reason: "invalid_type",
            field,
        });
    }
    return value;
}
function ownerExactKeys(value, allowed, field) {
    const allowedSet = new Set(allowed);
    const unknown = Object.keys(value).find((key) => !allowedSet.has(key));
    if (unknown) {
        throw new ManagedNoteOwnerError("invalid_request", `${field} contains an unknown field`, { reason: "unsupported_value", field: `${field}.${unknown}` });
    }
}
function ownerPortableRef(value, field) {
    const ref = ownerRecord(value, field);
    ownerExactKeys(ref, ["libraryId", "key"], field);
    if (!Number.isSafeInteger(ref.libraryId) || Number(ref.libraryId) <= 0) {
        throw new ManagedNoteOwnerError("invalid_request", `${field}.libraryId is invalid`, {
            reason: "invalid_value",
            field: `${field}.libraryId`,
        });
    }
    if (typeof ref.key !== "string" || !ref.key.trim()) {
        throw new ManagedNoteOwnerError("invalid_request", `${field}.key is invalid`, {
            reason: "invalid_value",
            field: `${field}.key`,
        });
    }
}
/**
 * Validate the complete local apply-analysis DTO before any adapter projects
 * it into private parent-set entries. This keeps unknown nested fields from
 * being silently discarded by Workflow Host object construction.
 */
export function assertLiteratureArtifactApplyAnalysisRequest(input) {
    try {
        assertWorkflowHostStrictJsonValue(input);
    }
    catch {
        throw new ManagedNoteOwnerError("invalid_request", "literature artifact request is not strict JSON", { reason: "invalid_type", field: "literatureArtifacts.applyAnalysis" });
    }
    const request = ownerRecord(input, "literatureArtifacts.applyAnalysis");
    ownerExactKeys(request, [
        "operationId",
        "parentRef",
        "digest",
        "references",
        "citationAnalysis",
        "compactCitationSnippets",
        "score",
        "matchingMetadata",
    ], "literatureArtifacts.applyAnalysis");
    if (typeof request.operationId !== "string" ||
        !request.operationId.trim() ||
        request.operationId.length > 128) {
        throw new ManagedNoteOwnerError("invalid_request", "operationId is invalid", {
            reason: "invalid_value",
            field: "operationId",
        });
    }
    ownerPortableRef(request.parentRef, "parentRef");
    if (request.compactCitationSnippets !== undefined &&
        request.compactCitationSnippets !== true) {
        throw new ManagedNoteOwnerError("invalid_request", "compactCitationSnippets is invalid", { reason: "invalid_value", field: "compactCitationSnippets" });
    }
    const digest = request.digest;
    if (digest !== undefined) {
        const value = ownerRecord(digest, "digest");
        ownerExactKeys(value, ["markdown", "sourceRef", "representativeImage"], "digest");
        if (typeof value.markdown !== "string" || !value.markdown.trim()) {
            throw new ManagedNoteOwnerError("invalid_request", "digest.markdown is invalid", {
                reason: "invalid_value",
                field: "digest.markdown",
            });
        }
        if (value.sourceRef !== undefined)
            ownerPortableRef(value.sourceRef, "digest.sourceRef");
        if (value.representativeImage !== undefined) {
            const image = ownerRecord(value.representativeImage, "digest.representativeImage");
            ownerExactKeys(image, ["preparedImage", "altText"], "digest.representativeImage");
            const prepared = ownerRecord(image.preparedImage, "digest.representativeImage.preparedImage");
            ownerExactKeys(prepared, ["kind", "id"], "digest.representativeImage.preparedImage");
            if (prepared.kind !== "prepared_note_image" ||
                typeof prepared.id !== "string" ||
                !prepared.id.trim()) {
                throw new ManagedNoteOwnerError("invalid_request", "prepared image reference is invalid", {
                    reason: "invalid_value",
                    field: "digest.representativeImage.preparedImage",
                });
            }
            if (image.altText !== undefined &&
                (typeof image.altText !== "string" ||
                    !image.altText.trim() ||
                    image.altText.length > 4096)) {
                throw new ManagedNoteOwnerError("invalid_request", "representative image alt text is invalid", {
                    reason: "invalid_value",
                    field: "digest.representativeImage.altText",
                });
            }
        }
    }
    if (request.references !== undefined) {
        const validated = validateSourceReferenceArtifact(request.references);
        if (!validated.ok) {
            throw new ManagedNoteOwnerError("invalid_request", "references artifact is invalid", {
                reason: "invalid_schema",
                field: "references",
            });
        }
    }
    if (request.citationAnalysis !== undefined) {
        const validated = validateCitationAnalysisArtifact(request.citationAnalysis);
        if (!validated.ok) {
            throw new ManagedNoteOwnerError("invalid_request", "citation analysis artifact is invalid", { reason: "invalid_schema", field: "citationAnalysis" });
        }
    }
    if (request.score !== undefined) {
        const validated = validateLiteratureScoreArtifact(request.score);
        if (!validated.ok) {
            throw new ManagedNoteOwnerError("invalid_request", "literature score artifact is invalid", {
                reason: "invalid_schema",
                field: "score",
            });
        }
    }
    if (request.matchingMetadata !== undefined) {
        const metadata = ownerRecord(request.matchingMetadata, "matchingMetadata");
        try {
            assertWorkflowHostStrictJsonValue(metadata);
        }
        catch {
            throw new ManagedNoteOwnerError("invalid_request", "matchingMetadata is not strict JSON", { reason: "invalid_type", field: "matchingMetadata" });
        }
    }
    if (request.digest === undefined &&
        request.references === undefined &&
        request.citationAnalysis === undefined &&
        request.score === undefined) {
        throw new ManagedNoteOwnerError("invalid_request", "literature artifact request has no semantic entries", {
            reason: "missing_field",
            field: "digest|references|citationAnalysis|score",
        });
    }
}
export async function inspectManagedNote(note, options = {}) {
    const runNativeSlice = options.runNativeSlice ||
        ((run) => Promise.resolve().then(run));
    options.checkCanceled?.();
    const html = await runNativeSlice(() => String(note.getNote?.() || ""));
    if (byteLength(html) > 1_048_576) {
        throw new ManagedNoteOwnerError("resource_limited", "note source exceeds the managed note limit", { resource: "bytes", limit: 1_048_576, observed: byteLength(html) });
    }
    const blocks = [];
    let cursor;
    for (;;) {
        options.checkCanceled?.();
        const page = await listNotePayloadBlocksForItemPage(note, { limit: 100, ...(cursor ? { cursor } : {}) }, {
            runNativeSlice,
            checkCanceled: options.checkCanceled,
        });
        blocks.push(...page.blocks.filter((block) => !(block.payloadStorageVersion === 1 &&
            block.attachmentKey &&
            options.ignoredLegacyPayloadAttachmentKeys?.has(block.attachmentKey))));
        if (!page.hasMore)
            break;
        if (!page.nextCursor) {
            throw new ManagedNoteOwnerError("execution_failed", "managed note payload source returned an invalid continuation", { phase: "read", recovery: "retry_same_operation" }, true);
        }
        cursor = page.nextCursor;
    }
    const title = await runNativeSlice(() => String(note.getField?.("title") || "").trim() || titleFromHtml(html));
    return classifyManagedNoteContent(html, blocks, title);
}
function noteRef(note) {
    const ref = {
        libraryId: Number(note.libraryID || 0),
        key: String(note.key || "").trim(),
    };
    if (!Number.isSafeInteger(ref.libraryId) || ref.libraryId <= 0 || !ref.key) {
        throw new ManagedNoteOwnerError("execution_failed", "managed note ref is unavailable", {
            phase: "read",
            recovery: "retry_same_operation",
        }, true);
    }
    return ref;
}
function noteParentRef(note) {
    const parentId = Number(note.parentItemID || note.parentID || 0);
    if (!Number.isSafeInteger(parentId) || parentId <= 0)
        return null;
    const parent = Zotero.Items.get(parentId);
    return parent ? noteRef(parent) : null;
}
function noteRevision(note) {
    return hashSynthesisContractCanonicalJson({
        baseRevision: String(note.version ?? note.dateModified ?? ""),
        content: String(note.getNote?.() || ""),
    });
}
export async function readManagedNoteDetail(note, options, readOptions = {}) {
    const inspection = await inspectManagedNote(note, readOptions);
    const runNativeSlice = readOptions.runNativeSlice ||
        ((run) => Promise.resolve().then(run));
    const nativeFacts = await runNativeSlice(() => ({
        ref: noteRef(note),
        parentRef: noteParentRef(note),
        html: String(note.getNote?.() || ""),
        revision: readOptions.readRevision
            ? readOptions.readRevision()
            : noteRevision(note),
    }));
    const { ref, parentRef } = nativeFacts;
    if (inspection.kind === "ordinary") {
        return {
            kind: "ordinary",
            ref,
            parentRef,
            title: inspection.title,
            format: options.format,
            content: options.format === "html"
                ? nativeFacts.html
                : textFromHtml(nativeFacts.html),
            revision: nativeFacts.revision,
        };
    }
    const publicPayload = inspection.noteKind === "citation-analysis" &&
        inspection.payload &&
        typeof inspection.payload === "object" &&
        !Array.isArray(inspection.payload)
        ? (() => {
            const { referencesBasis: _referencesBasis, ...canonical } = inspection.payload;
            return canonical;
        })()
        : inspection.payload;
    const payloadBytes = byteLength(publicPayload);
    const provenance = inspection.noteKind === "digest"
        ? (() => {
            const sourceRef = managedSourceRefFromHtml(nativeFacts.html, ref.libraryId);
            return sourceRef ? { sourceRef } : undefined;
        })()
        : inspection.noteKind === "citation-analysis" &&
            inspection.payload &&
            typeof inspection.payload === "object" &&
            !Array.isArray(inspection.payload) &&
            typeof inspection.payload
                .referencesBasis === "string"
            ? {
                referencesBasis: String(inspection.payload
                    .referencesBasis),
            }
            : undefined;
    const derivedImage = inspection.noteKind === "digest"
        ? managedRepresentativeImageFromHtml(nativeFacts.html, ref.libraryId)
        : undefined;
    const base = {
        kind: "managed",
        noteKind: inspection.noteKind,
        ref,
        parentRef,
        title: inspection.title,
        payload: publicPayload,
        payloadBytes,
        detailBytes: 0,
        revision: nativeFacts.revision,
        health: { state: "current" },
        ...(provenance ? { provenance } : {}),
        ...(derivedImage ? { derived: { representativeImage: derivedImage } } : {}),
    };
    return finalizeManagedNoteDetail(base);
}
export function managedMarkdownPayload(noteKind, title, markdown) {
    const normalizedTitle = String(title || "").trim();
    const normalizedMarkdown = String(markdown || "");
    if (!normalizedTitle || !normalizedMarkdown.trim()) {
        throw new ManagedNoteOwnerError("invalid_request", "managed note content is invalid", {
            reason: "invalid_value",
            field: !normalizedTitle ? "content.title" : "content.markdown",
        });
    }
    const built = buildMarkdownBackedNoteContent({
        title: normalizedTitle,
        markdown: normalizedMarkdown,
        noteKind,
    });
    const value = noteKind === "custom"
        ? normalizedMarkdown
        : {
            version: 1,
            path: "mcp/conversation-note.md",
            format: "markdown",
            content: normalizedMarkdown,
        };
    assertManagedWriteWithinLimit({
        noteKind,
        title: normalizedTitle,
        content: built.content,
        payload: value,
    });
    return {
        title: normalizedTitle,
        markdown: normalizedMarkdown,
        content: built.content,
        payload: {
            payloadType: MANAGED_NOTE_PAYLOAD_TYPES[noteKind],
            noteKind,
            schemaVersion: MANAGED_NOTE_SCHEMA_VERSIONS[noteKind],
            format: noteKind === "custom" ? "text" : "json",
            value: jsonClone(value),
        },
    };
}
export function managedArtifactContent(noteKind, title, payload, visibleHtml) {
    const digestMarkdown = noteKind === "digest" &&
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        typeof payload.markdown === "string"
        ? normalizeArtifactMarkdown(String(payload.markdown), title)
        : undefined;
    const renderBody = () => noteKind === "digest"
        ? renderMarkdownToHtml(digestMarkdown !== undefined ? digestMarkdown : String(payload))
        : noteKind === "literature-score"
            ? renderLiteratureScoreBody(payload)
            : noteKind === "references"
                ? renderReferencesBody(payload)
                : noteKind === "citation-analysis"
                    ? renderCitationAnalysisBody(payload)
                    : `<pre>${String(JSON.stringify(payload))
                        .replaceAll("&", "&amp;")
                        .replaceAll("<", "&lt;")
                        .replaceAll(">", "&gt;")}</pre>`;
    const storedValue = noteKind === "digest" ? (digestMarkdown ?? payload) : payload;
    const storedContent = visibleHtml ??
        buildStructuredNoteContent({
            noteKind,
            title,
            viewName: `${noteKind}-html`,
            bodyHtml: renderBody(),
            payloadType: MANAGED_NOTE_PAYLOAD_TYPES[noteKind],
            payload: storedValue,
            payloadFormat: noteKind === "digest" ? "text" : "json",
        });
    assertManagedWriteWithinLimit({
        noteKind,
        title,
        content: storedContent,
        payload: storedValue,
    });
    return {
        content: storedContent,
        payload: {
            payloadType: MANAGED_NOTE_PAYLOAD_TYPES[noteKind],
            noteKind,
            schemaVersion: MANAGED_NOTE_SCHEMA_VERSIONS[noteKind],
            format: noteKind === "digest" ? "text" : "json",
            value: jsonClone(storedValue),
        },
    };
}
function assertManagedWriteWithinLimit(args) {
    const observed = Math.max(byteLength(args.content), byteLength(args.payload), byteLength({
        kind: "managed",
        noteKind: args.noteKind,
        title: args.title,
        payload: args.payload,
    }));
    if (observed > MANAGED_NOTE_RESULT_LIMIT) {
        throw new ManagedNoteOwnerError("resource_limited", "managed note write exceeds the Broker limit", {
            resource: "bytes",
            limit: MANAGED_NOTE_RESULT_LIMIT,
            observed,
        });
    }
}
export function managedArtifactTitle(kind) {
    return kind === "citation-analysis"
        ? "Citation Analysis"
        : kind === "literature-score"
            ? "Literature Score"
            : kind[0].toUpperCase() + kind.slice(1);
}
function normalizeArtifactMarkdown(markdown, title) {
    const lines = String(markdown || "")
        .replaceAll("\r\n", "\n")
        .split("\n");
    const first = lines.findIndex((line) => line.trim() !== "");
    if (first >= 0) {
        const match = lines[first].match(/^#\s+(.+?)\s*$/u);
        if (match &&
            decodeManagedHtmlEntities(match[1]).trim() === String(title || "").trim()) {
            lines.splice(first, 1);
            while (first < lines.length && lines[first].trim() === "") {
                lines.splice(first, 1);
            }
        }
    }
    return lines.join("\n").trim();
}
export function canonicalManagedPayloadHash(payload) {
    return hashSynthesisContractCanonicalJson(payload);
}
