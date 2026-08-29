import { getBaseName, joinPath, normalizeNativeLocalPath } from "../utils/path";
import { sha256PrefixedHex } from "../utils/sha256";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  listRuntimeChildren,
  moveRuntimePath,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "./runtimeFileTransfer";
import { registerHostBridgeExportFile } from "./hostBridgeFileRegistry";
import {
  createWorkflowArchiveApi,
  type WorkflowArchiveEntry,
} from "../workflows/archive";
import {
  SYNTHESIS_PAPER_ARTIFACT_TYPES,
  SynthesisClient,
  SynthesisDeliveryContext,
  SynthesisPaperArtifactType,
} from "../../packages/synthesis-contracts/src/index";

const MAX_PAPER_SELECTORS = 100;
const MAX_TOPIC_SELECTORS = 20;
const MAX_RESOLVED_PAPERS = 500;
const MAX_BUNDLE_FILES = 5000;
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024 * 1024;

export const RESEARCH_BUNDLE_ARTIFACT_TYPES = SYNTHESIS_PAPER_ARTIFACT_TYPES;

export type ResearchBundleArtifactType = SynthesisPaperArtifactType;

export type DirectResearchBundleAttachment = {
  path: string;
  filename: string;
  contentType: string;
};

export type DirectResearchBundlePaper = {
  paperRef: string;
  libraryId: number;
  itemKey: string;
  title: string;
  metadata: Record<string, unknown>;
  attachments: DirectResearchBundleAttachment[];
};

export type DirectResearchBundleTopicSource = {
  paperRef: string;
  title?: string;
};

export type DirectResearchBundleTopic = {
  topicId: string;
  title: string;
  report: string;
  sourcePapers: DirectResearchBundleTopicSource[];
  diagnostics?: string[];
};

export type DirectResearchBundleHost = {
  resolveItems: (itemRefs: unknown[]) => Promise<DirectResearchBundlePaper[]>;
  resolveTopics?: (topicIds: string[]) => Promise<DirectResearchBundleTopic[]>;
};

export type ResearchBundleEntry = {
  path: string;
  contentType: string;
  text?: string;
  sourcePath?: string;
};

export type ResearchBundleWarning = {
  code: string;
  paper_ref?: string;
  topic_id?: string;
  artifact_type?: string;
  path?: string;
  reason?: string;
};

export type ResearchBundlePaperRef = Pick<
  DirectResearchBundlePaper,
  "paperRef" | "libraryId" | "itemKey"
>;

export type ResearchBundleMaterializePapersArgs = {
  papers: Array<{ paperRef: string }>;
  sourcePaperRefs?: string[];
};

export type ResearchBundleMaterialization = {
  entries: ResearchBundleEntry[];
  warnings: ResearchBundleWarning[];
  papers: Record<string, unknown>[];
};

export type ResearchBundlePaperResolver = (
  ref: ResearchBundlePaperRef,
) => Promise<DirectResearchBundlePaper | null | undefined>;

export type ResearchBundleArtifactReader = (args: {
  paperRefs: string[];
  artifactTypes: ResearchBundleArtifactType[];
}) => Promise<unknown>;

export type ResearchBundleMaterializer = (
  args: ResearchBundleMaterializePapersArgs,
) => Promise<ResearchBundleMaterialization>;

export type ResearchArtifactPresentation = {
  artifactType: string;
  filename: string;
  contentType: string;
  text: string;
  diagnostics: string[];
  removedTrailingSectionHeading?: string;
};

export class DirectResearchBundleError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DirectResearchBundleError";
    this.code = code;
    this.details = details;
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = cleanString(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function encodePathSegment(value: unknown, fallback: string) {
  const text = cleanString(value);
  if (!text) return fallback;
  return encodeURIComponent(text);
}

function normalizeEntryPath(value: unknown) {
  const raw = cleanString(value)
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/");
  if (!raw || raw.startsWith("/") || /^[A-Za-z]:\//.test(raw)) {
    throw new DirectResearchBundleError(
      "research_bundle_path_invalid",
      "Research bundle entry path is invalid",
      { path: raw },
    );
  }
  const parts = raw.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new DirectResearchBundleError(
      "research_bundle_path_invalid",
      "Research bundle entry path is invalid",
      { path: raw },
    );
  }
  return parts.join("/");
}

