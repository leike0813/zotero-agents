import { createHookHelpers } from "./helpers";
import { createWorkflowHostApi } from "./hostApi";
import { resolveWorkflowHostContractVersion } from "./workflowHostContract";
import { resolveRuntimeAddon, resolveRuntimeZotero, } from "../utils/runtimeBridge";
import { resolveWorkflowDisplayLocale } from "./localization";
import { evaluateGeneratedNoteFactsReadiness, } from "../modules/zoteroHost/libraryArtifactReadiness";
import { attachmentSelectionFact, buildSelectionContext, itemRefIdentity, lockSelection, selectionCounts, } from "../modules/selectionContext";
function createSelectionRuntime(override) {
    const zotero = override?.zotero ||
        resolveRuntimeZotero() ||
        (typeof Zotero !== "undefined" ? Zotero : undefined);
    if (!zotero) {
        throw new Error("Zotero runtime is unavailable");
    }
    const globalHostApi = globalThis.__zsHostApi;
    const hasGlobalHostApi = Boolean(globalHostApi && typeof globalHostApi === "object");
    const currentProjection = !override?.hostApi && !hasGlobalHostApi;
    const hostApi = override?.hostApi ||
        (hasGlobalHostApi
            ? globalHostApi
            : createWorkflowHostApi());
    return {
        zotero,
        helpers: override?.helpers || createHookHelpers(zotero),
        hostApi,
        hostApiVersion: resolveWorkflowHostContractVersion({
            explicitVersion: override?.hostApiVersion,
            hostApi,
            currentProjection,
        }),
        addon: typeof override?.addon !== "undefined"
            ? (override.addon ?? null)
            : (resolveRuntimeAddon() ??
                null),
        debugMode: override?.debugMode,
        workflowId: override?.workflowId,
        packageId: override?.packageId,
        workflowRootDir: override?.workflowRootDir,
        packageRootDir: override?.packageRootDir,
        workflowSourceKind: override?.workflowSourceKind || "",
        hookName: override?.hookName || "",
        locale: resolveWorkflowDisplayLocale(override?.locale),
        fetch: override?.fetch ?? null,
        Buffer: override?.Buffer ?? null,
        btoa: override?.btoa ?? null,
        atob: override?.atob ?? null,
        TextEncoder: override?.TextEncoder ?? null,
        TextDecoder: override?.TextDecoder ?? null,
        FileReader: override?.FileReader ?? null,
        navigator: override?.navigator ?? null,
    };
}
function copySelection(value) {
    if (!value ||
        typeof value !== "object" ||
        !Array.isArray(value.items)) {
        throw new Error("Canonical locked selection is required");
    }
    return JSON.parse(JSON.stringify(value));
}
function getSelectionItemCounts(selection) {
    return selectionCounts(selection);
}
function totalCount(counts) {
    return counts.attachments + counts.parents + counts.children + counts.notes;
}
function countNonZeroKinds(counts) {
    return [
        counts.attachments > 0,
        counts.parents > 0,
        counts.children > 0,
        counts.notes > 0,
    ].filter(Boolean).length;
}
function hasAnySelectionItems(selection) {
    return totalCount(getSelectionItemCounts(selection)) > 0;
}
function matchesCountRule(value, rule) {
    if (!rule || typeof rule !== "object") {
        return true;
    }
    const typed = rule;
    if (typeof typed.exact === "number" && value !== typed.exact) {
        return false;
    }
    if (typeof typed.min === "number" && value < typed.min) {
        return false;
    }
    if (typeof typed.max === "number" && value > typed.max) {
        return false;
    }
    return true;
}
function validateRequiredCounts(spec, selection) {
    const counts = getSelectionItemCounts(selection);
    const require = spec?.require?.selection;
    if (require?.allowMixed === false && countNonZeroKinds(counts) > 1) {
        return "mixed-selection-not-allowed";
    }
    const rules = require?.counts || {};
    const checks = [
        ["parents", counts.parents, rules.parents],
        ["attachments", counts.attachments, rules.attachments],
        ["notes", counts.notes, rules.notes],
        ["children", counts.children, rules.children],
        ["total", totalCount(counts), rules.total],
    ];
    for (const [name, value, rule] of checks) {
        if (!matchesCountRule(value, rule)) {
            return `selection-count-${name}`;
        }
    }
    return "";
}
function getAttachmentFileName(entry) {
    return entry.filename || "";
}
function getAttachmentFileStem(entry) {
    return getAttachmentFileName(entry)
        .replace(/\.[^.]+$/, "")
        .trim()
        .toLowerCase();
}
function isMarkdownAttachment(entry) {
    return (["text/markdown", "text/x-markdown"].includes(entry.contentType || "") ||
        /\.md$/i.test(entry.filename || ""));
}
function isPdfAttachment(entry) {
    return (entry.contentType === "application/pdf" ||
        /\.pdf$/i.test(entry.filename || ""));
}
function applyAttachmentMimeFilter(attachments, mimes) {
    if (!mimes?.length)
        return attachments;
    return attachments.filter((entry) => mimes.includes(entry.contentType || "") ||
        (/\.md$/i.test(entry.filename || "") &&
            mimes.some((mime) => ["text/markdown", "text/x-markdown", "text/plain"].includes(mime))) ||
        (/\.pdf$/i.test(entry.filename || "") &&
            mimes.includes("application/pdf")));
}
async function readAttachments(ref, runtime) {
    const result = [];
    let cursor;
    do {
        const page = await runtime.hostApi.library.getItemAttachments(ref, {
            limit: 100,
            ...(cursor ? { cursor } : {}),
        });
        result.push(...page.attachments.map(attachmentSelectionFact));
        if (!page.hasMore)
            return result;
        if (!page.nextCursor || cursor === page.nextCursor)
            throw new Error("Invalid attachment continuation");
        cursor = page.nextCursor;
    } while (cursor);
    return result;
}
async function hydrateSelected(item, runtime) {
    if (item.kind !== "attachment" || item.filename !== undefined)
        return item;
    const detail = await runtime.hostApi.library.getItemDetail(item.ref);
    if (detail.kind !== "attachment")
        throw new Error("Selected attachment changed kind");
    return attachmentSelectionFact(detail.item);
}
async function regularParent(item, runtime) {
    if (item.kind === "parent")
        return item;
    let ref = item.parentRef;
    const seen = new Set();
    while (ref && !seen.has(itemRefIdentity(ref))) {
        seen.add(itemRefIdentity(ref));
        const fact = (await buildSelectionContext([ref], runtime.hostApi)).items[0];
        if (fact.kind === "parent")
            return fact;
        ref = fact.parentRef;
    }
    return null;
}
function compareByDateAndName(a, b) {
    const delta = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
    return (delta || getAttachmentFileName(a).localeCompare(getAttachmentFileName(b)));
}
function chooseLiteratureSourceByPolicy(entries) {
    const md = entries.filter(isMarkdownAttachment);
    const pdf = entries.filter(isPdfAttachment).sort(compareByDateAndName);
    if (md.length === 1)
        return md[0];
    if (md.length > 1)
        return ((pdf[0] &&
            md.find((item) => getAttachmentFileStem(item) === getAttachmentFileStem(pdf[0]))) ||
            md.sort(compareByDateAndName)[0]);
    return pdf[0] || null;
}
async function collectSelectedLiteratureSources(selection, runtime) {
    const parents = selection.items.filter((item) => item.kind === "parent");
    const selectedParents = new Set(parents.map((item) => itemRefIdentity(item.ref)));
    const groups = new Map();
    for (const parent of parents)
        groups.set(itemRefIdentity(parent.ref), await readAttachments(parent.ref, runtime));
    for (const fact of selection.items.filter((item) => item.kind === "attachment")) {
        const entry = await hydrateSelected(fact, runtime);
        if (!entry.parentRef)
            continue;
        const key = itemRefIdentity(entry.parentRef);
        if (selectedParents.has(key))
            continue;
        const group = groups.get(key) || [];
        group.push(entry);
        groups.set(key, group);
    }
    return [...groups.values()]
        .map(chooseLiteratureSourceByPolicy)
        .filter((entry) => !!entry);
}
async function readNotes(parentRef, runtime) {
    return (await readGeneratedNoteFacts(parentRef, runtime)).map((note) => {
        if (note.issue)
            throw Object.assign(new Error("Managed note is unavailable"), { code: note.issue });
        return {
            ref: { libraryId: parentRef.libraryId, key: note.key },
            parentRef,
            noteKind: note.noteKind || "ordinary",
        };
    });
}
async function parentHasAllGeneratedNotes(parentRef, kinds, runtime) {
    const notes = await readNotes(parentRef, runtime);
    return kinds.every((kind) => notes.some((note) => note.noteKind === kind));
}
async function readGeneratedNoteFacts(parentRef, runtime) {
    const facts = [];
    let cursor;
    do {
        const page = await runtime.hostApi.library.getItemNotes(parentRef, {
            limit: 100,
            ...(cursor ? { cursor } : {}),
        });
        for (const note of page.notes) {
            try {
                const detail = await runtime.hostApi.library.getNoteDetail(note.ref, { format: "html" });
                facts.push({
                    key: note.ref.key,
                    title: detail.title,
                    updatedAt: detail.revision,
                    noteKind: detail.kind === "managed" ? detail.noteKind : null,
                    payload: detail.kind === "managed" ? detail.payload : null,
                    ...(detail.kind === "managed" && detail.provenance?.referencesBasis
                        ? { referencesBasis: detail.provenance.referencesBasis }
                        : {}),
                    issue: null,
                });
            }
            catch (error) {
                const code = error && typeof error === "object" && "code" in error ? error.code : null;
                if (code !== "invalid_artifact" && code !== "legacy_artifact_requires_migration")
                    throw error;
                facts.push({
                    key: note.ref.key,
                    title: note.title,
                    updatedAt: "",
                    noteKind: null,
                    payload: null,
                    issue: code,
                });
            }
        }
        if (!page.hasMore)
            return facts;
        if (!page.nextCursor || cursor === page.nextCursor)
            throw new Error("Invalid note continuation");
        cursor = page.nextCursor;
    } while (cursor);
    return facts;
}
function normalizePath(value) {
    return String(value || "").trim();
}
function toNativePath(value) {
    const text = normalizePath(value);
    if (/^[A-Za-z]:\//.test(text)) {
        return text.replace(/\//g, "\\");
    }
    return text;
}
function basenamePath(filePath) {
    const parts = String(filePath || "")
        .split(/[\\/]+/)
        .filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : "";
}
function dirnamePath(filePath) {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length <= 1) {
        return "";
    }
    const hasDrive = /^[A-Za-z]:/.test(parts[0]);
    const prefix = normalized.startsWith("/") ? "/" : "";
    const joined = parts.slice(0, -1).join("/");
    return hasDrive ? toNativePath(joined) : toNativePath(`${prefix}${joined}`);
}
function joinPath(baseDir, name) {
    const left = String(baseDir || "").replace(/[\\/]+$/, "");
    const right = String(name || "").replace(/^[\\/]+/, "");
    if (!left)
        return toNativePath(right);
    if (!right)
        return toNativePath(left);
    const separator = left.includes("\\") ? "\\" : "/";
    return toNativePath(`${left}${separator}${right}`);
}
function replaceExtension(filePath, extension) {
    const normalized = normalizePath(filePath);
    if (!normalized)
        return "";
    if (/\.[^./\\]+$/.test(normalized)) {
        return normalized.replace(/\.[^./\\]+$/, extension);
    }
    return `${normalized}${extension}`;
}
async function resolveAttachmentSourcePath(entry, runtime) {
    const detail = await runtime.hostApi.library.getItemDetail(entry.ref);
    return detail.kind === "attachment" && detail.item.file.state === "available"
        ? detail.item.file.path
        : "";
}
function sanitizeFileNameSegment(value) {
    return String(value || "")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function resolveArtifactTargetPath(rule, args, sourcePath) {
    const sourceDir = dirnamePath(sourcePath);
    const sourceName = basenamePath(sourcePath);
    if (!sourceDir || !sourceName) {
        return "";
    }
    if (rule.target === "deep-reading-html") {
        return joinPath(sourceDir, replaceExtension(sourceName, ".html"));
    }
    if (rule.target === "mineru-markdown") {
        return joinPath(sourceDir, replaceExtension(sourceName, ".md"));
    }
    if (rule.target === "translator-markdown") {
        const parameterValue = String(args.executionOptions?.workflowParams?.[rule.parameter || ""] ?? "").trim();
        const sourceMarkdownName = replaceExtension(sourceName, ".md");
        const stem = sourceMarkdownName.replace(/\.md$/i, "");
        const suffix = sanitizeFileNameSegment(parameterValue);
        if (!stem || !suffix) {
            return "";
        }
        return joinPath(sourceDir, `${stem}_${suffix}.md`);
    }
    return "";
}
async function fileExists(path, runtime) {
    try {
        return !!path && (await runtime.hostApi.file.exists(toNativePath(path)));
    }
    catch {
        return false;
    }
}
async function filterArtifactConflicts(attachments, args, runtime) {
    const artifactRules = (args.manifest || args.workflow?.manifest)?.validateSelection?.filters?.filter((entry) => entry.kind === "artifact-absent");
    if (!artifactRules?.length) {
        return attachments;
    }
    const accepted = [];
    for (const entry of attachments) {
        const sourcePath = await resolveAttachmentSourcePath(entry, runtime);
        if (!sourcePath) {
            continue;
        }
        let conflict = false;
        for (const rule of artifactRules) {
            if (args.mode === "menu" && rule.phase === "execute") {
                continue;
            }
            const targetPath = resolveArtifactTargetPath(rule, args, sourcePath);
            if (!targetPath || (await fileExists(targetPath, runtime))) {
                conflict = true;
                break;
            }
        }
        if (!conflict) {
            accepted.push(entry);
        }
    }
    return accepted;
}
async function selectGeneratedNoteCandidates(selection, runtime) {
    const notes = new Map();
    for (const item of selection.items) {
        if (item.kind === "parent") {
            for (const note of await readNotes(item.ref, runtime))
                notes.set(itemRefIdentity(note.ref), {
                    ...note,
                    parentTitle: item.title,
                });
        }
        else if (item.kind === "note") {
            const detail = await runtime.hostApi.library.getNoteDetail(item.ref, {
                format: "html",
            });
            notes.set(itemRefIdentity(item.ref), {
                ref: item.ref,
                ...(item.parentRef ? { parentRef: item.parentRef } : {}),
                noteKind: detail.kind === "managed" ? detail.noteKind : "ordinary",
            });
        }
    }
    return [...notes.values()];
}
async function selectDigestRepresentativeImage(selection, runtime) {
    if (selection.items.length !== 1)
        return null;
    const item = selection.items[0];
    if (item.kind === "parent") {
        const notes = (await readNotes(item.ref, runtime)).filter((note) => note.noteKind === "digest");
        return notes.length === 1 ? { ...notes[0], parentTitle: item.title } : null;
    }
    if (item.kind !== "note" || !item.parentRef)
        return null;
    const detail = await runtime.hostApi.library.getNoteDetail(item.ref, {
        format: "html",
    });
    return detail.kind === "managed" && detail.noteKind === "digest"
        ? { ref: item.ref, parentRef: item.parentRef, noteKind: "digest" }
        : null;
}
function deepFreeze(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object" || seen.has(value)) {
        return value;
    }
    seen.add(value);
    for (const nested of Object.values(value)) {
        deepFreeze(nested, seen);
    }
    return Object.freeze(value);
}
function itemIdentity(kind, entry, fallback) {
    if (kind === "selection")
        return "selection:context";
    return `${kind}:${itemRefIdentity(entry.ref)}`;
}
function parentIdentityFromEntry(entry, kind) {
    const fact = entry;
    const ref = kind === "parent" ? fact.ref : fact.parentRef;
    return ref
        ? { parentIdentity: `parent:${itemRefIdentity(ref)}`, targetParentRef: ref }
        : {};
}
function entryLabel(entry, fallback) {
    const fact = entry;
    return fact.title || fact.filename || fact.parentTitle || fallback;
}
function freezeCandidate(args) {
    const scopedContext = args.scopedContext ||
        (args.kind === "selection"
            ? args.selection
            : lockSelection([args.entry], args.selection.sampledAt));
    return Object.freeze({
        kind: args.kind,
        identity: args.identity || itemIdentity(args.kind, args.entry, args.index),
        label: args.label || entryLabel(args.entry, `${args.kind} ${args.index + 1}`),
        ...parentIdentityFromEntry(args.entry, args.kind),
        scopedContext: deepFreeze(scopedContext),
        value: deepFreeze(args.entry),
    });
}
function dedupeCandidates(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
        if (seen.has(candidate.identity)) {
            return false;
        }
        seen.add(candidate.identity);
        return true;
    });
}
async function relatedEntries(kind, selection, runtime) {
    const entries = [];
    for (const item of selection.items) {
        if (kind === "parent") {
            const parent = await regularParent(item, runtime);
            if (parent)
                entries.push(parent);
        }
        else if (kind === "attachment") {
            if (item.kind === "attachment")
                entries.push(await hydrateSelected(item, runtime));
            else if (item.kind === "parent")
                entries.push(...(await readAttachments(item.ref, runtime)));
        }
        else if (kind === "note") {
            if (item.kind === "note")
                entries.push(item);
            else if (item.kind === "parent") {
                for (const note of await readNotes(item.ref, runtime))
                    entries.push({
                        kind: "note",
                        itemType: "note",
                        ref: note.ref,
                        parentRef: item.ref,
                    });
            }
        }
        else if (kind === item.kind)
            entries.push(item);
    }
    return entries;
}
async function selectCandidates(args) {
    const selector = args.manifest.validateSelection.select;
    const kind = args.manifest.inputs.member.kind;
    const freeze = (entry, index, memberKind = kind, scopedContext) => freezeCandidate({
        kind: memberKind,
        entry,
        index,
        selection: args.selection,
        runtime: args.runtime,
        scopedContext,
    });
    if (selector.policy === "selection")
        return [freeze(args.selection, 0)];
    if (selector.policy === "literature-source")
        return (await collectSelectedLiteratureSources(args.selection, args.runtime)).map((entry, index) => freeze(entry, index, "attachment"));
    if (selector.policy === "generated-note-candidates") {
        return (await selectGeneratedNoteCandidates(args.selection, args.runtime)).map((entry, index) => freeze(entry, index, "generated-note", {
            ...lockSelection([
                {
                    kind: "note",
                    itemType: "note",
                    ref: entry.ref,
                    ...(entry.parentRef ? { parentRef: entry.parentRef } : {}),
                },
            ], args.selection.sampledAt),
            exportCandidates: [entry],
        }));
    }
    if (selector.policy === "digest-representative-image") {
        const entry = await selectDigestRepresentativeImage(args.selection, args.runtime);
        return entry
            ? [
                freeze(entry, 0, "digest-image-target", {
                    ...args.selection,
                    digestRepresentativeImageTarget: entry,
                }),
            ]
            : [];
    }
    const entries = selector.source === "related"
        ? await relatedEntries(kind, args.selection, args.runtime)
        : await Promise.all(args.selection.items
            .filter((item) => item.kind === kind)
            .map((item) => hydrateSelected(item, args.runtime)));
    return dedupeCandidates(entries.map((entry, index) => freeze(entry, index)));
}
function recordSkip(candidate, reason, skipped) {
    if (!skipped.has(candidate.identity)) {
        skipped.set(candidate.identity, reason);
    }
}
function candidateParentRef(candidate) {
    return candidate.targetParentRef;
}
async function applyCandidateFilters(args) {
    let current = [...args.candidates];
    for (const filter of args.manifest.validateSelection.filters) {
        if (filter.phase === "execute" && args.rootArgs.mode === "menu") {
            continue;
        }
        if (filter.kind === "candidates-per-parent") {
            const counts = new Map();
            for (const candidate of current) {
                if (!candidate.parentIdentity)
                    continue;
                counts.set(candidate.parentIdentity, (counts.get(candidate.parentIdentity) || 0) + 1);
            }
            current = current.filter((candidate) => {
                const count = candidate.parentIdentity
                    ? counts.get(candidate.parentIdentity) || 0
                    : 0;
                const accepted = !!candidate.parentIdentity && matchesCountRule(count, filter.counts);
                if (!accepted) {
                    recordSkip(candidate, candidate.parentIdentity
                        ? "candidates-per-parent"
                        : "missing-parent", args.skipped);
                }
                return accepted;
            });
            continue;
        }
        const accepted = [];
        for (const candidate of current) {
            let keep = true;
            const attachment = candidate.value;
            if (filter.kind === "source-file-exists") {
                const sourcePath = await resolveAttachmentSourcePath(attachment, args.runtime);
                keep = !!sourcePath && (await fileExists(sourcePath, args.runtime));
            }
            else if (filter.kind === "generated-note-kinds-absent") {
                const parentRef = candidateParentRef(candidate);
                keep =
                    !!parentRef &&
                        !(await parentHasAllGeneratedNotes(parentRef, filter.noteKinds, args.runtime));
            }
            else if (filter.kind === "generated-note-readiness") {
                const parentRef = candidateParentRef(candidate);
                keep =
                    !!parentRef &&
                        (await evaluateGeneratedNoteFactsReadiness(await readGeneratedNoteFacts(parentRef, args.runtime), filter)).accepted;
            }
            else if (filter.kind === "artifact-absent") {
                keep =
                    (await filterArtifactConflicts([attachment], {
                        ...args.rootArgs,
                        manifest: {
                            ...args.manifest,
                            validateSelection: {
                                ...args.manifest.validateSelection,
                                filters: [filter],
                            },
                        },
                    }, args.runtime)).length === 1;
            }
            if (keep) {
                accepted.push(candidate);
            }
            else {
                recordSkip(candidate, filter.kind, args.skipped);
            }
        }
        current = accepted;
    }
    return current;
}
function mergeScopedContexts(candidates) {
    if (candidates.length === 1 && candidates[0].kind === "selection") {
        return candidates[0].scopedContext;
    }
    const items = new Map();
    for (const candidate of candidates)
        for (const item of candidate.scopedContext.items) {
            const key = itemRefIdentity(item.ref);
            if (!items.has(key))
                items.set(key, item);
        }
    const generated = candidates
        .filter((item) => item.kind === "generated-note")
        .map((item) => item.value);
    const digest = candidates.find((item) => item.kind === "digest-image-target");
    return deepFreeze({
        ...lockSelection([...items.values()], candidates[0]?.scopedContext.sampledAt),
        ...(generated.length ? { exportCandidates: generated } : {}),
        ...(digest
            ? {
                digestRepresentativeImageTarget: digest.value,
            }
            : {}),
    });
}
function freezeUnit(args) {
    const members = Object.freeze([...args.candidates]);
    const memberIdentities = Object.freeze(members.map((candidate) => candidate.identity));
    return Object.freeze({
        unitId: `unit-${args.order + 1}`,
        order: args.order,
        taskName: args.taskName,
        inputUnitIdentity: memberIdentities.length === 1
            ? memberIdentities[0]
            : `group:${memberIdentities.join("+")}`,
        memberIdentities,
        memberCount: members.length,
        members,
        ...(args.targetParentIdentity
            ? { targetParentIdentity: args.targetParentIdentity }
            : {}),
        ...(args.targetParentRef ? { targetParentRef: args.targetParentRef } : {}),
        selectionContext: mergeScopedContexts(members),
    });
}
function groupCandidates(args) {
    const mode = args.manifest.inputs.grouping.mode;
    if (mode === "each") {
        return args.candidates.map((candidate, order) => freezeUnit({
            candidates: [candidate],
            order,
            taskName: candidate.label,
            targetParentIdentity: candidate.parentIdentity,
            targetParentRef: candidate.targetParentRef,
        }));
    }
    if (mode === "all") {
        if (args.candidates.length === 0)
            return [];
        const parentIdentities = new Set(args.candidates.map((candidate) => candidate.parentIdentity));
        const targetParentIdentity = parentIdentities.size === 1
            ? args.candidates[0].parentIdentity
            : undefined;
        const targetParentRef = targetParentIdentity &&
            args.candidates.every((candidate) => candidate.targetParentRef &&
                args.candidates[0].targetParentRef &&
                itemRefIdentity(candidate.targetParentRef) ===
                    itemRefIdentity(args.candidates[0].targetParentRef))
            ? args.candidates[0].targetParentRef
            : undefined;
        return [
            freezeUnit({
                candidates: args.candidates,
                order: 0,
                taskName: args.manifest.label,
                targetParentIdentity,
                targetParentRef,
            }),
        ];
    }
    const groups = new Map();
    for (const candidate of args.candidates) {
        if (!candidate.parentIdentity) {
            recordSkip(candidate, "missing-parent", args.skipped);
            continue;
        }
        const existing = groups.get(candidate.parentIdentity);
        if (existing) {
            existing.members.push(candidate);
            continue;
        }
        groups.set(candidate.parentIdentity, {
            members: [candidate],
            targetParentRef: candidate.targetParentRef,
            label: candidate.kind === "parent"
                ? candidate.label
                : String(candidate.value.parentTitle ||
                    candidate.label),
        });
    }
    return Array.from(groups.entries()).map(([targetParentIdentity, group], order) => freezeUnit({
        candidates: group.members,
        order,
        taskName: group.label,
        targetParentIdentity,
        targetParentRef: group.targetParentRef,
    }));
}
function buildReasonCounts(skipped) {
    const counts = {};
    for (const reason of skipped.values()) {
        counts[reason] = (counts[reason] || 0) + 1;
    }
    return Object.freeze(counts);
}
function freezePlan(args) {
    const candidates = Object.freeze([...args.candidates]);
    const units = Object.freeze([...args.units]);
    return Object.freeze({
        state: args.state,
        ...(args.reasonCode ? { reasonCode: args.reasonCode } : {}),
        selectionCounts: Object.freeze({ ...args.selectionCounts }),
        candidates,
        units,
        stats: Object.freeze({
            candidates: Object.freeze({
                total: args.totalCandidates,
                accepted: candidates.length,
                skipped: Math.max(args.skipped.size, args.totalCandidates - candidates.length),
                reasons: buildReasonCounts(args.skipped),
            }),
            units: Object.freeze({
                total: units.length,
                executable: units.length,
                skipped: 0,
            }),
        }),
    });
}
export async function planWorkflowInput(args) {
    const manifest = args.manifest || args.workflow?.manifest;
    if (!manifest) {
        throw new Error("workflow manifest is required");
    }
    const runtime = createSelectionRuntime(args.runtime);
    const selection = copySelection(args.selectionContext);
    const rawCounts = getSelectionItemCounts(selection);
    const selectionCounts = {
        parents: rawCounts.parents,
        children: rawCounts.children,
        attachments: rawCounts.attachments,
        notes: rawCounts.notes,
        total: totalCount(rawCounts),
    };
    const skipped = new Map();
    if (args.mode !== "handoff" &&
        !hasAnySelectionItems(selection) &&
        manifest.trigger.requiresSelection) {
        return freezePlan({
            state: "disabled",
            reasonCode: "no-selection",
            selectionCounts,
            candidates: [],
            units: [],
            totalCandidates: 0,
            skipped,
        });
    }
    const requiredError = args.mode === "handoff"
        ? ""
        : validateRequiredCounts(manifest.validateSelection, selection);
    if (requiredError) {
        return freezePlan({
            state: "disabled",
            reasonCode: requiredError,
            selectionCounts,
            candidates: [],
            units: [],
            totalCandidates: selectionCounts.total,
            skipped,
        });
    }
    const selected = await selectCandidates({
        manifest,
        selection,
        runtime,
    });
    const totalCandidates = selected.length;
    let candidates = selected;
    const acceptedMimes = manifest.inputs.member.accepts?.mime;
    if (acceptedMimes) {
        candidates = candidates.filter((candidate) => {
            const accepted = candidate.kind === "attachment" &&
                applyAttachmentMimeFilter([candidate.value], acceptedMimes).length === 1;
            if (!accepted) {
                recordSkip(candidate, "mime-not-accepted", skipped);
            }
            return accepted;
        });
    }
    if (args.mode !== "handoff") {
        candidates = await applyCandidateFilters({
            candidates,
            rootArgs: args,
            manifest,
            runtime,
            skipped,
        });
    }
    if (args.mode !== "handoff" &&
        !matchesCountRule(candidates.length, manifest.validateSelection.require?.candidates)) {
        return freezePlan({
            state: "disabled",
            reasonCode: "candidate-count",
            selectionCounts,
            candidates,
            units: [],
            totalCandidates,
            skipped,
        });
    }
    const units = groupCandidates({ candidates, manifest, skipped });
    const acceptedIdentities = new Set(units.flatMap((unit) => unit.memberIdentities));
    candidates = candidates.filter((candidate) => acceptedIdentities.has(candidate.identity));
    return freezePlan({
        state: units.length > 0 ? "enabled" : "disabled",
        reasonCode: units.length > 0 ? undefined : "no-valid-input-units",
        selectionCounts,
        candidates,
        units,
        totalCandidates,
        skipped,
    });
}
export async function evaluateWorkflowSelection(args) {
    const plan = await planWorkflowInput(args);
    return {
        state: plan.state,
        reasonCode: plan.reasonCode,
        scopedSelectionContexts: plan.units.map((unit) => unit.selectionContext),
        stats: {
            totalUnits: plan.stats.candidates.total,
            validUnits: plan.units.length,
            skippedUnits: plan.stats.candidates.skipped,
        },
    };
}
