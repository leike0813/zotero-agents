import { getBaseName, joinPath, normalizeNativeLocalPath, } from "../../../utils/path";
import { sha256PrefixedHex } from "../../../utils/sha256";
import { parseSourceReferenceArtifact, exportCanonicalCitationAnalysisArtifact, } from "../../../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import { renderCitationAnalysisMarkdown } from "../../../../packages/synthesis-application/src/referenceProjection";
import { copyRuntimeFile, ensureRuntimeDirectory, getRuntimePersistencePaths, listRuntimeChildren, moveRuntimePath, readRuntimeTextFile, removeRuntimePath, runtimePathExists, writeRuntimeTextFile, } from "../../runtimePersistence";
import { digestRuntimeFileSource, inspectRuntimeFileSource, } from "../../runtimeFileTransfer";
import { registerHostBridgeExportFile } from "../server/hostBridgeFileRegistry";
import { createWorkflowArchiveApi, } from "../../../workflows/archive";
import { SYNTHESIS_PAPER_ARTIFACT_TYPES, } from "../../../../packages/synthesis-contracts/src/index";
import { executeReservedMutation, MutationAuthorityExecutionError, } from "../../zoteroHostMutationAuthority";
const MAX_PAPER_SELECTORS = 100;
const MAX_TOPIC_SELECTORS = 20;
const MAX_RESOLVED_PAPERS = 500;
const MAX_BUNDLE_FILES = 5000;
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024 * 1024;
export const RESEARCH_BUNDLE_ARTIFACT_TYPES = SYNTHESIS_PAPER_ARTIFACT_TYPES;
export class DirectResearchBundleError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "DirectResearchBundleError";
        this.code = code;
        this.details = details;
    }
}
function cleanString(value) {
    return typeof value === "string" ? value.trim() : String(value || "").trim();
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const text = cleanString(value);
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        result.push(text);
    }
    return result;
}
function encodePathSegment(value, fallback) {
    const text = cleanString(value);
    if (!text)
        return fallback;
    return encodeURIComponent(text);
}
function normalizeEntryPath(value) {
    const raw = cleanString(value)
        .replace(/\\/g, "/")
        .replace(/\/{2,}/g, "/");
    if (!raw || raw.startsWith("/") || /^[A-Za-z]:\//.test(raw)) {
        throw new DirectResearchBundleError("research_bundle_path_invalid", "Research bundle entry path is invalid", { path: raw });
    }
    const parts = raw.split("/");
    if (parts.some((part) => !part || part === "." || part === "..")) {
        throw new DirectResearchBundleError("research_bundle_path_invalid", "Research bundle entry path is invalid", { path: raw });
    }
    return parts.join("/");
}
function parsePaperRef(value) {
    const text = cleanString(value);
    const match = text.match(/^(\d+):(.+)$/);
    if (!match)
        return null;
    const libraryId = Number(match[1]);
    const itemKey = cleanString(match[2]);
    if (!Number.isInteger(libraryId) || libraryId <= 0 || !itemKey)
        return null;
    return { paperRef: `${libraryId}:${itemKey}`, libraryId, itemKey };
}
export function paperBundleDirectory(paperRef) {
    const parsed = parsePaperRef(paperRef);
    if (!parsed) {
        throw new DirectResearchBundleError("invalid_research_bundle_selector", "Canonical paper ref must use libraryId:itemKey", { paperRef: cleanString(paperRef) });
    }
    return `papers/${parsed.libraryId}/${encodePathSegment(parsed.itemKey, "item")}`;
}
function dirname(value) {
    const normalized = value.replace(/\\/g, "/");
    const index = normalized.lastIndexOf("/");
    return index < 0 ? "" : normalized.slice(0, index);
}
function normalizeLocalPath(value) {
    const raw = cleanString(value).replace(/\\/g, "/");
    const drive = raw.match(/^([A-Za-z]:)/)?.[1] || "";
    const absolute = raw.startsWith("/");
    const parts = [];
    for (const part of raw.replace(/^[A-Za-z]:/, "").split("/")) {
        if (!part || part === ".")
            continue;
        if (part === "..") {
            parts.pop();
            continue;
        }
        parts.push(part);
    }
    return `${drive}${absolute ? "/" : drive ? "/" : ""}${parts.join("/")}`;
}
function resolveMarkdownImagePath(sourcePath, destination) {
    const raw = cleanString(destination).replace(/^<|>$/g, "");
    if (!raw || /^(?:https?:|data:)/i.test(raw))
        return null;
    const match = raw.match(/^([^?#]*)([?#].*)?$/);
    const suffix = match?.[2] || "";
    let path = match?.[1] || "";
    try {
        path = decodeURIComponent(path);
    }
    catch {
        // Keep the original path for the existence probe.
    }
    if (/^file:/i.test(path)) {
        try {
            const url = new URL(path);
            path = decodeURIComponent(url.pathname || "");
            if (/^\/[A-Za-z]:\//.test(path))
                path = path.slice(1);
        }
        catch {
            return null;
        }
    }
    else if (!/^(?:[A-Za-z]:[\\/]|\/)/.test(path)) {
        path = joinPath(dirname(sourcePath), path);
    }
    const sourceRoot = normalizeLocalPath(dirname(sourcePath));
    const candidate = normalizeLocalPath(path);
    const insensitive = /^[A-Za-z]:\//.test(sourceRoot);
    const comparedRoot = insensitive ? sourceRoot.toLowerCase() : sourceRoot;
    const comparedCandidate = insensitive ? candidate.toLowerCase() : candidate;
    if (!comparedRoot ||
        !comparedCandidate.startsWith(`${comparedRoot}/`) ||
        comparedCandidate === comparedRoot) {
        return { outside: true, path: candidate, suffix, relativePath: "" };
    }
    return {
        outside: false,
        path: candidate,
        suffix,
        relativePath: candidate.slice(sourceRoot.length + 1),
    };
}
async function rewriteMarkdownImages(args) {
    const assets = [];
    const warnings = [];
    const paperDir = paperBundleDirectory(args.paperRef);
    const matches = [...args.markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    let markdown = args.markdown;
    const copied = new Map();
    for (const match of matches.reverse()) {
        const resolved = resolveMarkdownImagePath(args.sourcePath, match[2]);
        if (!resolved)
            continue;
        if (resolved.outside) {
            warnings.push({
                code: "markdown_image_outside_source_tree",
                paper_ref: args.paperRef,
                path: getBaseName(resolved.path),
            });
            continue;
        }
        const nativePath = await probeNativeLocalPath(resolved.path);
        if (!nativePath) {
            warnings.push({
                code: "markdown_image_missing",
                paper_ref: args.paperRef,
                path: resolved.relativePath,
            });
            continue;
        }
        const relativePath = normalizeEntryPath(resolved.relativePath);
        if (!copied.has(resolved.path)) {
            copied.set(resolved.path, relativePath);
            assets.push({
                path: `${paperDir}/${relativePath}`,
                sourcePath: nativePath,
                contentType: "application/octet-stream",
            });
        }
        const encoded = relativePath
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
        const replacement = `![${match[1]}](${encoded}${resolved.suffix})`;
        markdown = `${markdown.slice(0, match.index)}${replacement}${markdown.slice((match.index || 0) + match[0].length)}`;
    }
    return { markdown, assets, warnings };
}
async function probeNativeLocalPath(path) {
    if (!path)
        return undefined;
    try {
        const nativePath = normalizeNativeLocalPath(path);
        return (await runtimePathExists(nativePath)) ? nativePath : undefined;
    }
    catch {
        return undefined;
    }
}
function artifactMarkdown(artifact) {
    if (cleanString(artifact.status || "available") !== "available")
        return "";
    if (typeof artifact.markdown === "string")
        return artifact.markdown;
    const payload = artifact.payload;
    if (isRecord(payload) && typeof payload.content === "string") {
        return payload.content;
    }
    return "";
}
function citationReportMarkdown(artifact, referencesPayload) {
    if (cleanString(artifact.status || "available") !== "available")
        return "";
    if (referencesPayload == null) {
        throw new DirectResearchBundleError("citation_references_required", "Canonical Citation export requires the complete References artifact");
    }
    return renderCitationAnalysisMarkdown({
        citation: artifact.payload,
        references: referencesPayload,
    });
}
export function formatResearchBundleArtifact(artifact, options = {}) {
    const artifactType = cleanString(artifact.artifact_type || artifact.artifactType);
    if (artifactType === "digest") {
        return {
            artifactType,
            filename: "digest.md",
            contentType: "text/markdown",
            text: artifactMarkdown(artifact),
            diagnostics: [],
        };
    }
    if (artifactType === "references") {
        return {
            artifactType,
            filename: "references.json",
            contentType: "application/json",
            text: `${JSON.stringify(parseSourceReferenceArtifact(artifact.payload), null, 2)}\n`,
            diagnostics: [],
        };
    }
    if (artifactType === "citation_analysis") {
        const markdown = citationReportMarkdown(artifact, options.referencesPayload);
        return {
            artifactType,
            filename: "citation-analysis.md",
            contentType: "text/markdown",
            text: markdown,
            diagnostics: [],
            canonicalFile: {
                filename: "citation-analysis.json",
                text: `${JSON.stringify(exportCanonicalCitationAnalysisArtifact(artifact.payload), null, 2)}\n`,
            },
        };
    }
    if (artifactType === "literature_score") {
        return {
            artifactType,
            filename: "literature-score.json",
            contentType: "application/json",
            text: `${JSON.stringify(artifact.payload, null, 2)}\n`,
            diagnostics: [],
        };
    }
    return null;
}
export async function materializeResearchBundlePapers(args) {
    const includeMetadata = args.includeMetadata !== false;
    const includeSource = args.includeSource !== false;
    const requestedTypes = Array.from(new Set(args.artifactTypes?.length
        ? args.artifactTypes
        : RESEARCH_BUNDLE_ARTIFACT_TYPES));
    const sourcePaperRefs = args.sourcePaperRefs?.length
        ? new Set(uniqueStrings(args.sourcePaperRefs))
        : null;
    const result = await args.readArtifacts({
        paperRefs: args.papers.map((paper) => paper.paperRef),
        artifactTypes: requestedTypes.includes("citation_analysis")
            ? [...new Set([...requestedTypes, "references"])]
            : requestedTypes,
    });
    const artifacts = isRecord(result) && Array.isArray(result.artifacts)
        ? result.artifacts.filter(isRecord)
        : [];
    const entries = [];
    const warnings = [];
    const paperRecords = [];
    for (const paper of args.papers) {
        const paperDir = paperBundleDirectory(paper.paperRef);
        const record = {
            paper_ref: paper.paperRef,
            library_id: paper.libraryId,
            item_key: paper.itemKey,
            title: paper.title,
            metadata_path: includeMetadata ? `${paperDir}/metadata.json` : undefined,
            source: null,
            artifacts: [],
        };
        if (includeMetadata) {
            entries.push({
                path: `${paperDir}/metadata.json`,
                contentType: "application/json",
                text: `${JSON.stringify(paper.metadata, null, 2)}\n`,
            });
        }
        if (includeSource &&
            (!sourcePaperRefs || sourcePaperRefs.has(paper.paperRef))) {
            const markdown = paper.attachments.find((entry) => /(?:markdown|\.md$)/i.test(`${entry.contentType} ${entry.filename}`));
            const pdf = paper.attachments.find((entry) => /(?:application\/pdf|\.pdf$)/i.test(`${entry.contentType} ${entry.filename}`));
            const markdownPath = await probeNativeLocalPath(markdown?.path);
            const pdfPath = markdownPath
                ? undefined
                : await probeNativeLocalPath(pdf?.path);
            if (markdownPath) {
                const rewritten = await rewriteMarkdownImages({
                    markdown: await readRuntimeTextFile(markdownPath),
                    sourcePath: markdownPath,
                    paperRef: paper.paperRef,
                });
                entries.push({
                    path: `${paperDir}/source.md`,
                    contentType: "text/markdown",
                    text: rewritten.markdown,
                });
                entries.push(...rewritten.assets);
                warnings.push(...rewritten.warnings);
                record.source = {
                    kind: "markdown",
                    path: `${paperDir}/source.md`,
                    assets: rewritten.assets.map((entry) => entry.path),
                };
            }
            else if (pdfPath) {
                entries.push({
                    path: `${paperDir}/source.pdf`,
                    contentType: "application/pdf",
                    sourcePath: pdfPath,
                });
                record.source = {
                    kind: "pdf",
                    path: `${paperDir}/source.pdf`,
                    assets: [],
                };
            }
            else {
                warnings.push({ code: "source_missing", paper_ref: paper.paperRef });
            }
        }
        const artifactRecords = [];
        const referencesArtifact = artifacts.find((entry) => cleanString(entry.paper_ref) === paper.paperRef &&
            cleanString(entry.artifact_type) === "references" &&
            cleanString(entry.status) === "available");
        for (const artifactType of requestedTypes) {
            const artifact = artifacts.find((entry) => cleanString(entry.paper_ref) === paper.paperRef &&
                cleanString(entry.artifact_type) === artifactType);
            const status = artifact ? cleanString(artifact.status) : "missing";
            const artifactRecord = {
                artifact_type: artifactType,
                status: status || "missing",
            };
            if (artifact && status === "available") {
                const presentation = formatResearchBundleArtifact(artifact, {
                    referencesPayload: referencesArtifact?.payload,
                });
                if (presentation) {
                    const contentPath = `${paperDir}/${presentation.filename}`;
                    entries.push({
                        path: contentPath,
                        contentType: presentation.contentType,
                        text: presentation.text,
                    });
                    artifactRecord.path = contentPath;
                    artifactRecord.diagnostics = presentation.diagnostics;
                    if (presentation.canonicalFile) {
                        const canonicalPath = `${paperDir}/${presentation.canonicalFile.filename}`;
                        entries.push({
                            path: canonicalPath,
                            contentType: "application/json",
                            text: presentation.canonicalFile.text,
                        });
                        artifactRecord.canonical_path = canonicalPath;
                    }
                }
            }
            else {
                warnings.push({
                    code: "artifact_missing",
                    paper_ref: paper.paperRef,
                    artifact_type: artifactType,
                    ...(artifact && cleanString(artifact.missing_reason)
                        ? { reason: cleanString(artifact.missing_reason) }
                        : {}),
                });
            }
            artifactRecords.push(artifactRecord);
        }
        record.artifacts = artifactRecords;
        paperRecords.push(record);
    }
    return { entries, warnings, papers: paperRecords };
}
export function createResearchBundleMaterializer(dependencies) {
    return async (args) => {
        const papers = [];
        const warnings = [];
        const seen = new Set();
        for (const selected of Array.isArray(args?.papers) ? args.papers : []) {
            const paperRef = cleanString(selected?.paperRef);
            if (!paperRef || seen.has(paperRef))
                continue;
            seen.add(paperRef);
            const parsed = parsePaperRef(paperRef);
            if (!parsed) {
                warnings.push({
                    code: "paper_missing",
                    paper_ref: paperRef,
                    reason: "invalid_paper_ref",
                });
                continue;
            }
            const paper = await dependencies.resolvePaper(parsed);
            if (!paper) {
                warnings.push({ code: "paper_missing", paper_ref: paperRef });
                continue;
            }
            papers.push(paper);
        }
        if (!papers.length) {
            return { entries: [], warnings, papers: [] };
        }
        const materialized = await materializeResearchBundlePapers({
            papers,
            readArtifacts: dependencies.readArtifacts,
            sourcePaperRefs: args.sourcePaperRefs,
        });
        return {
            ...materialized,
            warnings: [...warnings, ...materialized.warnings],
        };
    };
}
export function rewriteTopicReportDigestLinks(args) {
    const lines = args.report.split(/\r?\n/);
    let valid = true;
    for (const [index, source] of args.sourcePapers.entries()) {
        const ordinal = index + 1;
        const anchor = `<a id="ref-${ordinal}"></a>`;
        const marker = `{${source.paperRef}}`;
        const lineIndex = lines.findIndex((line) => line.includes(anchor) && line.includes(marker));
        if (lineIndex < 0) {
            valid = false;
            break;
        }
        if (args.availableDigestRefs.has(source.paperRef)) {
            const target = `../../${paperBundleDirectory(source.paperRef)}/digest.md`;
            lines[lineIndex] = lines[lineIndex].replace(marker, `[${marker}](${target})`);
        }
    }
    if (valid) {
        return { report: lines.join("\n"), fallbackSources: "", warning: null };
    }
    const sources = ["# Sources", ""];
    for (const [index, source] of args.sourcePapers.entries()) {
        const marker = `{${source.paperRef}}`;
        const label = `${index + 1}. ${source.title || source.paperRef} ${marker}`;
        if (args.availableDigestRefs.has(source.paperRef)) {
            sources.push(`- [${label}](../../${paperBundleDirectory(source.paperRef)}/digest.md)`);
        }
        else {
            sources.push(`- ${label}`);
        }
    }
    return {
        report: args.report,
        fallbackSources: `${sources.join("\n")}\n`,
        warning: {
            code: "topic_report_navigation_fallback",
            topic_id: args.topicId,
        },
    };
}
function validateSelectorLimit(kind, count) {
    const maximum = kind === "papers" ? MAX_PAPER_SELECTORS : MAX_TOPIC_SELECTORS;
    if (count < 1 || count > maximum) {
        throw new DirectResearchBundleError(count < 1
            ? "invalid_research_bundle_selector"
            : "research_bundle_limit_exceeded", count < 1
            ? `Direct ${kind} bundle requires at least one selector`
            : `Direct ${kind} bundle selector limit exceeded`, { kind, count, maximum });
    }
}
export function validateDirectResearchBundleScope(args) {
    validateSelectorLimit(args.kind, args.selectorCount);
    if (args.resolvedPaperCount > MAX_RESOLVED_PAPERS) {
        throw new DirectResearchBundleError("research_bundle_limit_exceeded", "Direct research bundle resolved-paper limit exceeded", {
            count: args.resolvedPaperCount,
            maximum: MAX_RESOLVED_PAPERS,
        });
    }
}
async function entryIntegrity(entry) {
    if (typeof entry.text === "string") {
        const bytes = new TextEncoder().encode(entry.text);
        return {
            path: entry.path,
            content_type: entry.contentType,
            size: bytes.byteLength,
            sha256: await sha256PrefixedHex(bytes),
        };
    }
    if (!entry.sourcePath) {
        throw new DirectResearchBundleError("research_bundle_materialization_failed", "Research bundle entry has no content source", { path: entry.path });
    }
    const source = await inspectRuntimeFileSource(entry.sourcePath);
    const digest = await digestRuntimeFileSource(source);
    return {
        path: entry.path,
        content_type: entry.contentType,
        size: source.size,
        sha256: digest.sha256,
    };
}
async function writeEntries(root, entries) {
    const seen = new Set();
    const portableSeen = new Map();
    for (const entry of entries) {
        const relativePath = normalizeEntryPath(entry.path);
        const portablePath = relativePath.toLocaleLowerCase("en-US");
        if (seen.has(relativePath) || portableSeen.has(portablePath)) {
            throw new DirectResearchBundleError("research_bundle_path_collision", "Research bundle entries collide", {
                path: relativePath,
                existingPath: portableSeen.get(portablePath) || relativePath,
            });
        }
        seen.add(relativePath);
        portableSeen.set(portablePath, relativePath);
        const targetPath = joinPath(root, relativePath);
        if (typeof entry.text === "string") {
            await writeRuntimeTextFile(targetPath, entry.text);
        }
        else if (entry.sourcePath) {
            await copyRuntimeFile({ sourcePath: entry.sourcePath, targetPath });
        }
    }
}
function bundleIndex(args) {
    const lines = ["# Direct Research Bundle", "", `Kind: ${args.kind}`, ""];
    if (args.kind === "topics") {
        lines.push("## Topics", "");
        for (const topic of args.topics || []) {
            lines.push(`- [${cleanString(topic.title || topic.topic_id)}](${cleanString(topic.report_path)})`);
        }
        lines.push("");
    }
    lines.push("## Papers", "");
    for (const paper of args.papers) {
        const paperRef = cleanString(paper.paper_ref);
        const digest = Array.isArray(paper.artifacts)
            ? paper.artifacts
                .filter(isRecord)
                .find((entry) => cleanString(entry.artifact_type) === "digest")
            : null;
        const digestPath = isRecord(digest) ? cleanString(digest.path) : "";
        lines.push(digestPath ? `- [${paperRef}](${digestPath})` : `- ${paperRef}`);
    }
    if (args.warnings.length) {
        lines.push("", "## Warnings", "");
        for (const warning of args.warnings) {
            lines.push(`- ${warning.code}${warning.paper_ref ? `: ${warning.paper_ref}` : warning.topic_id ? `: ${warning.topic_id}` : ""}`);
        }
    }
    return `${lines.join("\n")}\n`;
}
export async function publishDirectResearchBundle(args) {
    const indexText = bundleIndex(args);
    const contentEntries = [
        ...args.entries,
        { path: "index.md", contentType: "text/markdown", text: indexText },
    ];
    if (contentEntries.length + 1 > MAX_BUNDLE_FILES) {
        throw new DirectResearchBundleError("research_bundle_limit_exceeded", "Direct research bundle file limit exceeded", { count: contentEntries.length + 1, maximum: MAX_BUNDLE_FILES });
    }
    const inventory = [];
    let payloadBytes = 0;
    for (const entry of contentEntries) {
        const integrity = await entryIntegrity(entry);
        payloadBytes += integrity.size;
        inventory.push(integrity);
    }
    if (payloadBytes > MAX_BUNDLE_BYTES) {
        throw new DirectResearchBundleError("research_bundle_limit_exceeded", "Direct research bundle payload limit exceeded", { bytes: payloadBytes, maximum: MAX_BUNDLE_BYTES });
    }
    const manifest = {
        schema_id: "research_bundle.direct_export",
        schema_version: "1.0.0",
        kind: args.kind,
        papers: args.papers,
        ...(args.topics ? { topics: args.topics } : {}),
        ...(args.papersByRef ? { papers_by_ref: args.papersByRef } : {}),
        files: inventory,
        warnings: args.warnings,
    };
    const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    const manifestBytes = new TextEncoder().encode(manifestText).byteLength;
    if (payloadBytes + manifestBytes > MAX_BUNDLE_BYTES) {
        throw new DirectResearchBundleError("research_bundle_limit_exceeded", "Direct research bundle final content limit exceeded", { bytes: payloadBytes + manifestBytes, maximum: MAX_BUNDLE_BYTES });
    }
    const allEntries = [
        ...contentEntries,
        {
            path: "manifest.json",
            contentType: "application/json",
            text: manifestText,
        },
    ];
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const stagingRoot = joinPath(getRuntimePersistencePaths().tmpDir, "direct-research-bundles", args.kind, stamp, "content");
    await ensureRuntimeDirectory(stagingRoot);
    try {
        await writeEntries(stagingRoot, allEntries);
        if (args.connectionMode === "local") {
            const outputDir = cleanString(args.outputDir);
            if (!outputDir) {
                throw new DirectResearchBundleError("invalid_research_bundle_selector", "Local direct research bundle export requires output_dir");
            }
            const normalizedOutputDir = normalizeLocalPath(outputDir);
            if (!getBaseName(normalizedOutputDir) ||
                normalizedOutputDir === "." ||
                normalizedOutputDir === ".." ||
                /^\/?[A-Za-z]:\/?$/.test(normalizedOutputDir)) {
                throw new DirectResearchBundleError("invalid_research_bundle_output", "Direct research bundle output directory is unsafe", { outputName: getBaseName(outputDir) });
            }
            if (await runtimePathExists(outputDir)) {
                const children = await listRuntimeChildren(outputDir);
                if (children.length) {
                    throw new DirectResearchBundleError("output_exists", "Direct research bundle output directory is not empty", { outputName: getBaseName(outputDir) });
                }
                await removeRuntimePath(outputDir);
            }
            await moveRuntimePath({ sourcePath: stagingRoot, targetPath: outputDir });
            return {
                manifest_file: "manifest.json",
                summary: {
                    kind: args.kind,
                    paper_count: args.papers.length,
                    topic_count: args.topics?.length || 0,
                    warning_count: args.warnings.length,
                },
                delivery: {
                    mode: "local",
                    outputName: getBaseName(outputDir) || `${args.kind}-research-bundle`,
                    manifestFile: "manifest.json",
                    fileCount: allEntries.length,
                    bytesWritten: payloadBytes + manifestBytes,
                },
            };
        }
        const archiveRoot = joinPath(getRuntimePersistencePaths().tmpDir, "direct-research-bundles", args.kind, stamp, "archive");
        await ensureRuntimeDirectory(archiveRoot);
        const zipPath = joinPath(archiveRoot, args.zipName);
        let archiveRegistered = false;
        try {
            const archiveEntries = allEntries.map((entry) => ({
                name: entry.path,
                content: {
                    kind: "file",
                    sourcePath: joinPath(stagingRoot, entry.path),
                },
            }));
            await createWorkflowArchiveApi().writeZipAtomic({
                targetPath: zipPath,
                entries: archiveEntries,
            });
            const source = await inspectRuntimeFileSource(zipPath);
            if (source.size > MAX_BUNDLE_BYTES) {
                throw new DirectResearchBundleError("research_bundle_limit_exceeded", "Direct research bundle archive limit exceeded", { bytes: source.size, maximum: MAX_BUNDLE_BYTES });
            }
            const digest = await digestRuntimeFileSource(source);
            const descriptor = await registerHostBridgeExportFile({
                localPath: zipPath,
                displayName: args.zipName,
                contentType: "application/zip",
                size: source.size,
                sha256: digest.sha256,
                owner: { capability: args.capability },
            });
            archiveRegistered = true;
            return {
                manifest_file: "manifest.json",
                summary: {
                    kind: args.kind,
                    paper_count: args.papers.length,
                    topic_count: args.topics?.length || 0,
                    warning_count: args.warnings.length,
                },
                delivery: {
                    mode: "bridge-download",
                    bundle: descriptor,
                    downloadCommand: `zotero-bridge file download ${descriptor.fileId} --output ${args.zipName}`,
                    unpackHint: `unzip ${args.zipName} -d .`,
                },
            };
        }
        finally {
            if (!archiveRegistered && (await runtimePathExists(archiveRoot))) {
                await removeRuntimePath(archiveRoot);
            }
        }
    }
    finally {
        if (await runtimePathExists(stagingRoot)) {
            await removeRuntimePath(stagingRoot);
        }
    }
}
function normalizePaperSelectors(value) {
    const selectors = Array.isArray(value) ? value : [];
    const normalized = [];
    const seen = new Set();
    for (const selector of selectors) {
        if (!isRecord(selector)) {
            throw new DirectResearchBundleError("invalid_research_bundle_selector", "Each paper selector must be an object containing id or key");
        }
        const id = cleanString(selector.id);
        const key = cleanString(selector.key);
        if ((!id && !key) || (id && key)) {
            throw new DirectResearchBundleError("invalid_research_bundle_selector", "Each paper selector must contain exactly one of id or key", { selector });
        }
        const libraryId = Number(selector.libraryId);
        if (key &&
            selector.libraryId !== undefined &&
            (!Number.isInteger(libraryId) || libraryId <= 0)) {
            throw new DirectResearchBundleError("invalid_research_bundle_selector", "Paper selector libraryId must be a positive integer", { selector });
        }
        const result = id
            ? { id }
            : {
                key,
                ...(selector.libraryId === undefined ? {} : { libraryId }),
            };
        const signature = id ? `id:${id}` : `key:${libraryId || ""}:${key}`;
        if (!seen.has(signature)) {
            seen.add(signature);
            normalized.push(result);
        }
    }
    validateDirectResearchBundleScope({
        kind: "papers",
        selectorCount: normalized.length,
        resolvedPaperCount: 0,
    });
    return normalized;
}
function paperMatchesSelector(paper, selector) {
    const id = cleanString(selector.id);
    if (id) {
        return [
            paper.metadata.id,
            paper.metadata.itemId,
            paper.metadata.itemID,
        ].some((value) => cleanString(value) === id);
    }
    const libraryId = Number(selector.libraryId);
    return (paper.itemKey === cleanString(selector.key) &&
        (!Number.isInteger(libraryId) ||
            libraryId <= 0 ||
            paper.libraryId === libraryId));
}
function directBundleDelivery(input, delivery = { mode: "local" }) {
    const outputDir = cleanString(input.output_dir || input.outputDir);
    if (delivery.mode === "local" && !outputDir) {
        throw new DirectResearchBundleError("missing_output_dir", "Local direct research bundle export requires output_dir");
    }
    if (delivery.mode === "remote" && outputDir) {
        throw new DirectResearchBundleError("remote_output_dir_forbidden", "Remote direct research bundle export cannot write a client-local directory");
    }
    return { connectionMode: delivery.mode, outputDir };
}
function topicIdsFromInput(input) {
    return uniqueStrings([
        ...(Array.isArray(input.topic_ids) ? input.topic_ids : []),
        ...(Array.isArray(input.topicIds) ? input.topicIds : []),
        input.topic_id,
        input.topicId,
    ]);
}
function sourcePapersFromTopicContext(value) {
    if (!isRecord(value) || !isRecord(value.semantic))
        return [];
    const semantic = value.semantic;
    const direct = Array.isArray(semantic.source_papers)
        ? semantic.source_papers
        : [];
    const resolved = isRecord(semantic.resolved_paper_set)
        ? semantic.resolved_paper_set.papers
        : [];
    return (direct.length ? direct : Array.isArray(resolved) ? resolved : [])
        .filter(isRecord)
        .map((paper) => ({
        paperRef: cleanString(paper.paper_ref ||
            (isRecord(paper.digest_ref) && paper.digest_ref.paper_ref)),
        title: cleanString(paper.title),
    }))
        .filter((paper) => paper.paperRef);
}
export function createDirectResearchBundleApplication(args) {
    async function resolvePapers(selectors, kind) {
        const papers = await args.host.resolveItems(selectors);
        const unresolved = selectors.filter((selector) => !papers.some((paper) => paperMatchesSelector(paper, selector)));
        const unexpected = papers.filter((paper) => !selectors.some((selector) => paperMatchesSelector(paper, selector)));
        if (unresolved.length || unexpected.length) {
            throw new DirectResearchBundleError("invalid_research_bundle_selector", "Paper selectors did not resolve to the exact requested Zotero item set", {
                unresolved,
                unexpected_paper_refs: unexpected.map((paper) => paper.paperRef),
            });
        }
        const byRef = new Map();
        for (const paper of papers) {
            const parsed = parsePaperRef(paper.paperRef);
            if (!parsed) {
                throw new DirectResearchBundleError("invalid_research_bundle_selector", "Resolved paper must expose a canonical libraryId:itemKey ref", { paperRef: paper.paperRef });
            }
            byRef.set(parsed.paperRef, {
                ...paper,
                paperRef: parsed.paperRef,
                libraryId: parsed.libraryId,
                itemKey: parsed.itemKey,
            });
        }
        const resolved = [...byRef.values()];
        validateDirectResearchBundleScope({
            kind,
            selectorCount: kind === "papers" ? selectors.length : 1,
            resolvedPaperCount: resolved.length,
        });
        return resolved;
    }
    async function exportPapers(input = {}, delivery) {
        const selectors = normalizePaperSelectors(input.items);
        const papers = await resolvePapers(selectors, "papers");
        const materialized = await materializeResearchBundlePapers({
            papers,
            readArtifacts: ({ paperRefs, artifactTypes }) => args.client.artifacts.readPaperArtifacts({
                paper_refs: paperRefs,
                artifact_types: artifactTypes,
            }),
        });
        return publishDirectResearchBundle({
            kind: "papers",
            capability: "items.export_research_bundle",
            ...directBundleDelivery(input, delivery),
            entries: materialized.entries,
            papers: materialized.papers,
            warnings: materialized.warnings,
            zipName: "papers-research-bundle.zip",
        });
    }
    async function exportTopics(input = {}, delivery) {
        const topicIds = topicIdsFromInput(input);
        validateDirectResearchBundleScope({
            kind: "topics",
            selectorCount: topicIds.length,
            resolvedPaperCount: 0,
        });
        const topics = [];
        for (const topicId of topicIds) {
            const [report, context] = await Promise.all([
                args.client.topics.getTopicReport({ topicId }),
                args.client.topics.getContext({ topicId, view: "semantic" }),
            ]);
            if (!report.ok || !cleanString(report.markdown)) {
                throw new DirectResearchBundleError("invalid_research_bundle_selector", "Topic selector did not resolve to an available report", { topicId });
            }
            topics.push({
                topicId: cleanString(report.topic_id) || topicId,
                title: cleanString(report.title) || topicId,
                report: report.markdown,
                sourcePapers: sourcePapersFromTopicContext(context),
                diagnostics: report.diagnostics,
            });
        }
        const sourceRefs = uniqueStrings(topics.flatMap((topic) => topic.sourcePapers.map((paper) => paper.paperRef)));
        const selectors = sourceRefs.map((paperRef) => {
            const parsed = parsePaperRef(paperRef);
            if (!parsed) {
                throw new DirectResearchBundleError("invalid_research_bundle_selector", "Topic source paper must use a canonical libraryId:itemKey ref", { paperRef });
            }
            return { key: parsed.itemKey, libraryId: parsed.libraryId };
        });
        const papers = selectors.length
            ? await resolvePapers(selectors, "topics")
            : [];
        validateDirectResearchBundleScope({
            kind: "topics",
            selectorCount: topicIds.length,
            resolvedPaperCount: papers.length,
        });
        const materialized = await materializeResearchBundlePapers({
            papers,
            readArtifacts: ({ paperRefs, artifactTypes }) => args.client.artifacts.readPaperArtifacts({
                paper_refs: paperRefs,
                artifact_types: artifactTypes,
            }),
            includeMetadata: false,
            includeSource: false,
            artifactTypes: ["digest"],
        });
        const availableDigestRefs = new Set(materialized.papers
            .filter((paper) => Array.isArray(paper.artifacts)
            ? paper.artifacts.some((artifact) => isRecord(artifact) &&
                cleanString(artifact.artifact_type) === "digest" &&
                cleanString(artifact.path))
            : false)
            .map((paper) => cleanString(paper.paper_ref)));
        const entries = [...materialized.entries];
        const warnings = [...materialized.warnings];
        const topicRecords = [];
        for (const topic of topics) {
            const directory = `topics/${encodePathSegment(topic.topicId, "topic")}`;
            const rewritten = rewriteTopicReportDigestLinks({
                report: topic.report,
                topicId: topic.topicId,
                sourcePapers: topic.sourcePapers,
                availableDigestRefs,
            });
            entries.push({
                path: `${directory}/report.md`,
                contentType: "text/markdown",
                text: rewritten.report,
            });
            if (rewritten.fallbackSources) {
                entries.push({
                    path: `${directory}/sources.md`,
                    contentType: "text/markdown",
                    text: rewritten.fallbackSources,
                });
            }
            if (rewritten.warning)
                warnings.push(rewritten.warning);
            for (const diagnostic of topic.diagnostics || []) {
                warnings.push({
                    code: "topic_report_diagnostic",
                    topic_id: topic.topicId,
                    reason: diagnostic,
                });
            }
            topicRecords.push({
                topic_id: topic.topicId,
                title: topic.title,
                report_path: `${directory}/report.md`,
                ...(rewritten.fallbackSources
                    ? { sources_path: `${directory}/sources.md` }
                    : {}),
                paper_refs: topic.sourcePapers.map((paper) => paper.paperRef),
            });
        }
        const papersByRef = Object.fromEntries(materialized.papers.map((paper) => {
            const paperRef = cleanString(paper.paper_ref);
            return [
                paperRef,
                {
                    digest_path: availableDigestRefs.has(paperRef)
                        ? `${paperBundleDirectory(paperRef)}/digest.md`
                        : null,
                    topic_ids: topics
                        .filter((topic) => topic.sourcePapers.some((sourcePaper) => sourcePaper.paperRef === paperRef))
                        .map((topic) => topic.topicId),
                },
            ];
        }));
        return publishDirectResearchBundle({
            kind: "topics",
            capability: "topics.export_research_bundle",
            ...directBundleDelivery(input, delivery),
            entries,
            papers: materialized.papers,
            topics: topicRecords,
            papersByRef,
            warnings,
            zipName: "topics-research-bundle.zip",
        });
    }
    return { exportPapers, exportTopics };
}
export const directResearchBundleLimits = {
    paperSelectors: MAX_PAPER_SELECTORS,
    topicSelectors: MAX_TOPIC_SELECTORS,
    resolvedPapers: MAX_RESOLVED_PAPERS,
    files: MAX_BUNDLE_FILES,
    bytes: MAX_BUNDLE_BYTES,
};
const RESEARCH_IMPORT_LIMITS = Object.freeze({
    papers: 1_000,
    notesPerPaper: 500,
    attachmentsPerPaper: 500,
    payloadsPerNote: 100,
    embeddedImagesPerNote: 100,
    relationEdges: 20_000,
    metadataBytes: 128 * 1024 * 1024,
    resourceBytes: 32 * 1024 * 1024 * 1024,
    identifierCharacters: 128,
});
export class ResearchBundleImportValidationError extends Error {
    code;
    details;
    constructor(code, details, message) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ResearchBundleImportValidationError";
    }
}
function createdRef(value) {
    return "ref" in value ? value.ref : value;
}
function createdOwnedRefs(value) {
    return "ref" in value && Array.isArray(value.ownedRefs)
        ? value.ownedRefs
        : [];
}
function throwIfResearchImportCanceled(control) {
    if (!control?.signal?.aborted)
        return;
    throw new MutationAuthorityExecutionError("canceled", "execution_failed", "commit", "retry_same_operation", { phase: "commit", recovery: "retry_same_operation" }, "Research import was canceled");
}
export function createResearchBundleImportEffects(host) {
    return {
        resolveLibraryId: host.resolveLibraryId,
        async validateExistingTarget(args) {
            const existing = await host.readExistingTarget({
                itemRef: args.itemRef,
                control: args.control,
            });
            if (!existing ||
                existing.itemRef.libraryId !== args.libraryId ||
                !existing.itemType) {
                importValidationError("invalid_ref", { kind: "item", reason: existing ? "foreign_scope" : "not_found" }, "Existing research target is unavailable");
            }
            return { itemRef: existing.itemRef, revision: existing.revision };
        },
        async validateCollectionTarget(args) {
            const collection = await host.readCollectionTarget?.({
                collectionRef: args.collectionRef,
                control: args.control,
            });
            if (!collection ||
                collection.collectionRef.libraryId !== args.libraryId) {
                importValidationError("invalid_ref", {
                    kind: "collection",
                    reason: collection ? "foreign_scope" : "not_found",
                }, "Research import collection is unavailable");
            }
            return collection;
        },
        async validateResource(args) {
            const resource = await host.resolveResource(args);
            return { sizeBytes: resource.sizeBytes, sha256: resource.sha256 };
        },
        async commitGroup(args) {
            const created = [];
            const residual = [];
            const parentByGraphId = new Map();
            const noteRefsByGraphId = new Map();
            const attachmentRefsByGraphId = new Map();
            try {
                for (const paper of args.papers) {
                    throwIfResearchImportCanceled(args.control);
                    const ref = createdRef(await host.createItem({
                        operationId: args.operationId,
                        consistencyGroupId: args.consistencyGroupId,
                        graphId: paper.graphId,
                        libraryId: args.libraryId,
                        item: paper.item,
                        control: args.control,
                    }));
                    validatePortableRef(ref, "created.itemRef", args.libraryId);
                    parentByGraphId.set(paper.graphId, ref);
                    created.push(ref);
                }
                for (const paper of args.papers) {
                    const parentRef = parentByGraphId.get(paper.graphId);
                    for (const collectionRef of paper.collectionRefs) {
                        throwIfResearchImportCanceled(args.control);
                        await host.addToCollection({
                            operationId: args.operationId,
                            consistencyGroupId: args.consistencyGroupId,
                            graphId: paper.graphId,
                            itemRef: parentRef,
                            collectionRef,
                            control: args.control,
                        });
                    }
                    const noteRefs = [];
                    const preparedNotes = [];
                    for (const note of paper.notes) {
                        throwIfResearchImportCanceled(args.control);
                        const embeddedImages = await Promise.all((note.content.embeddedImages || []).map(async (image) => ({
                            slot: image.slot,
                            resource: await host.resolveResource({
                                resourceRef: image.resourceRef,
                                control: args.control,
                            }),
                            ...(image.altText ? { altText: image.altText } : {}),
                            ...(image.preserveSourceBytes
                                ? { preserveSourceBytes: true }
                                : {}),
                        })));
                        preparedNotes.push({ note, embeddedImages });
                    }
                    const createdNotes = preparedNotes.length
                        ? await host.createNotes({
                            operationId: args.operationId,
                            consistencyGroupId: args.consistencyGroupId,
                            graphId: paper.graphId,
                            parentRef,
                            notes: preparedNotes,
                            control: args.control,
                        })
                        : [];
                    for (const { noteId, value: createdNote } of createdNotes) {
                        const ref = createdRef(createdNote);
                        validatePortableRef(ref, "created.noteRef", args.libraryId);
                        created.push(ref);
                        for (const ownedRef of createdOwnedRefs(createdNote)) {
                            validatePortableRef(ownedRef, "created.noteOwnedRef", args.libraryId);
                            created.push(ownedRef);
                        }
                        noteRefs.push({ noteId, ref });
                    }
                    const expectedNotes = new Set(paper.notes.map((note) => note.noteId));
                    for (const note of noteRefs) {
                        if (!expectedNotes.delete(note.noteId))
                            throw new Error("Research import returned an unexpected note identity");
                    }
                    if (expectedNotes.size)
                        throw new Error("Research import did not return every note");
                    noteRefsByGraphId.set(paper.graphId, noteRefs);
                    const attachmentRefs = [];
                    for (const attachment of paper.attachments) {
                        throwIfResearchImportCanceled(args.control);
                        const materializedSource = attachment.source.kind === "stored_file"
                            ? {
                                kind: "stored_file",
                                main: {
                                    ...(await host.resolveResource({
                                        resourceRef: attachment.source.main.resourceRef,
                                        control: args.control,
                                    })),
                                    ...(attachment.source.main.targetFilename
                                        ? {
                                            targetFilename: attachment.source.main.targetFilename,
                                        }
                                        : {}),
                                },
                                companions: await Promise.all((attachment.source.companions || []).map(async (companion) => ({
                                    ...(await host.resolveResource({
                                        resourceRef: companion.resourceRef,
                                        control: args.control,
                                    })),
                                    targetRelativePath: companion.targetRelativePath,
                                }))),
                            }
                            : {
                                kind: attachment.source.kind,
                                url: attachment.source.url,
                            };
                        const ref = createdRef(await host.createAttachment({
                            operationId: args.operationId,
                            consistencyGroupId: args.consistencyGroupId,
                            graphId: paper.graphId,
                            parentRef,
                            attachment,
                            materializedSource,
                            control: args.control,
                        }));
                        validatePortableRef(ref, "created.attachmentRef", args.libraryId);
                        created.push(ref);
                        attachmentRefs.push({ attachmentId: attachment.attachmentId, ref });
                    }
                    attachmentRefsByGraphId.set(paper.graphId, attachmentRefs);
                }
                for (const paper of args.papers) {
                    const sourceRef = parentByGraphId.get(paper.graphId);
                    const targets = [
                        ...paper.relatedGraphIds.map((graphId) => parentByGraphId.get(graphId) ||
                            args.resolvedTargets.get(graphId)),
                        ...paper.relatedExistingRefs,
                    ];
                    for (const targetRef of targets) {
                        throwIfResearchImportCanceled(args.control);
                        await host.addRelated({
                            operationId: args.operationId,
                            consistencyGroupId: args.consistencyGroupId,
                            sourceGraphId: paper.graphId,
                            sourceRef,
                            targetRef,
                            control: args.control,
                        });
                    }
                }
                const changes = [];
                const revisionByIdentity = new Map();
                for (const itemRef of created) {
                    const revision = await host.readRevision({
                        itemRef,
                        control: args.control,
                    });
                    revisionByIdentity.set(`${itemRef.libraryId}:${itemRef.key}`, revision);
                    changes.push({
                        entity: { kind: "item", ref: itemRef },
                        effect: "created",
                        before: null,
                        after: { revision, state: "active" },
                    });
                }
                const papers = [];
                for (const paper of args.papers) {
                    const itemRef = parentByGraphId.get(paper.graphId);
                    const revision = revisionByIdentity.get(`${itemRef.libraryId}:${itemRef.key}`);
                    papers.push({
                        graphId: paper.graphId,
                        itemRef,
                        revision,
                        noteRefs: noteRefsByGraphId.get(paper.graphId) || [],
                        attachmentRefs: attachmentRefsByGraphId.get(paper.graphId) || [],
                    });
                }
                return { papers, changes };
            }
            catch (error) {
                const nestedAttempt = error instanceof MutationAuthorityExecutionError ? error : null;
                const nestedAffected = (nestedAttempt?.affectedRefs || [])
                    .filter((entry) => entry.kind === "item")
                    .map((entry) => entry.ref);
                residual.push(...(nestedAttempt?.residualRefs || [])
                    .filter((entry) => entry.kind === "item")
                    .map((entry) => entry.ref));
                for (const itemRef of [...created].reverse()) {
                    try {
                        await host.removeItem({
                            operationId: args.operationId,
                            consistencyGroupId: args.consistencyGroupId,
                            itemRef,
                            control: args.control,
                        });
                    }
                    catch {
                        residual.push(itemRef);
                    }
                }
                const uniqueAffected = new Map([...created, ...nestedAffected].map((ref) => [
                    `${ref.libraryId}:${ref.key}`,
                    ref,
                ]));
                const uniqueResidual = new Map(residual.map((ref) => [`${ref.libraryId}:${ref.key}`, ref]));
                const status = uniqueResidual.size ? "repair_required" : "failed";
                throw new MutationAuthorityExecutionError(status, "execution_failed", "compensation", residual.length ? "reconcile" : "retry_same_operation", {
                    phase: "cleanup",
                    recovery: uniqueResidual.size
                        ? "reconcile"
                        : "retry_same_operation",
                    affectedCount: uniqueAffected.size,
                    residualCount: uniqueResidual.size,
                }, error instanceof Error
                    ? error.message
                    : "Research import group failed", [...uniqueAffected.values()].map((ref) => ({ kind: "item", ref })), [...uniqueResidual.values()].map((ref) => ({ kind: "item", ref })));
            }
        },
    };
}
function importValidationError(code, details, message) {
    throw new ResearchBundleImportValidationError(code, details, message);
}
function requireImportIdentifier(value, field) {
    const normalized = String(value || "").trim();
    if (!normalized ||
        normalized.length > RESEARCH_IMPORT_LIMITS.identifierCharacters) {
        importValidationError("invalid_request", { reason: "invalid_value", field }, `${field} is invalid`);
    }
    return normalized;
}
function validatePortableRef(ref, field, libraryId) {
    if (!ref ||
        !Number.isInteger(ref.libraryId) ||
        ref.libraryId <= 0 ||
        !/^[A-Za-z0-9]{1,128}$/.test(String(ref.key || ""))) {
        importValidationError("invalid_ref", { kind: "item", reason: "invalid_shape", field }, `${field} contains an invalid item reference`);
    }
    if (libraryId !== undefined && ref.libraryId !== libraryId) {
        importValidationError("invalid_ref", { kind: "item", reason: "foreign_scope", field }, `${field} belongs to another library`);
    }
}
function validatePortableCollectionRef(ref, field, libraryId) {
    if (!ref ||
        !Number.isInteger(ref.libraryId) ||
        ref.libraryId <= 0 ||
        !/^[A-Za-z0-9]{1,128}$/.test(String(ref.key || ""))) {
        importValidationError("invalid_ref", { kind: "collection", reason: "invalid_shape", field }, `${field} contains an invalid collection reference`);
    }
    if (libraryId !== undefined && ref.libraryId !== libraryId) {
        importValidationError("invalid_ref", { kind: "collection", reason: "foreign_scope", field }, `${field} belongs to another library`);
    }
}
function resourceRefsFromPaper(paper) {
    const refs = [];
    for (const note of paper.notes) {
        for (const image of note.content.embeddedImages || []) {
            refs.push(image.resourceRef);
        }
    }
    for (const attachment of paper.attachments) {
        if (attachment.source.kind !== "stored_file")
            continue;
        refs.push(attachment.source.main.resourceRef);
        for (const companion of attachment.source.companions || []) {
            refs.push(companion.resourceRef);
        }
    }
    return refs;
}
function validateCreatePaperShape(paper) {
    if (!paper.item ||
        paper.item.schema !== "zotero-agents.portable-regular-item.v1" ||
        !Array.isArray(paper.collectionRefs) ||
        !Array.isArray(paper.notes) ||
        !Array.isArray(paper.attachments) ||
        !Array.isArray(paper.relatedGraphIds) ||
        !Array.isArray(paper.relatedExistingRefs)) {
        importValidationError("invalid_request", { reason: "invalid_schema", field: paper.graphId }, "Create paper graph shape is invalid");
    }
    if (paper.notes.length > RESEARCH_IMPORT_LIMITS.notesPerPaper) {
        importValidationError("resource_limited", {
            resource: "entries",
            limit: RESEARCH_IMPORT_LIMITS.notesPerPaper,
            observed: paper.notes.length,
        }, "Paper note limit exceeded");
    }
    if (paper.attachments.length > RESEARCH_IMPORT_LIMITS.attachmentsPerPaper) {
        importValidationError("resource_limited", {
            resource: "entries",
            limit: RESEARCH_IMPORT_LIMITS.attachmentsPerPaper,
            observed: paper.attachments.length,
        }, "Paper attachment limit exceeded");
    }
    const noteIds = new Set();
    for (const note of paper.notes) {
        const noteId = requireImportIdentifier(note.noteId, "noteId");
        if (noteIds.has(noteId)) {
            importValidationError("invalid_request", { reason: "duplicate_value", field: "noteId" }, "Paper note IDs must be unique");
        }
        noteIds.add(noteId);
        if (note.payloads.length > RESEARCH_IMPORT_LIMITS.payloadsPerNote) {
            importValidationError("resource_limited", {
                resource: "entries",
                limit: RESEARCH_IMPORT_LIMITS.payloadsPerNote,
                observed: note.payloads.length,
            }, "Note payload limit exceeded");
        }
        if ((note.content.embeddedImages || []).length >
            RESEARCH_IMPORT_LIMITS.embeddedImagesPerNote) {
            importValidationError("resource_limited", {
                resource: "entries",
                limit: RESEARCH_IMPORT_LIMITS.embeddedImagesPerNote,
                observed: (note.content.embeddedImages || []).length,
            }, "Note embedded image limit exceeded");
        }
    }
    const attachmentIds = new Set();
    for (const attachment of paper.attachments) {
        const attachmentId = requireImportIdentifier(attachment.attachmentId, "attachmentId");
        if (attachmentIds.has(attachmentId)) {
            importValidationError("invalid_request", { reason: "duplicate_value", field: "attachmentId" }, "Paper attachment IDs must be unique");
        }
        attachmentIds.add(attachmentId);
    }
}
function validateExistingPaperShape(paper) {
    const extraKeys = Object.keys(paper).filter((key) => key !== "graphId" && key !== "target");
    if (extraKeys.length) {
        importValidationError("invalid_request", { reason: "invalid_combination", field: extraKeys[0] }, "Existing targets are reuse-only");
    }
    requireImportIdentifier(paper.target.expectedRevision, "expectedRevision");
}
function computeStronglyConnectedGroups(papers, paperById) {
    const createIds = new Set(papers.map((paper) => paper.graphId));
    const indexById = new Map();
    const lowById = new Map();
    const stack = [];
    const onStack = new Set();
    const groups = [];
    let nextIndex = 0;
    const visit = (graphId) => {
        indexById.set(graphId, nextIndex);
        lowById.set(graphId, nextIndex);
        nextIndex += 1;
        stack.push(graphId);
        onStack.add(graphId);
        const paper = paperById.get(graphId);
        for (const relatedId of paper.relatedGraphIds) {
            if (!createIds.has(relatedId))
                continue;
            if (!indexById.has(relatedId)) {
                visit(relatedId);
                lowById.set(graphId, Math.min(lowById.get(graphId), lowById.get(relatedId)));
            }
            else if (onStack.has(relatedId)) {
                lowById.set(graphId, Math.min(lowById.get(graphId), indexById.get(relatedId)));
            }
        }
        if (lowById.get(graphId) !== indexById.get(graphId))
            return;
        const group = [];
        while (stack.length) {
            const member = stack.pop();
            onStack.delete(member);
            group.push(member);
            if (member === graphId)
                break;
        }
        groups.push(group);
    };
    for (const paper of papers) {
        if (!indexById.has(paper.graphId))
            visit(paper.graphId);
    }
    return groups;
}
function summarizeImportResult(request, libraryId, papers, receipts, attempts) {
    const count = (outcome) => papers.filter((paper) => paper.outcome === outcome).length;
    const counts = {
        requested: papers.length,
        reused: count("reused"),
        committed: count("committed"),
        failed: count("failed"),
        rolledBack: count("rolled_back"),
        repairRequired: count("repair_required"),
        notStarted: count("not_started"),
    };
    const hasSuccess = counts.reused + counts.committed > 0;
    const hasCanceled = papers.some((paper) => paper.outcome === "not_started" && paper.reason === "canceled");
    const outcome = counts.repairRequired
        ? "repair_required"
        : hasCanceled
            ? "canceled"
            : counts.reused + counts.committed === counts.requested
                ? "complete"
                : hasSuccess
                    ? "partial"
                    : "failed";
    return {
        schema: "zotero-agents.research-import.v1",
        operationId: request.operationId,
        libraryId,
        outcome,
        papers,
        receipts,
        attempts,
        counts,
    };
}
export function createResearchBundleImporter(dependencies) {
    const ownerId = requireImportIdentifier(dependencies.ownerId, "ownerId");
    return async (request, control = {}) => {
        const operationId = requireImportIdentifier(request?.operationId, "operationId");
        const papers = Array.isArray(request?.papers) ? request.papers : [];
        if (!papers.length || papers.length > RESEARCH_IMPORT_LIMITS.papers) {
            importValidationError(papers.length ? "resource_limited" : "invalid_request", papers.length
                ? {
                    resource: "items",
                    limit: RESEARCH_IMPORT_LIMITS.papers,
                    observed: papers.length,
                }
                : { reason: "missing_field", field: "papers" }, "Research import paper count is invalid");
        }
        const metadataBytes = new TextEncoder().encode(JSON.stringify(papers)).length;
        if (metadataBytes > RESEARCH_IMPORT_LIMITS.metadataBytes) {
            importValidationError("resource_limited", {
                resource: "bytes",
                limit: RESEARCH_IMPORT_LIMITS.metadataBytes,
                observed: metadataBytes,
            }, "Research import metadata limit exceeded");
        }
        const libraryId = Number(await dependencies.effects.resolveLibraryId(request.libraryId));
        if (!Number.isInteger(libraryId) || libraryId <= 0) {
            importValidationError("invalid_request", { reason: "invalid_value", field: "libraryId" }, "Target library is invalid");
        }
        const paperById = new Map();
        let relationEdges = 0;
        for (const paper of papers) {
            const graphId = requireImportIdentifier(paper?.graphId, "graphId");
            if (paperById.has(graphId)) {
                importValidationError("invalid_request", { reason: "duplicate_value", field: "graphId" }, "Research import graph IDs must be unique");
            }
            if (paper?.target?.kind === "create") {
                const createPaper = paper;
                validateCreatePaperShape(createPaper);
                relationEdges +=
                    createPaper.relatedGraphIds.length +
                        createPaper.relatedExistingRefs.length;
            }
            else if (paper?.target?.kind === "existing") {
                const existingPaper = paper;
                validateExistingPaperShape(existingPaper);
                validatePortableRef(existingPaper.target.itemRef, "target.itemRef", libraryId);
            }
            else {
                importValidationError("invalid_request", { reason: "missing_field", field: "target" }, "Every paper requires an explicit create or existing target");
            }
            paperById.set(graphId, paper);
        }
        if (relationEdges > RESEARCH_IMPORT_LIMITS.relationEdges) {
            importValidationError("resource_limited", {
                resource: "entries",
                limit: RESEARCH_IMPORT_LIMITS.relationEdges,
                observed: relationEdges,
            }, "Research import relation edge limit exceeded");
        }
        for (const paper of papers) {
            if (paper.target.kind !== "create")
                continue;
            const createPaper = paper;
            const relatedIds = new Set();
            for (const relatedIdRaw of createPaper.relatedGraphIds) {
                const relatedId = requireImportIdentifier(relatedIdRaw, "relatedGraphIds");
                if (relatedIds.has(relatedId)) {
                    importValidationError("invalid_request", { reason: "duplicate_value", field: "relatedGraphIds" }, "Paper graph relations must be unique");
                }
                relatedIds.add(relatedId);
                if (!paperById.has(relatedId)) {
                    importValidationError("invalid_request", { reason: "invalid_value", field: "relatedGraphIds" }, "Paper graph relation target is unavailable");
                }
            }
            for (const ref of createPaper.relatedExistingRefs) {
                validatePortableRef(ref, "relatedExistingRefs", libraryId);
            }
            for (const ref of createPaper.collectionRefs) {
                validatePortableCollectionRef(ref, "collectionRefs", libraryId);
            }
        }
        const relatedExistingTargets = new Map();
        const collectionTargets = new Map();
        for (const paper of papers) {
            if (paper.target.kind !== "create")
                continue;
            const createPaper = paper;
            for (const ref of createPaper.relatedExistingRefs) {
                relatedExistingTargets.set(`${ref.libraryId}:${ref.key}`, ref);
            }
            for (const ref of createPaper.collectionRefs) {
                collectionTargets.set(`${ref.libraryId}:${ref.key}`, ref);
            }
        }
        for (const itemRef of relatedExistingTargets.values()) {
            await dependencies.effects.validateExistingTarget({
                itemRef,
                libraryId,
                control,
            });
        }
        for (const collectionRef of collectionTargets.values()) {
            if (!dependencies.effects.validateCollectionTarget) {
                importValidationError("invalid_ref", { kind: "collection", reason: "not_found" }, "Research import collection validation is unavailable");
            }
            await dependencies.effects.validateCollectionTarget({
                collectionRef,
                libraryId,
                control,
            });
        }
        const resolvedTargets = new Map();
        const resultById = new Map();
        const claimedExisting = new Set();
        for (const paper of papers) {
            if (paper.target.kind !== "existing")
                continue;
            const identity = `${paper.target.itemRef.libraryId}:${paper.target.itemRef.key}`;
            if (claimedExisting.has(identity)) {
                importValidationError("invalid_request", { reason: "duplicate_value", field: "target.itemRef" }, "An existing target can be claimed only once");
            }
            claimedExisting.add(identity);
            const existing = await dependencies.effects.validateExistingTarget({
                itemRef: paper.target.itemRef,
                expectedRevision: paper.target.expectedRevision,
                libraryId,
                control,
            });
            validatePortableRef(existing.itemRef, "existing.itemRef", libraryId);
            if (existing.revision !== paper.target.expectedRevision) {
                importValidationError("conflict", { reason: "revision_mismatch", field: paper.graphId }, "Existing target revision changed");
            }
            resolvedTargets.set(paper.graphId, existing.itemRef);
            resultById.set(paper.graphId, {
                graphId: paper.graphId,
                outcome: "reused",
                itemRef: existing.itemRef,
                revision: existing.revision,
            });
        }
        const resourceRefs = new Map();
        for (const paper of papers) {
            if (paper.target.kind !== "create")
                continue;
            for (const ref of resourceRefsFromPaper(paper)) {
                if (ref?.kind !== "workflow_resource" || !String(ref.id || "").trim()) {
                    importValidationError("invalid_ref", { kind: "resource", reason: "invalid_shape" }, "Research import resource reference is invalid");
                }
                resourceRefs.set(ref.id, ref);
            }
        }
        let resourceBytes = 0;
        for (const resourceRef of resourceRefs.values()) {
            const resource = await dependencies.effects.validateResource({
                resourceRef,
                control,
            });
            resourceBytes += Math.max(0, Number(resource.sizeBytes) || 0);
            if (resourceBytes > RESEARCH_IMPORT_LIMITS.resourceBytes) {
                importValidationError("resource_limited", {
                    resource: "bytes",
                    limit: RESEARCH_IMPORT_LIMITS.resourceBytes,
                    observed: resourceBytes,
                }, "Research import resource byte limit exceeded");
            }
        }
        const createPapers = papers.filter((paper) => paper.target.kind === "create");
        const groups = computeStronglyConnectedGroups(createPapers, paperById);
        const requestIndex = new Map(papers.map((paper, index) => [paper.graphId, index]));
        groups.forEach((group) => group.sort((left, right) => requestIndex.get(left) - requestIndex.get(right)));
        groups.sort((left, right) => requestIndex.get(left[0]) - requestIndex.get(right[0]));
        const groupByGraphId = new Map();
        groups.forEach((group, groupIndex) => group.forEach((graphId) => groupByGraphId.set(graphId, groupIndex)));
        const groupDependencies = groups.map((group, groupIndex) => {
            const dependencies = new Set();
            for (const graphId of group) {
                const paper = paperById.get(graphId);
                for (const relatedId of paper.relatedGraphIds) {
                    const dependency = groupByGraphId.get(relatedId);
                    if (dependency !== undefined && dependency !== groupIndex) {
                        dependencies.add(dependency);
                    }
                }
            }
            return dependencies;
        });
        const groupState = groups.map(() => "pending");
        const receipts = [];
        const attempts = [];
        let pending = groups.length;
        while (pending > 0) {
            let progressed = false;
            for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
                if (groupState[groupIndex] !== "pending")
                    continue;
                const dependencyStates = [...groupDependencies[groupIndex]].map((index) => groupState[index]);
                if (dependencyStates.includes("pending"))
                    continue;
                const graphIds = groups[groupIndex];
                const consistencyGroupId = `group-${String(Math.min(...graphIds.map((id) => requestIndex.get(id))) + 1).padStart(4, "0")}`;
                if (dependencyStates.includes("failed")) {
                    const blockingGraphIds = [...groupDependencies[groupIndex]]
                        .filter((index) => groupState[index] === "failed")
                        .flatMap((index) => groups[index]);
                    for (const graphId of graphIds) {
                        resultById.set(graphId, {
                            graphId,
                            outcome: "not_started",
                            reason: "dependency_failed",
                            blockingGraphIds,
                        });
                    }
                    groupState[groupIndex] = "failed";
                    pending -= 1;
                    progressed = true;
                    continue;
                }
                if (control.signal?.aborted) {
                    for (const graphId of graphIds) {
                        resultById.set(graphId, {
                            graphId,
                            outcome: "not_started",
                            reason: "canceled",
                            blockingGraphIds: [],
                        });
                    }
                    groupState[groupIndex] = "failed";
                    pending -= 1;
                    progressed = true;
                    continue;
                }
                const groupPapers = graphIds.map((graphId) => paperById.get(graphId));
                const execution = await executeReservedMutation({
                    scope: { ownerId: `${ownerId}:${consistencyGroupId}` },
                    operationId,
                    operation: "researchBundles.importPapers",
                    semanticInput: {
                        libraryId,
                        consistencyGroupId,
                        papers: groupPapers,
                    },
                    control,
                    async execute() {
                        const committed = await dependencies.effects.commitGroup({
                            operationId,
                            consistencyGroupId,
                            libraryId,
                            papers: groupPapers,
                            resolvedTargets,
                            control,
                        });
                        if (committed.papers.length !== groupPapers.length ||
                            new Set(committed.papers.map((paper) => paper.graphId)).size !==
                                groupPapers.length) {
                            throw new Error("Research import group result is incomplete");
                        }
                        return {
                            outcome: "committed",
                            changes: committed.changes,
                            result: { papers: committed.papers },
                        };
                    },
                });
                if (execution.outcome === "committed" ||
                    execution.outcome === "unchanged") {
                    receipts.push(execution.receipt);
                    const committed = execution.result
                        .papers;
                    for (const paper of committed) {
                        resolvedTargets.set(paper.graphId, paper.itemRef);
                        resultById.set(paper.graphId, {
                            graphId: paper.graphId,
                            outcome: "committed",
                            consistencyGroupId,
                            itemRef: paper.itemRef,
                            revision: paper.revision,
                            noteRefs: paper.noteRefs,
                            attachmentRefs: paper.attachmentRefs,
                            receiptId: execution.receipt.receiptId,
                        });
                    }
                    groupState[groupIndex] = "committed";
                }
                else if ("attempt" in execution) {
                    attempts.push(execution.attempt);
                    const rowOutcome = execution.outcome === "repair_required" ||
                        execution.outcome === "unknown"
                        ? "repair_required"
                        : execution.attempt.affectedRefs.length > 0 &&
                            execution.attempt.residualRefs.length === 0
                            ? "rolled_back"
                            : "failed";
                    for (const graphId of graphIds) {
                        resultById.set(graphId, {
                            graphId,
                            outcome: rowOutcome,
                            consistencyGroupId,
                            attemptId: execution.attempt.attemptId,
                        });
                    }
                    groupState[groupIndex] = "failed";
                }
                else {
                    throw new Error("Research import authority returned an invalid result");
                }
                pending -= 1;
                progressed = true;
            }
            if (!progressed) {
                throw new Error("Research import dependency scheduler stalled");
            }
        }
        return summarizeImportResult({ ...request, operationId }, libraryId, papers.map((paper) => resultById.get(paper.graphId)), receipts, attempts);
    };
}
export const researchBundleImportLimits = RESEARCH_IMPORT_LIMITS;
function validateCanonicalResearchSnapshot(requestedRef, snapshot) {
    validatePortableRef(snapshot.source.ref, "source.ref", requestedRef.libraryId);
    if (snapshot.source.ref.key !== requestedRef.key ||
        !String(snapshot.source.revision || "").trim()) {
        importValidationError("invalid_ref", { kind: "item", reason: "identity_mismatch" }, "Research materialization source identity does not match the request");
    }
    if (snapshot.item?.schema !== "zotero-agents.portable-regular-item.v1" ||
        !String(snapshot.item.itemType || "").trim() ||
        !snapshot.item.fields ||
        !Array.isArray(snapshot.item.creators) ||
        !Array.isArray(snapshot.item.tags)) {
        importValidationError("invalid_request", { reason: "invalid_schema", field: "item" }, "Research materialization portable item is invalid");
    }
    if (snapshot.notes.length > RESEARCH_IMPORT_LIMITS.notesPerPaper ||
        snapshot.attachments.length > RESEARCH_IMPORT_LIMITS.attachmentsPerPaper) {
        importValidationError("resource_limited", {
            resource: "entries",
            limit: Math.max(RESEARCH_IMPORT_LIMITS.notesPerPaper, RESEARCH_IMPORT_LIMITS.attachmentsPerPaper),
            observed: Math.max(snapshot.notes.length, snapshot.attachments.length),
        }, "Research materialization child count exceeds the fixed limit");
    }
    for (const ref of [...snapshot.collectionRefs, ...snapshot.relatedRefs]) {
        validatePortableRef(ref, "graph.ref", requestedRef.libraryId);
    }
    const childRefs = new Set();
    for (const note of snapshot.notes) {
        validatePortableRef(note.source.ref, "note.ref", requestedRef.libraryId);
        const identity = `${note.source.ref.libraryId}:${note.source.ref.key}`;
        if (childRefs.has(identity) || !String(note.source.revision || "").trim()) {
            importValidationError("invalid_ref", { kind: "item", reason: "duplicate_or_unversioned_child" }, "Research materialization note graph is invalid");
        }
        childRefs.add(identity);
    }
    for (const attachment of snapshot.attachments) {
        validatePortableRef(attachment.ref, "attachment.ref", requestedRef.libraryId);
        const parentRef = attachment.parentRef;
        if (!parentRef ||
            parentRef.libraryId !== requestedRef.libraryId ||
            parentRef.key !== requestedRef.key) {
            importValidationError("invalid_ref", { kind: "item", reason: "parent_mismatch" }, "Research materialization attachment parent is invalid");
        }
        const identity = `${attachment.ref.libraryId}:${attachment.ref.key}`;
        if (childRefs.has(identity)) {
            importValidationError("invalid_ref", { kind: "item", reason: "duplicate_child" }, "Research materialization child refs must be unique");
        }
        childRefs.add(identity);
    }
    for (const annotation of snapshot.annotations) {
        validatePortableRef(annotation.ref, "annotation.ref", requestedRef.libraryId);
        if (annotation.itemRef.libraryId !== requestedRef.libraryId ||
            annotation.itemRef.key !== requestedRef.key) {
            importValidationError("invalid_ref", { kind: "item", reason: "parent_mismatch" }, "Research materialization annotation parent is invalid");
        }
    }
}
export function createCanonicalResearchBundleMaterializer(dependencies) {
    return async (request, control = {}) => {
        if (request?.missingFilePolicy !== "require_complete" &&
            request?.missingFilePolicy !== "record_missing") {
            importValidationError("invalid_request", { reason: "missing_field", field: "missingFilePolicy" }, "Research materialization requires an explicit completeness policy");
        }
        const refs = [];
        const seen = new Set();
        for (const ref of Array.isArray(request?.paperRefs)
            ? request.paperRefs
            : []) {
            validatePortableRef(ref, "paperRefs");
            const identity = `${ref.libraryId}:${ref.key}`;
            if (seen.has(identity))
                continue;
            seen.add(identity);
            refs.push({ libraryId: ref.libraryId, key: ref.key });
        }
        if (!refs.length || refs.length > RESEARCH_IMPORT_LIMITS.papers) {
            importValidationError(refs.length ? "resource_limited" : "invalid_request", refs.length
                ? {
                    resource: "items",
                    limit: RESEARCH_IMPORT_LIMITS.papers,
                    observed: refs.length,
                }
                : { reason: "missing_field", field: "paperRefs" }, "Research materialization paper count is invalid");
        }
        const papers = [];
        const issues = [];
        try {
            for (const ref of refs) {
                if (control.signal?.aborted) {
                    throw new ResearchBundleImportValidationError("invalid_request", { reason: "canceled" }, "Research materialization was canceled");
                }
                const snapshot = await dependencies.readPaper(ref, control);
                if (!snapshot) {
                    importValidationError("invalid_ref", { kind: "item", reason: "not_found" }, "Research paper is unavailable");
                }
                validateCanonicalResearchSnapshot(ref, snapshot);
                const attachments = [];
                const paperIssues = [];
                for (const attachment of snapshot.attachments) {
                    if (attachment.file.state === "not_applicable") {
                        attachments.push({
                            sourceRef: attachment.ref,
                            metadata: attachment,
                            file: { state: "not_applicable" },
                        });
                        continue;
                    }
                    if (attachment.file.state === "missing") {
                        const issue = {
                            code: "attachment_file_missing",
                            attachmentRef: attachment.ref,
                        };
                        if (request.missingFilePolicy === "require_complete") {
                            throw new Error("Required research attachment is missing");
                        }
                        issues.push(issue);
                        paperIssues.push(issue);
                        attachments.push({
                            sourceRef: attachment.ref,
                            metadata: attachment,
                            file: { state: "missing", issue },
                        });
                        continue;
                    }
                    try {
                        const staged = await dependencies.resources.stageFile({
                            slotId: `paper:${ref.libraryId}:${ref.key}:attachment:${attachment.ref.key}`,
                            sourcePath: attachment.file.path,
                            displayName: attachment.filename || `${attachment.ref.key}.bin`,
                            contentType: attachment.contentType || undefined,
                        });
                        attachments.push({
                            sourceRef: attachment.ref,
                            metadata: attachment,
                            file: {
                                state: "available",
                                resourceRef: staged.ref,
                                filename: staged.displayName,
                                contentType: attachment.contentType,
                                sizeBytes: staged.sizeBytes,
                                sha256: staged.sha256.replace(/^sha256:/, ""),
                            },
                        });
                    }
                    catch (error) {
                        if (request.missingFilePolicy === "require_complete")
                            throw error;
                        const nativeCode = String(error?.code || "").toUpperCase();
                        const issue = {
                            code: nativeCode === "EACCES" || nativeCode === "EPERM"
                                ? "attachment_file_permission_denied"
                                : "attachment_file_unreadable",
                            attachmentRef: attachment.ref,
                        };
                        issues.push(issue);
                        paperIssues.push(issue);
                        attachments.push({
                            sourceRef: attachment.ref,
                            metadata: attachment,
                            file: { state: "missing", issue },
                        });
                    }
                }
                papers.push({
                    source: snapshot.source,
                    item: snapshot.item,
                    collectionRefs: snapshot.collectionRefs,
                    relatedRefs: snapshot.relatedRefs,
                    notes: snapshot.notes,
                    attachments,
                    annotations: snapshot.annotations,
                    issues: paperIssues,
                });
            }
        }
        catch (error) {
            await dependencies.resources.cleanup();
            throw error;
        }
        return {
            papers,
            completeness: issues.length ? "incomplete" : "complete",
            issues,
        };
    };
}
