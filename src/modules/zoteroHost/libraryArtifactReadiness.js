import { inspectManagedNote, deriveCitationHealth, ManagedNoteOwnerError, MANAGED_NOTE_PAYLOAD_TYPES, } from "./zoteroManagedNotes";
import { parseLiteratureScore, } from "../../shared/literatureScore";
import { yieldToEventLoop } from "../../utils/runtimeCompatibility";
import { queryZoteroChildItemPage } from "./zoteroLibraryPageQuery";
export const LIBRARY_ARTIFACT_DEFINITIONS = [
    {
        kind: "source-markdown",
        label: "Source Markdown",
        icon: "icon_artifact_markdown.svg",
    },
    {
        kind: "digest",
        label: "Digest",
        icon: "icon_artifact_digest.svg",
    },
    {
        kind: "references",
        label: "References",
        icon: "icon_artifact_references.svg",
    },
    {
        kind: "citation-analysis",
        label: "Citation Analysis",
        icon: "icon_artifact_citation_analysis.svg",
    },
    {
        kind: "literature-score",
        label: "Literature Score",
        icon: "icon_artifact_literature_score.svg",
    },
];
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const REQUIRED_ANALYSIS_ARTIFACTS = ["digest", "references", "citation-analysis"];
const ARTIFACT_READ_PAGE_LIMIT = 100;
function checkArtifactRead(options) {
    options.checkCanceled?.();
}
function runArtifactNative(options, run) {
    return options.runNativeSlice
        ? options.runNativeSlice(run)
        : Promise.resolve().then(run);
}
function requireArtifactNextCursor(currentCursor, nextCursor, resource) {
    const next = String(nextCursor || "").trim();
    if (!next || next === currentCursor) {
        throw new Error(`${resource} page cursor did not advance`);
    }
    return next;
}
async function forEachArtifactChildPage(item, domain, options, onPage) {
    const libraryId = Number(item.libraryID);
    const parentItemId = Number(item.id);
    let cursor;
    for (;;) {
        checkArtifactRead(options);
        const page = await runArtifactNative(options, () => queryZoteroChildItemPage({
            domain,
            libraryId,
            parentItemId,
            limit: ARTIFACT_READ_PAGE_LIMIT,
            ...(cursor ? { cursor } : {}),
        }));
        checkArtifactRead(options);
        await onPage(page.items);
        checkArtifactRead(options);
        if (!page.hasMore) {
            return;
        }
        cursor = requireArtifactNextCursor(cursor, page.nextCursor, domain);
    }
}
async function detachArtifactNote(note, options) {
    if (!(await runArtifactNative(options, () => note?.isNote?.()))) {
        return null;
    }
    const detached = await runArtifactNative(options, () => ({
        id: Number(note.id),
        key: String(note.key || ""),
        updatedAt: String(note.dateModified || note.dateAdded || ""),
    }));
    try {
        const detail = await inspectManagedNote(note, options);
        return {
            ...detached,
            title: detail.title,
            noteKind: detail.kind === "managed" ? detail.noteKind : null,
            payload: detail.kind === "managed" ? detail.payload : null,
            ...(detail.kind === "managed" &&
                detail.noteKind === "citation-analysis" &&
                detail.payload &&
                typeof detail.payload === "object" &&
                !Array.isArray(detail.payload) &&
                typeof detail.payload.referencesBasis === "string"
                ? { referencesBasis: detail.payload.referencesBasis }
                : {}),
            issue: null,
        };
    }
    catch (error) {
        if (!(error instanceof ManagedNoteOwnerError) ||
            !["invalid_artifact", "legacy_artifact_requires_migration"].includes(error.code))
            throw error;
        const kind = error.details.noteKind ?? error.details.managedType;
        return {
            ...detached,
            title: "",
            noteKind: typeof kind === "string" &&
                Object.hasOwn(MANAGED_NOTE_PAYLOAD_TYPES, kind)
                ? kind
                : null,
            payload: null,
            issue: error.code,
        };
    }
}
async function detachArtifactAttachment(attachment, options) {
    if (!(await runArtifactNative(options, () => attachment?.isAttachment?.()))) {
        return null;
    }
    const filename = await resolveAttachmentFilename(attachment, options);
    const isPdf = await runArtifactNative(options, () => isPdfAttachment(attachment));
    const identity = await runArtifactNative(options, () => ({
        id: Number(attachment.id),
        key: String(attachment.key || ""),
    }));
    return {
        ...identity,
        filename,
        isPdf,
        isMarkdown: MARKDOWN_EXTENSIONS.has(resolveExtension(filename)),
    };
}
async function resolveArtifactChildren(item, options = {}) {
    const notes = [];
    const attachments = [];
    const processPage = async (items, process, output) => {
        let startedAt = Date.now();
        let processed = 0;
        for (const child of items) {
            checkArtifactRead(options);
            const fact = await process(child);
            if (fact) {
                output.push(fact);
            }
            processed += 1;
            if (processed >= 100 || Date.now() - startedAt >= 50) {
                await yieldToEventLoop();
                checkArtifactRead(options);
                startedAt = Date.now();
                processed = 0;
            }
        }
    };
    await Promise.all([
        forEachArtifactChildPage(item, "notes", options, (page) => processPage(page, (child) => detachArtifactNote(child, options), notes)),
        forEachArtifactChildPage(item, "attachments", options, (page) => processPage(page, (child) => detachArtifactAttachment(child, options), attachments)),
    ]);
    return { notes, attachments };
}
export async function resolveLibraryArtifactReadiness(item, options = {}) {
    if (!(await runArtifactNative(options, () => isTopLevelRegularArtifactItem(item)))) {
        return emptyLibraryArtifactReadiness();
    }
    const children = await resolveArtifactChildren(item, options);
    const artifacts = new Set();
    const pdfAttachment = await resolveBestPdfAttachmentFacts(item, children.attachments, options);
    const pdfFilename = pdfAttachment?.filename || "";
    const pdfStem = pdfAttachment ? resolveStem(pdfFilename) : "";
    const markdownStems = resolveMarkdownAttachmentStems(children.attachments);
    const hasSourceMarkdown = !!pdfStem && markdownStems.has(pdfStem);
    if (hasSourceMarkdown) {
        artifacts.add("source-markdown");
    }
    const generatedNotes = await resolveGeneratedNoteArtifacts(children.notes, options);
    for (const artifact of generatedNotes.artifacts) {
        artifacts.add(artifact);
    }
    const missingParts = REQUIRED_ANALYSIS_ARTIFACTS.filter((artifact) => !artifacts.has(artifact));
    const readiness = {
        state: serializeLibraryArtifactState(artifacts),
        artifacts: Array.from(artifacts),
        pdf: {
            present: !!pdfAttachment,
            filename: pdfFilename,
            stem: pdfStem,
        },
        sourceMarkdown: {
            present: hasSourceMarkdown,
            matchingStem: hasSourceMarkdown ? pdfStem : "",
            markdownStems: Array.from(markdownStems).sort(),
        },
        generated: {
            digest: artifacts.has("digest"),
            references: artifacts.has("references"),
            citationAnalysis: artifacts.has("citation-analysis"),
            missingParts,
            complete: missingParts.length === 0,
        },
        literatureScore: {
            status: generatedNotes.scoreStatus,
            summary: generatedNotes.score,
        },
    };
    return readiness;
}
export function serializeLibraryArtifactState(artifacts) {
    return LIBRARY_ARTIFACT_DEFINITIONS.map(({ kind }) => kind)
        .filter((kind) => artifacts.has(kind))
        .join("|");
}
export function parseLibraryArtifactState(data) {
    const requested = new Set(String(data || "")
        .split("|")
        .filter(Boolean));
    return LIBRARY_ARTIFACT_DEFINITIONS.filter(({ kind }) => requested.has(kind));
}
export async function resolveBestPdfAttachment(item, resolvedAttachments, options = {}) {
    const best = await runArtifactNative(options, () => item.getBestAttachment?.());
    if (best &&
        (await runArtifactNative(options, () => isPdfAttachment(best)))) {
        return best;
    }
    if (resolvedAttachments) {
        for (const attachment of resolvedAttachments) {
            if (attachment &&
                (await runArtifactNative(options, () => isPdfAttachment(attachment)))) {
                return attachment;
            }
        }
    }
    let cursor;
    for (;;) {
        const page = await runArtifactNative(options, () => queryZoteroChildItemPage({
            domain: "attachments",
            libraryId: Number(item.libraryID),
            parentItemId: Number(item.id),
            limit: ARTIFACT_READ_PAGE_LIMIT,
            ...(cursor ? { cursor } : {}),
        }));
        for (const attachment of page.items) {
            if (await runArtifactNative(options, () => isPdfAttachment(attachment))) {
                return attachment;
            }
        }
        if (!page.hasMore)
            return null;
        cursor = requireArtifactNextCursor(cursor, page.nextCursor, "attachments");
    }
}
async function resolveBestPdfAttachmentFacts(item, attachments, options) {
    checkArtifactRead(options);
    const best = await runArtifactNative(options, () => item.getBestAttachment?.());
    checkArtifactRead(options);
    if (best &&
        (await runArtifactNative(options, () => isPdfAttachment(best)))) {
        const bestId = Number(best.id);
        const detached = attachments.find((attachment) => attachment.id === bestId);
        if (detached)
            return detached;
        return detachArtifactAttachment(best, options);
    }
    return attachments.find((attachment) => attachment.isPdf) || null;
}
export function isTopLevelRegularArtifactItem(item) {
    if (item.isNote?.() || item.isAttachment?.()) {
        return false;
    }
    if (typeof item.isRegularItem === "function" && !item.isRegularItem()) {
        return false;
    }
    if (typeof item.isTopLevelItem === "function") {
        return item.isTopLevelItem();
    }
    return !item.parentID;
}
export async function evaluateGeneratedNoteReadiness(parentItem, spec, options = {}) {
    const childNotes = (await resolveArtifactChildren(parentItem, options)).notes;
    return evaluateGeneratedNoteFactsReadiness(childNotes, spec, options);
}
export async function evaluateGeneratedNoteFactsReadiness(childNotes, spec, options = {}) {
    const notes = [];
    for (const note of withCitationHealth(childNotes)) {
        notes.push({
            item: note,
            kind: await resolveGeneratedNoteKind(note, options),
        });
    }
    const artifacts = {};
    for (const artifactSpec of spec.artifacts) {
        artifacts[artifactSpec.id] = await evaluateGeneratedNoteArtifact(notes, artifactSpec, options);
    }
    const mode = spec.modes.find((candidate) => {
        if (candidate.default) {
            return false;
        }
        return ((candidate.allAvailable || []).every((id) => artifacts[id]?.status === "available") &&
            (candidate.allUnavailable || []).every((id) => artifacts[id]?.status !== "available"));
    })?.id ||
        spec.modes.find((candidate) => candidate.default)?.id ||
        "";
    const evidenceHash = JSON.stringify(spec.artifacts.map((artifactSpec) => {
        const artifact = artifacts[artifactSpec.id];
        return [artifactSpec.id, artifact?.status, artifact?.noteIds || []];
    }));
    return {
        mode,
        accepted: spec.acceptModes.includes(mode),
        evidenceHash,
        artifacts,
    };
}
async function evaluateGeneratedNoteArtifact(notes, spec, options) {
    const candidates = notes.filter((note) => spec.noteKinds.includes(note.kind));
    const noteIds = candidates
        .map((candidate) => Number(candidate.item.id))
        .filter(Number.isFinite);
    if (!candidates.length) {
        return { status: "missing", noteIds, diagnostics: [] };
    }
    if (candidates.length > 1 || candidates[0].item.issue) {
        return {
            status: "invalid",
            noteIds,
            diagnostics: [
                candidates.length > 1 ? "ambiguous_state" : candidates[0].item.issue,
            ],
        };
    }
    if (!spec.payload) {
        return { status: "available", noteIds, diagnostics: [] };
    }
    const diagnostics = [];
    for (const candidate of candidates) {
        try {
            if (candidate.item.issue || candidate.item.payload === null) {
                diagnostics.push(candidate.item.issue || "invalid_artifact");
                continue;
            }
            const payload = candidate.item.payload;
            const failed = (spec.payload.requirements || []).find((requirement) => !matchesPayloadRequirement(payload, requirement));
            if (failed) {
                diagnostics.push(`payload requirement failed: ${failed.pointer}`);
                continue;
            }
            return {
                status: "available",
                noteIds,
                payload,
                diagnostics: [],
            };
        }
        catch (error) {
            diagnostics.push(error instanceof Error ? error.message : String(error));
        }
    }
    return { status: "invalid", noteIds, diagnostics };
}
function matchesPayloadRequirement(payload, requirement) {
    const value = resolveJsonPointer(payload, requirement.pointer);
    if ("const" in requirement && value !== requirement.const) {
        return false;
    }
    if (requirement.type === "array") {
        if (!Array.isArray(value))
            return false;
        if (typeof requirement.length === "number" &&
            value.length !== requirement.length) {
            return false;
        }
    }
    else if (requirement.type === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value))
            return false;
    }
    else if (requirement.type && typeof value !== requirement.type) {
        return false;
    }
    if (typeof value === "number") {
        if (typeof requirement.minimum === "number" &&
            value < requirement.minimum) {
            return false;
        }
        if (typeof requirement.maximum === "number" &&
            value > requirement.maximum) {
            return false;
        }
    }
    return true;
}
function resolveJsonPointer(payload, pointer) {
    if (!pointer || pointer === "/") {
        return payload;
    }
    let current = payload;
    for (const token of pointer
        .replace(/^\//, "")
        .split("/")
        .map((entry) => entry.replace(/~1/g, "/").replace(/~0/g, "~"))) {
        if (!current || typeof current !== "object") {
            return undefined;
        }
        current = current[token];
    }
    return current;
}
function emptyLibraryArtifactReadiness() {
    return {
        state: "",
        artifacts: [],
        pdf: {
            present: false,
            filename: "",
            stem: "",
        },
        sourceMarkdown: {
            present: false,
            matchingStem: "",
            markdownStems: [],
        },
        generated: {
            digest: false,
            references: false,
            citationAnalysis: false,
            missingParts: [...REQUIRED_ANALYSIS_ARTIFACTS],
            complete: false,
        },
        literatureScore: {
            status: "missing",
            summary: null,
        },
    };
}
async function resolveGeneratedNoteArtifacts(notes, options) {
    const artifacts = new Set();
    let score = null;
    let scoreStatus = "missing";
    const counts = new Map();
    for (const note of notes) {
        if (note.noteKind)
            counts.set(note.noteKind, (counts.get(note.noteKind) || 0) + 1);
    }
    for (const note of withCitationHealth(notes)) {
        checkArtifactRead(options);
        const noteKind = await resolveGeneratedNoteKind(note, options);
        if (note.issue || (noteKind && counts.get(noteKind) !== 1)) {
            if (note.noteKind === "literature-score")
                scoreStatus = "invalid";
            continue;
        }
        if (noteKind === "digest") {
            artifacts.add("digest");
        }
        else if (noteKind === "references") {
            artifacts.add("references");
        }
        else if (noteKind === "citation-analysis") {
            artifacts.add("citation-analysis");
        }
        else if (noteKind === "literature-score") {
            const resolved = await resolveLiteratureScoreForNote(note, options);
            if (resolved) {
                artifacts.add("literature-score");
                score = resolved;
                scoreStatus = "available";
            }
            else if (scoreStatus !== "available") {
                scoreStatus = "invalid";
            }
        }
    }
    return { artifacts, score, scoreStatus };
}
function withCitationHealth(notes) {
    const references = notes.filter((note) => note.noteKind === "references");
    const payload = references.length === 1 && !references[0].issue
        ? references[0].payload
        : null;
    return notes.map((note) => note.noteKind === "citation-analysis" &&
        !note.issue &&
        deriveCitationHealth(note.referencesBasis, payload).state === "stale"
        ? { ...note, issue: "references_basis_mismatch" }
        : note);
}
export async function summarizeLibraryGeneratedArtifacts(notes, options = {}) {
    return resolveGeneratedNoteArtifacts(notes.map((note) => ({ ...note, id: note.id ?? 0 })), options);
}
async function resolveLiteratureScoreForNote(note, options = {}) {
    checkArtifactRead(options);
    return note.issue ? null : parseLiteratureScore(note.payload);
}
async function resolveGeneratedNoteKind(note, options = {}) {
    checkArtifactRead(options);
    return note.noteKind || "";
}
function isPdfAttachment(item) {
    try {
        if (item.isPDFAttachment?.()) {
            return true;
        }
    }
    catch {
        return false;
    }
    if (normalizeContentType(item.attachmentContentType) === "application/pdf") {
        return true;
    }
    const filename = resolveAttachmentFilenameSync(item).toLowerCase();
    return filename.endsWith(".pdf");
}
function resolveMarkdownAttachmentStems(attachments) {
    const stems = new Set();
    for (const attachment of attachments) {
        if (!attachment.isMarkdown) {
            continue;
        }
        const stem = resolveStem(attachment.filename);
        if (stem) {
            stems.add(stem);
        }
    }
    return stems;
}
function resolveStem(filename) {
    const extension = resolveExtension(filename);
    if (!extension) {
        return "";
    }
    return filename
        .slice(0, Math.max(0, filename.length - extension.length - 1))
        .trim()
        .toLowerCase();
}
async function resolveAttachmentFilename(item, options = {}) {
    const syncFilename = await runArtifactNative(options, () => resolveAttachmentFilenameSync(item));
    if (syncFilename) {
        return syncFilename;
    }
    try {
        const filePath = await runArtifactNative(options, () => item.getFilePathAsync?.());
        return basename(String(filePath || ""));
    }
    catch {
        return "";
    }
}
function resolveAttachmentFilenameSync(item) {
    const attachmentFilename = String(item.attachmentFilename || "").trim();
    if (attachmentFilename) {
        return attachmentFilename;
    }
    try {
        const filePath = item.getFilePath?.();
        return basename(String(filePath || ""));
    }
    catch {
        return "";
    }
}
function basename(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
        return "";
    }
    const parts = normalized.split(/[\\/]+/);
    return parts[parts.length - 1] || "";
}
function resolveExtension(filename) {
    const index = filename.lastIndexOf(".");
    if (index <= 0 || index === filename.length - 1) {
        return "";
    }
    return filename.slice(index + 1).toLowerCase();
}
function normalizeContentType(value) {
    return String(value || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
}