function parsePaperRef(value: unknown) {
  const text = cleanString(value);
  const match = text.match(/^(\d+):(.+)$/);
  if (!match) return null;
  const libraryId = Number(match[1]);
  const itemKey = cleanString(match[2]);
  if (!Number.isInteger(libraryId) || libraryId <= 0 || !itemKey) return null;
  return { paperRef: `${libraryId}:${itemKey}`, libraryId, itemKey };
}

export function paperBundleDirectory(paperRef: unknown) {
  const parsed = parsePaperRef(paperRef);
  if (!parsed) {
    throw new DirectResearchBundleError(
      "invalid_research_bundle_selector",
      "Canonical paper ref must use libraryId:itemKey",
      { paperRef: cleanString(paperRef) },
    );
  }
  return `papers/${parsed.libraryId}/${encodePathSegment(parsed.itemKey, "item")}`;
}

function dirname(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index < 0 ? "" : normalized.slice(0, index);
}

function normalizeLocalPath(value: string) {
  const raw = cleanString(value).replace(/\\/g, "/");
  const drive = raw.match(/^([A-Za-z]:)/)?.[1] || "";
  const absolute = raw.startsWith("/");
  const parts: string[] = [];
  for (const part of raw.replace(/^[A-Za-z]:/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `${drive}${absolute ? "/" : drive ? "/" : ""}${parts.join("/")}`;
}

function resolveMarkdownImagePath(sourcePath: string, destination: string) {
  const raw = cleanString(destination).replace(/^<|>$/g, "");
  if (!raw || /^(?:https?:|data:)/i.test(raw)) return null;
  const match = raw.match(/^([^?#]*)([?#].*)?$/);
  const suffix = match?.[2] || "";
  let path = match?.[1] || "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the original path for the existence probe.
  }
  if (/^file:/i.test(path)) {
    try {
      const url = new URL(path);
      path = decodeURIComponent(url.pathname || "");
      if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
    } catch {
      return null;
    }
  } else if (!/^(?:[A-Za-z]:[\\/]|\/)/.test(path)) {
    path = joinPath(dirname(sourcePath), path);
  }
  const sourceRoot = normalizeLocalPath(dirname(sourcePath));
  const candidate = normalizeLocalPath(path);
  const insensitive = /^[A-Za-z]:\//.test(sourceRoot);
  const comparedRoot = insensitive ? sourceRoot.toLowerCase() : sourceRoot;
  const comparedCandidate = insensitive ? candidate.toLowerCase() : candidate;
  if (
    !comparedRoot ||
    !comparedCandidate.startsWith(`${comparedRoot}/`) ||
    comparedCandidate === comparedRoot
  ) {
    return { outside: true, path: candidate, suffix, relativePath: "" };
  }
  return {
    outside: false,
    path: candidate,
    suffix,
    relativePath: candidate.slice(sourceRoot.length + 1),
  };
}

async function rewriteMarkdownImages(args: {
  markdown: string;
  sourcePath: string;
  paperRef: string;
}) {
  const assets: ResearchBundleEntry[] = [];
  const warnings: ResearchBundleWarning[] = [];
  const paperDir = paperBundleDirectory(args.paperRef);
  const matches = [...args.markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  let markdown = args.markdown;
  const copied = new Map<string, string>();
  for (const match of matches.reverse()) {
    const resolved = resolveMarkdownImagePath(args.sourcePath, match[2]);
    if (!resolved) continue;
    if (resolved.outside) {
      warnings.push({
        code: "markdown_image_outside_source_tree",
        paper_ref: args.paperRef,
        path: resolved.path,
      });
      continue;
    }
    const nativePath = await probeNativeLocalPath(resolved.path);
    if (!nativePath) {
      warnings.push({
        code: "markdown_image_missing",
        paper_ref: args.paperRef,
        path: resolved.path,
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

async function probeNativeLocalPath(path: string | undefined) {
  if (!path) return undefined;
  try {
    const nativePath = normalizeNativeLocalPath(path);
    return (await runtimePathExists(nativePath)) ? nativePath : undefined;
  } catch {
    return undefined;
  }
}

function demoteMarkdownHeadings(markdown: string, levels: number) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(\s*)(#{1,6})(\s+.*)$/);
      if (!match) return line;
      return `${match[1]}${"#".repeat(Math.min(6, match[2].length + levels))}${match[3]}`;
    })
    .join("\n");
}

function filterDigestMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const kept: string[] = [];
  let sections = 0;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      sections += 1;
      if (sections > 4) break;
    }
    kept.push(line);
  }
  return `${demoteMarkdownHeadings(kept.join("\n").trim(), 2).trim()}\n`;
}

function removeCitationWrapperAndTrailingSection(report: string) {
  const lines = report.split(/\r?\n/);
  const firstSection = lines.findIndex((line) => /^###\s+/.test(line));
  let body = firstSection >= 0 ? lines.slice(firstSection) : lines;
  const headings = body
    .map((line, index) => (/^###\s+/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  let removedTrailingSectionHeading = "";
  if (headings.length > 1) {
    const removeFrom = headings[headings.length - 1];
    removedTrailingSectionHeading =
      body[removeFrom]?.replace(/^#+\s*/, "").trim() || "";
    body = body.slice(0, removeFrom);
  }
  return {
    markdown: `${demoteMarkdownHeadings(body.join("\n").trim(), 1).trim()}\n`,
    removedTrailingSectionHeading,
  };
}

function compactAuthors(value: unknown) {
  const authors = Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : cleanString(value)
      ? [cleanString(value)]
      : [];
  return authors.length > 2
    ? `${authors.slice(0, 2).join("; ")}; et al.`
    : authors.join("; ");
}

function compactReferenceRows(payload: unknown) {
  const refs =
    isRecord(payload) && Array.isArray(payload.references)
      ? payload.references
      : [];
  return refs.filter(isRecord).map((reference) => ({
    id: cleanString(reference.id || reference.ref_id || reference.key),
    year: cleanString(reference.year),
    authors: compactAuthors(reference.author || reference.authors),
    title: cleanString(reference.title),
  }));
}

function artifactMarkdown(artifact: Record<string, unknown>) {
  if (cleanString(artifact.status || "available") !== "available") return "";
  if (typeof artifact.markdown === "string") return artifact.markdown;
  const payload = artifact.payload;
  if (isRecord(payload) && typeof payload.content === "string") {
    return payload.content;
  }
  return "";
}

function citationReportMarkdown(artifact: Record<string, unknown>) {
  if (cleanString(artifact.status || "available") !== "available") return "";
  const payload = artifact.payload;
  if (!isRecord(payload)) return "";
  const citation = payload.citation_analysis;
  if (isRecord(citation) && typeof citation.report_md === "string") {
    return citation.report_md;
  }
  return typeof payload.report_md === "string" ? payload.report_md : "";
}

export function formatResearchBundleArtifact(
  artifact: Record<string, unknown>,
): ResearchArtifactPresentation | null {
  const artifactType = cleanString(
    artifact.artifact_type || artifact.artifactType,
  );
  if (artifactType === "digest") {
    return {
      artifactType,
      filename: "digest.md",
      contentType: "text/markdown",
      text: filterDigestMarkdown(artifactMarkdown(artifact)),
      diagnostics: [],
    };
  }
  if (artifactType === "references") {
    return {
      artifactType,
      filename: "references.json",
      contentType: "application/json",
      text: `${JSON.stringify({ references: compactReferenceRows(artifact.payload) }, null, 2)}\n`,
      diagnostics: [],
    };
  }
  if (artifactType === "citation_analysis") {
    const result = removeCitationWrapperAndTrailingSection(
      citationReportMarkdown(artifact),
    );
    return {
      artifactType,
      filename: "citation-analysis.md",
      contentType: "text/markdown",
      text: result.markdown,
      diagnostics: result.removedTrailingSectionHeading
        ? [
            `removed_trailing_section_heading:${result.removedTrailingSectionHeading}`,
          ]
        : [],
      ...(result.removedTrailingSectionHeading
        ? {
            removedTrailingSectionHeading: result.removedTrailingSectionHeading,
          }
        : {}),
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

export async function materializeResearchBundlePapers(args: {
  papers: DirectResearchBundlePaper[];
  readArtifacts: ResearchBundleArtifactReader;
  includeMetadata?: boolean;
  includeSource?: boolean;
  sourcePaperRefs?: string[];
  artifactTypes?: ResearchBundleArtifactType[];
}) {
  const includeMetadata = args.includeMetadata !== false;
  const includeSource = args.includeSource !== false;
  const requestedTypes = Array.from(
    new Set(
      args.artifactTypes?.length
        ? args.artifactTypes
        : RESEARCH_BUNDLE_ARTIFACT_TYPES,
    ),
  );
  const sourcePaperRefs = args.sourcePaperRefs?.length
    ? new Set(uniqueStrings(args.sourcePaperRefs))
    : null;
  const result = await args.readArtifacts({
    paperRefs: args.papers.map((paper) => paper.paperRef),
    artifactTypes: requestedTypes,
  });
  const artifacts =
    isRecord(result) && Array.isArray(result.artifacts)
      ? result.artifacts.filter(isRecord)
      : [];
  const entries: ResearchBundleEntry[] = [];
  const warnings: ResearchBundleWarning[] = [];
  const paperRecords: Record<string, unknown>[] = [];

  for (const paper of args.papers) {
    const paperDir = paperBundleDirectory(paper.paperRef);
    const record: Record<string, unknown> = {
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
    if (
      includeSource &&
      (!sourcePaperRefs || sourcePaperRefs.has(paper.paperRef))
    ) {
      const markdown = paper.attachments.find((entry) =>
        /(?:markdown|\.md$)/i.test(`${entry.contentType} ${entry.filename}`),
      );
      const pdf = paper.attachments.find((entry) =>
        /(?:application\/pdf|\.pdf$)/i.test(
          `${entry.contentType} ${entry.filename}`,
        ),
      );
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
      } else if (pdfPath) {
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
      } else {
        warnings.push({ code: "source_missing", paper_ref: paper.paperRef });
      }
    }

    const artifactRecords: Record<string, unknown>[] = [];
    for (const artifactType of requestedTypes) {
      const artifact = artifacts.find(
        (entry) =>
          cleanString(entry.paper_ref) === paper.paperRef &&
          cleanString(entry.artifact_type) === artifactType,
      );
      const status = artifact ? cleanString(artifact.status) : "missing";
      const artifactRecord: Record<string, unknown> = {
        artifact_type: artifactType,
        status: status || "missing",
      };
      if (artifact && status === "available") {
        const presentation = formatResearchBundleArtifact(artifact);
        if (presentation) {
          const contentPath = `${paperDir}/${presentation.filename}`;
          entries.push({
            path: contentPath,
            contentType: presentation.contentType,
            text: presentation.text,
          });
          artifactRecord.path = contentPath;
          artifactRecord.diagnostics = presentation.diagnostics;
        }
      } else {
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

export function createResearchBundleMaterializer(dependencies: {
  resolvePaper: ResearchBundlePaperResolver;
  readArtifacts: ResearchBundleArtifactReader;
}): ResearchBundleMaterializer {
  return async (args) => {
    const papers: DirectResearchBundlePaper[] = [];
    const warnings: ResearchBundleWarning[] = [];
    const seen = new Set<string>();

    for (const selected of Array.isArray(args?.papers) ? args.papers : []) {
      const paperRef = cleanString(selected?.paperRef);
      if (!paperRef || seen.has(paperRef)) continue;
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

export function rewriteTopicReportDigestLinks(args: {
  report: string;
  topicId: string;
  sourcePapers: DirectResearchBundleTopicSource[];
  availableDigestRefs: Set<string>;
}) {
  const lines = args.report.split(/\r?\n/);
  let valid = true;
  for (const [index, source] of args.sourcePapers.entries()) {
    const ordinal = index + 1;
    const anchor = `<a id="ref-${ordinal}"></a>`;
    const marker = `{${source.paperRef}}`;
    const lineIndex = lines.findIndex(
      (line) => line.includes(anchor) && line.includes(marker),
    );
    if (lineIndex < 0) {
      valid = false;
      break;
    }
    if (args.availableDigestRefs.has(source.paperRef)) {
      const target = `../../${paperBundleDirectory(source.paperRef)}/digest.md`;
      lines[lineIndex] = lines[lineIndex].replace(
        marker,
        `[${marker}](${target})`,
      );
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
      sources.push(
        `- [${label}](../../${paperBundleDirectory(source.paperRef)}/digest.md)`,
      );
    } else {
      sources.push(`- ${label}`);
    }
  }
  return {
    report: args.report,
    fallbackSources: `${sources.join("\n")}\n`,
    warning: {
      code: "topic_report_navigation_fallback",
      topic_id: args.topicId,
    } as ResearchBundleWarning,
  };
}

function validateSelectorLimit(kind: "papers" | "topics", count: number) {
  const maximum = kind === "papers" ? MAX_PAPER_SELECTORS : MAX_TOPIC_SELECTORS;
  if (count < 1 || count > maximum) {
    throw new DirectResearchBundleError(
      count < 1
        ? "invalid_research_bundle_selector"
        : "research_bundle_limit_exceeded",
      count < 1
        ? `Direct ${kind} bundle requires at least one selector`
        : `Direct ${kind} bundle selector limit exceeded`,
      { kind, count, maximum },
    );
  }
}

export function validateDirectResearchBundleScope(args: {
  kind: "papers" | "topics";
  selectorCount: number;
  resolvedPaperCount: number;
}) {
  validateSelectorLimit(args.kind, args.selectorCount);
  if (args.resolvedPaperCount > MAX_RESOLVED_PAPERS) {
    throw new DirectResearchBundleError(
      "research_bundle_limit_exceeded",
      "Direct research bundle resolved-paper limit exceeded",
      {
        count: args.resolvedPaperCount,
        maximum: MAX_RESOLVED_PAPERS,
      },
    );
  }
}

async function entryIntegrity(entry: ResearchBundleEntry) {
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
    throw new DirectResearchBundleError(
      "research_bundle_materialization_failed",
      "Research bundle entry has no content source",
      { path: entry.path },
    );
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

async function writeEntries(root: string, entries: ResearchBundleEntry[]) {
  const seen = new Set<string>();
  const portableSeen = new Map<string, string>();
  for (const entry of entries) {
    const relativePath = normalizeEntryPath(entry.path);
    const portablePath = relativePath.toLocaleLowerCase("en-US");
    if (seen.has(relativePath) || portableSeen.has(portablePath)) {
      throw new DirectResearchBundleError(
        "research_bundle_path_collision",
        "Research bundle entries collide",
        {
          path: relativePath,
          existingPath: portableSeen.get(portablePath) || relativePath,
        },
      );
    }
    seen.add(relativePath);
    portableSeen.set(portablePath, relativePath);
    const targetPath = joinPath(root, relativePath);
    if (typeof entry.text === "string") {
      await writeRuntimeTextFile(targetPath, entry.text);
    } else if (entry.sourcePath) {
      await copyRuntimeFile({ sourcePath: entry.sourcePath, targetPath });
    }
  }
}

function bundleIndex(args: {
  kind: "papers" | "topics";
  papers: Record<string, unknown>[];
  topics?: Record<string, unknown>[];
  warnings: ResearchBundleWarning[];
}) {
  const lines = ["# Direct Research Bundle", "", `Kind: ${args.kind}`, ""];
  if (args.kind === "topics") {
    lines.push("## Topics", "");
    for (const topic of args.topics || []) {
      lines.push(
        `- [${cleanString(topic.title || topic.topic_id)}](${cleanString(topic.report_path)})`,
      );
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
      lines.push(
        `- ${warning.code}${warning.paper_ref ? `: ${warning.paper_ref}` : warning.topic_id ? `: ${warning.topic_id}` : ""}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export async function publishDirectResearchBundle(args: {
  kind: "papers" | "topics";
  capability: string;
  connectionMode: "local" | "remote";
  outputDir?: string;
  entries: ResearchBundleEntry[];
  papers: Record<string, unknown>[];
  topics?: Record<string, unknown>[];
  papersByRef?: Record<string, unknown>;
  warnings: ResearchBundleWarning[];
  zipName: string;
}) {
  const indexText = bundleIndex(args);
  const contentEntries = [
    ...args.entries,
    { path: "index.md", contentType: "text/markdown", text: indexText },
  ];
  if (contentEntries.length + 1 > MAX_BUNDLE_FILES) {
    throw new DirectResearchBundleError(
      "research_bundle_limit_exceeded",
      "Direct research bundle file limit exceeded",
      { count: contentEntries.length + 1, maximum: MAX_BUNDLE_FILES },
    );
  }
  const inventory = [];
  let payloadBytes = 0;
  for (const entry of contentEntries) {
    const integrity = await entryIntegrity(entry);
    payloadBytes += integrity.size;
    inventory.push(integrity);
  }
  if (payloadBytes > MAX_BUNDLE_BYTES) {
    throw new DirectResearchBundleError(
      "research_bundle_limit_exceeded",
      "Direct research bundle payload limit exceeded",
      { bytes: payloadBytes, maximum: MAX_BUNDLE_BYTES },
    );
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
    throw new DirectResearchBundleError(
      "research_bundle_limit_exceeded",
      "Direct research bundle final content limit exceeded",
      { bytes: payloadBytes + manifestBytes, maximum: MAX_BUNDLE_BYTES },
    );
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
  const stagingRoot = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "direct-research-bundles",
    args.kind,
    stamp,
    "content",
  );
  await ensureRuntimeDirectory(stagingRoot);
  try {
    await writeEntries(stagingRoot, allEntries);
    if (args.connectionMode === "local") {
      const outputDir = cleanString(args.outputDir);
      if (!outputDir) {
        throw new DirectResearchBundleError(
          "invalid_research_bundle_selector",
          "Local direct research bundle export requires output_dir",
        );
      }
      const normalizedOutputDir = normalizeLocalPath(outputDir);
      if (
        !getBaseName(normalizedOutputDir) ||
        normalizedOutputDir === "." ||
        normalizedOutputDir === ".." ||
        /^\/?[A-Za-z]:\/?$/.test(normalizedOutputDir)
      ) {
        throw new DirectResearchBundleError(
          "invalid_research_bundle_output",
          "Direct research bundle output directory is unsafe",
          { outputName: getBaseName(outputDir) },
        );
      }
      if (await runtimePathExists(outputDir)) {
        const children = await listRuntimeChildren(outputDir);
        if (children.length) {
          throw new DirectResearchBundleError(
            "output_exists",
            "Direct research bundle output directory is not empty",
            { outputName: getBaseName(outputDir) },
          );
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

    const archiveRoot = joinPath(
      getRuntimePersistencePaths().tmpDir,
      "direct-research-bundles",
      args.kind,
      stamp,
      "archive",
    );
    await ensureRuntimeDirectory(archiveRoot);
    const zipPath = joinPath(archiveRoot, args.zipName);
    let archiveRegistered = false;
    try {
      const archiveEntries: WorkflowArchiveEntry[] = allEntries.map(
        (entry) => ({
          name: entry.path,
          sourcePath: joinPath(stagingRoot, entry.path),
        }),
      );
      await createWorkflowArchiveApi().writeZipAtomic({
        targetPath: zipPath,
        entries: archiveEntries,
      });
      const source = await inspectRuntimeFileSource(zipPath);
      if (source.size > MAX_BUNDLE_BYTES) {
        throw new DirectResearchBundleError(
          "research_bundle_limit_exceeded",
          "Direct research bundle archive limit exceeded",
          { bytes: source.size, maximum: MAX_BUNDLE_BYTES },
        );
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
    } finally {
      if (!archiveRegistered && (await runtimePathExists(archiveRoot))) {
        await removeRuntimePath(archiveRoot);
      }
    }
  } finally {
    if (await runtimePathExists(stagingRoot)) {
      await removeRuntimePath(stagingRoot);
    }
  }
}

function normalizePaperSelectors(value: unknown) {
  const selectors = Array.isArray(value) ? value : [];
  const normalized: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const selector of selectors) {
    if (!isRecord(selector)) {
      throw new DirectResearchBundleError(
        "invalid_research_bundle_selector",
        "Each paper selector must be an object containing id or key",
      );
    }
    const id = cleanString(selector.id);
    const key = cleanString(selector.key);
    if ((!id && !key) || (id && key)) {
      throw new DirectResearchBundleError(
        "invalid_research_bundle_selector",
        "Each paper selector must contain exactly one of id or key",
        { selector },
      );
    }
    const libraryId = Number(selector.libraryId);
    if (
      key &&
      selector.libraryId !== undefined &&
      (!Number.isInteger(libraryId) || libraryId <= 0)
    ) {
      throw new DirectResearchBundleError(
        "invalid_research_bundle_selector",
        "Paper selector libraryId must be a positive integer",
        { selector },
      );
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

function paperMatchesSelector(
  paper: DirectResearchBundlePaper,
  selector: Record<string, unknown>,
) {
  const id = cleanString(selector.id);
  if (id) {
    return [
      paper.metadata.id,
      paper.metadata.itemId,
      paper.metadata.itemID,
    ].some((value) => cleanString(value) === id);
  }
  const libraryId = Number(selector.libraryId);
  return (
    paper.itemKey === cleanString(selector.key) &&
    (!Number.isInteger(libraryId) ||
      libraryId <= 0 ||
      paper.libraryId === libraryId)
  );
}

function directBundleDelivery(
  input: Record<string, unknown>,
  delivery: SynthesisDeliveryContext = { mode: "local" },
) {
  const outputDir = cleanString(input.output_dir || input.outputDir);
  if (delivery.mode === "local" && !outputDir) {
    throw new DirectResearchBundleError(
      "missing_output_dir",
      "Local direct research bundle export requires output_dir",
    );
  }
  if (delivery.mode === "remote" && outputDir) {
    throw new DirectResearchBundleError(
      "remote_output_dir_forbidden",
      "Remote direct research bundle export cannot write a client-local directory",
    );
  }
  return { connectionMode: delivery.mode, outputDir } as const;
}

function topicIdsFromInput(input: Record<string, unknown>) {
  return uniqueStrings([
    ...(Array.isArray(input.topic_ids) ? input.topic_ids : []),
    ...(Array.isArray(input.topicIds) ? input.topicIds : []),
    input.topic_id,
    input.topicId,
  ]);
}

function sourcePapersFromTopicContext(value: unknown) {
  if (!isRecord(value) || !isRecord(value.semantic)) return [];
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
      paperRef: cleanString(
        paper.paper_ref ||
          (isRecord(paper.digest_ref) && paper.digest_ref.paper_ref),
      ),
      title: cleanString(paper.title),
    }))
    .filter((paper) => paper.paperRef);
}

export function createDirectResearchBundleApplication(args: {
  host: DirectResearchBundleHost;
  client: Pick<SynthesisClient, "artifacts" | "topics">;
}) {
  async function resolvePapers(
    selectors: Record<string, unknown>[],
    kind: "papers" | "topics",
  ) {
    const papers = await args.host.resolveItems(selectors);
    const unresolved = selectors.filter(
      (selector) =>
        !papers.some((paper) => paperMatchesSelector(paper, selector)),
    );
    const unexpected = papers.filter(
      (paper) =>
        !selectors.some((selector) => paperMatchesSelector(paper, selector)),
    );
    if (unresolved.length || unexpected.length) {
      throw new DirectResearchBundleError(
        "invalid_research_bundle_selector",
        "Paper selectors did not resolve to the exact requested Zotero item set",
        {
          unresolved,
          unexpected_paper_refs: unexpected.map((paper) => paper.paperRef),
        },
      );
    }
    const byRef = new Map<string, DirectResearchBundlePaper>();
    for (const paper of papers) {
      const parsed = parsePaperRef(paper.paperRef);
      if (!parsed) {
        throw new DirectResearchBundleError(
          "invalid_research_bundle_selector",
          "Resolved paper must expose a canonical libraryId:itemKey ref",
          { paperRef: paper.paperRef },
        );
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

  async function exportPapers(
    input: Record<string, unknown> = {},
    delivery?: SynthesisDeliveryContext,
  ) {
    const selectors = normalizePaperSelectors(input.items);
    const papers = await resolvePapers(selectors, "papers");
    const materialized = await materializeResearchBundlePapers({
      papers,
      readArtifacts: ({ paperRefs, artifactTypes }) =>
        args.client.artifacts.readPaperArtifacts({
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

  async function exportTopics(
    input: Record<string, unknown> = {},
    delivery?: SynthesisDeliveryContext,
  ) {
    const topicIds = topicIdsFromInput(input);
    validateDirectResearchBundleScope({
      kind: "topics",
      selectorCount: topicIds.length,
      resolvedPaperCount: 0,
    });
    const topics: DirectResearchBundleTopic[] = [];
    for (const topicId of topicIds) {
      const [report, context] = await Promise.all([
        args.client.topics.getTopicReport({ topicId }),
        args.client.topics.getContext({ topicId, view: "semantic" }),
      ]);
      if (!report.ok || !cleanString(report.markdown)) {
        throw new DirectResearchBundleError(
          "invalid_research_bundle_selector",
          "Topic selector did not resolve to an available report",
          { topicId },
        );
      }
      topics.push({
        topicId: cleanString(report.topic_id) || topicId,
        title: cleanString(report.title) || topicId,
        report: report.markdown,
        sourcePapers: sourcePapersFromTopicContext(context),
        diagnostics: report.diagnostics,
      });
    }
    const sourceRefs = uniqueStrings(
      topics.flatMap((topic) =>
        topic.sourcePapers.map((paper) => paper.paperRef),
      ),
    );
    const selectors = sourceRefs.map((paperRef) => {
      const parsed = parsePaperRef(paperRef);
      if (!parsed) {
        throw new DirectResearchBundleError(
          "invalid_research_bundle_selector",
          "Topic source paper must use a canonical libraryId:itemKey ref",
          { paperRef },
        );
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
      readArtifacts: ({ paperRefs, artifactTypes }) =>
        args.client.artifacts.readPaperArtifacts({
          paper_refs: paperRefs,
          artifact_types: artifactTypes,
        }),
      includeMetadata: false,
      includeSource: false,
      artifactTypes: ["digest"],
    });
    const availableDigestRefs = new Set(
      materialized.papers
        .filter((paper) =>
          Array.isArray(paper.artifacts)
            ? paper.artifacts.some(
                (artifact) =>
                  isRecord(artifact) &&
                  cleanString(artifact.artifact_type) === "digest" &&
                  cleanString(artifact.path),
              )
            : false,
        )
        .map((paper) => cleanString(paper.paper_ref)),
    );
    const entries = [...materialized.entries];
    const warnings = [...materialized.warnings];
    const topicRecords: Record<string, unknown>[] = [];
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
      if (rewritten.warning) warnings.push(rewritten.warning);
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
    const papersByRef = Object.fromEntries(
      materialized.papers.map((paper) => {
        const paperRef = cleanString(paper.paper_ref);
        return [
          paperRef,
          {
            digest_path: availableDigestRefs.has(paperRef)
              ? `${paperBundleDirectory(paperRef)}/digest.md`
              : null,
            topic_ids: topics
              .filter((topic) =>
                topic.sourcePapers.some(
                  (sourcePaper) => sourcePaper.paperRef === paperRef,
                ),
              )
              .map((topic) => topic.topicId),
          },
        ];
      }),
    );
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

export type DirectResearchBundleApplication = ReturnType<
  typeof createDirectResearchBundleApplication
>;

export const directResearchBundleLimits = {
  paperSelectors: MAX_PAPER_SELECTORS,
  topicSelectors: MAX_TOPIC_SELECTORS,
  resolvedPapers: MAX_RESOLVED_PAPERS,
  files: MAX_BUNDLE_FILES,
  bytes: MAX_BUNDLE_BYTES,
} as const;
