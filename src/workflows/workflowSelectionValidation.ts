import { createHookHelpers } from "./helpers";
import { createWorkflowHostApi } from "./hostApi";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import { resolveRuntimeAddon, resolveRuntimeZotero } from "../utils/runtimeBridge";
import { PASS_THROUGH_BACKEND_TYPE } from "../config/defaults";
import { handlers } from "../handlers";
import type {
  LoadedWorkflow,
  WorkflowManifest,
  WorkflowRuntimeContext,
  WorkflowValidateSelectionSpec,
} from "./types";
import type { WorkflowRunOptions } from "./zoteroHostAccessOptions";

type AttachmentLike = {
  item?: {
    id?: number;
    key?: string;
    title?: string;
    libraryID?: number;
    parentItemID?: number | null;
    data?: { contentType?: string; path?: string };
  };
  filePath?: string | null;
  mimeType?: string | null;
  parent?: { id?: number | null; title?: string } | null;
};

type ParentLike = {
  item?: { id?: number; key?: string; title?: string };
  attachments?: AttachmentLike[];
  notes?: Array<Record<string, unknown>>;
};

type NoteLike = {
  item?: { id?: number; key?: string; title?: string };
  note?: string;
  parent?: { id?: number | null; title?: string } | null;
};

type SelectionLike = {
  selectionType?: string;
  items?: {
    attachments?: AttachmentLike[];
    parents?: ParentLike[];
    children?: Array<{
      item?: { id?: number; title?: string };
      parent?: { id?: number | null; title?: string } | null;
      attachments?: AttachmentLike[];
    }>;
    notes?: NoteLike[];
  };
  summary?: {
    parentCount?: number;
    childCount?: number;
    attachmentCount?: number;
    noteCount?: number;
  };
  [key: string]: unknown;
};

export type WorkflowSelectionValidationMode = "menu" | "execute";

export type WorkflowSelectionValidationResult = {
  state: "enabled" | "disabled";
  reasonCode?: string;
  scopedSelectionContexts: SelectionLike[];
  stats: {
    totalUnits: number;
    validUnits: number;
    skippedUnits: number;
  };
};

type EvaluateWorkflowSelectionArgs = {
  workflow?: LoadedWorkflow;
  manifest?: WorkflowManifest;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  mode?: WorkflowSelectionValidationMode;
  runtime?: Partial<WorkflowRuntimeContext>;
};

type RuntimeLike = WorkflowRuntimeContext;

function createSelectionRuntime(
  override?: Partial<WorkflowRuntimeContext>,
): RuntimeLike {
  const zotero =
    override?.zotero ||
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable");
  }
  const globalHostApi = (globalThis as Record<string, unknown>).__zsHostApi;
  return {
    handlers: override?.handlers || handlers,
    zotero,
    helpers: override?.helpers || createHookHelpers(zotero),
    hostApi:
      override?.hostApi ||
      (globalHostApi && typeof globalHostApi === "object"
        ? (globalHostApi as WorkflowRuntimeContext["hostApi"])
        : createWorkflowHostApi()),
    hostApiVersion:
      typeof override?.hostApiVersion === "number" ? override.hostApiVersion : 0,
    addon:
      typeof override?.addon !== "undefined"
        ? (override.addon ?? null)
        : ((resolveRuntimeAddon() as WorkflowRuntimeContext["addon"]) ?? null),
    debugMode: override?.debugMode,
    workflowId: override?.workflowId,
    packageId: override?.packageId,
    workflowRootDir: override?.workflowRootDir,
    packageRootDir: override?.packageRootDir,
    workflowSourceKind: override?.workflowSourceKind || "",
    hookName: override?.hookName || "",
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

function copySelection(selectionContext: unknown): SelectionLike {
  if (!selectionContext || typeof selectionContext !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(selectionContext)) as SelectionLike;
}

function getSelectionItemCounts(selection: SelectionLike) {
  const items = selection.items || {};
  return {
    attachments: Array.isArray(items.attachments) ? items.attachments.length : 0,
    parents: Array.isArray(items.parents) ? items.parents.length : 0,
    children: Array.isArray(items.children) ? items.children.length : 0,
    notes: Array.isArray(items.notes) ? items.notes.length : 0,
  };
}

function totalCount(counts: ReturnType<typeof getSelectionItemCounts>) {
  return counts.attachments + counts.parents + counts.children + counts.notes;
}

function countNonZeroKinds(counts: ReturnType<typeof getSelectionItemCounts>) {
  return [
    counts.attachments > 0,
    counts.parents > 0,
    counts.children > 0,
    counts.notes > 0,
  ].filter(Boolean).length;
}

function hasAnySelectionItems(selection: SelectionLike) {
  return totalCount(getSelectionItemCounts(selection)) > 0;
}

function matchesCountRule(value: number, rule: unknown) {
  if (!rule || typeof rule !== "object") {
    return true;
  }
  const typed = rule as { min?: number; max?: number; exact?: number };
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

function validateRequiredCounts(
  spec: WorkflowValidateSelectionSpec | undefined,
  selection: SelectionLike,
) {
  const counts = getSelectionItemCounts(selection);
  const require = spec?.require;
  if (require?.allowMixed === false && countNonZeroKinds(counts) > 1) {
    return "mixed-selection-not-allowed";
  }
  const rules = require?.counts || {};
  const checks: Array<[string, number, unknown]> = [
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

function getAttachmentParentId(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.getAttachmentParentId(entry) || null;
}

function getAttachmentFileName(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.getAttachmentFileName(entry);
}

function getAttachmentFileStem(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.getAttachmentFileStem(entry);
}

function getAttachmentDateAdded(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.getAttachmentDateAdded(entry);
}

function isMarkdownAttachment(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.isMarkdownAttachment(entry);
}

function isPdfAttachment(entry: AttachmentLike, runtime: RuntimeLike) {
  return runtime.helpers.isPdfAttachment(entry);
}

function flattenAttachments(selection: SelectionLike) {
  const items = selection.items || {};
  const direct = Array.isArray(items.attachments) ? items.attachments : [];
  const fromParents = (Array.isArray(items.parents) ? items.parents : [])
    .flatMap((entry) => entry.attachments || [])
    .filter(Boolean);
  const fromChildren = (Array.isArray(items.children) ? items.children : [])
    .flatMap((entry) => entry.attachments || [])
    .filter(Boolean);
  const merged = [...direct, ...fromParents, ...fromChildren];
  const seen = new Set<string>();
  const deduped: AttachmentLike[] = [];
  for (const entry of merged) {
    const key =
      typeof entry.item?.id === "number"
        ? `id:${entry.item.id}`
        : `file:${entry.filePath || entry.item?.data?.path || ""}|parent:${
            entry.parent?.id || entry.item?.parentItemID || ""
          }`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function collectAttachmentCandidates(selection: SelectionLike) {
  const direct = selection.items?.attachments || [];
  if (direct.length > 0) {
    return flattenAttachments({
      items: {
        attachments: direct,
        parents: [],
        children: [],
      },
    });
  }
  return flattenAttachments(selection);
}

function getAttachmentMime(entry: AttachmentLike) {
  return (entry.mimeType || entry.item?.data?.contentType || "").trim();
}

function applyAttachmentMimeFilter(
  attachments: AttachmentLike[],
  mimes: string[] | undefined,
) {
  if (!mimes || mimes.length === 0) {
    return attachments;
  }
  return attachments.filter((entry) => {
    const mime = getAttachmentMime(entry);
    if (mime && mimes.includes(mime)) {
      return true;
    }
    const filePath = String(entry.filePath || entry.item?.data?.path || "")
      .toLowerCase();
    if (
      filePath.endsWith(".md") &&
      (mimes.includes("text/markdown") ||
        mimes.includes("text/x-markdown") ||
        mimes.includes("text/plain"))
    ) {
      return true;
    }
    if (filePath.endsWith(".pdf") && mimes.includes("application/pdf")) {
      return true;
    }
    return false;
  });
}

function splitAttachmentsByPerParentRules(args: {
  attachments: AttachmentLike[];
  min: number;
  max: number;
  runtime: RuntimeLike;
}) {
  const byParent = new Map<number, AttachmentLike[]>();
  const valid: AttachmentLike[] = [];
  const ambiguousParents = new Set<number>();
  for (const entry of args.attachments) {
    const parentId = getAttachmentParentId(entry, args.runtime);
    if (!parentId) {
      continue;
    }
    const entries = byParent.get(parentId) || [];
    entries.push(entry);
    byParent.set(parentId, entries);
  }
  for (const [parentId, entries] of byParent.entries()) {
    if (entries.length < args.min) {
      continue;
    }
    if (entries.length > args.max) {
      ambiguousParents.add(parentId);
      continue;
    }
    valid.push(...entries);
  }
  return { valid, ambiguousParents };
}

function withScopedAttachments(
  selection: SelectionLike,
  attachments: AttachmentLike[],
  runtime: RuntimeLike,
) {
  return runtime.helpers.withFilteredAttachments(
    selection,
    attachments as unknown[],
  ) as SelectionLike;
}

function buildParentSelectionUnits(selection: SelectionLike) {
  const parents = selection.items?.parents || [];
  return parents.map((parent) => {
    const cloned = copySelection(selection);
    cloned.items = {
      parents: [parent],
      attachments: [],
      children: [],
      notes: [],
    };
    cloned.summary = {
      ...(cloned.summary || {}),
      parentCount: 1,
      attachmentCount: 0,
      childCount: 0,
      noteCount: 0,
    };
    cloned.selectionType = "parent";
    return cloned;
  });
}

function buildNoteSelectionUnits(selection: SelectionLike) {
  const notes = selection.items?.notes || [];
  return notes.map((note) => {
    const cloned = copySelection(selection);
    cloned.items = {
      notes: [note],
      attachments: [],
      children: [],
      parents: [],
    };
    cloned.summary = {
      ...(cloned.summary || {}),
      noteCount: 1,
      attachmentCount: 0,
      childCount: 0,
      parentCount: 0,
    };
    cloned.selectionType = "note";
    return cloned;
  });
}

function estimatePassThroughTotalUnits(selection: SelectionLike) {
  const counts = getSelectionItemCounts(selection);
  const nonZeroKinds = countNonZeroKinds(counts);
  if (nonZeroKinds === 0 || nonZeroKinds > 1) {
    return 1;
  }
  if (counts.notes > 0) return counts.notes;
  if (counts.parents > 0) return counts.parents;
  if (counts.children > 0) return counts.children;
  if (counts.attachments > 0) return counts.attachments;
  return 1;
}

function splitPassThroughSelectionUnits(selection: SelectionLike) {
  const counts = getSelectionItemCounts(selection);
  const nonZeroKinds = countNonZeroKinds(counts);
  if (nonZeroKinds !== 1) {
    return [selection];
  }
  if (counts.notes > 1) {
    return buildNoteSelectionUnits(selection);
  }
  if (counts.parents > 1) {
    return buildParentSelectionUnits(selection);
  }
  return [selection];
}

function compareByDateAndName(
  left: AttachmentLike,
  right: AttachmentLike,
  runtime: RuntimeLike,
) {
  const dateDelta =
    getAttachmentDateAdded(left, runtime) - getAttachmentDateAdded(right, runtime);
  if (dateDelta !== 0) {
    return dateDelta;
  }
  return getAttachmentFileName(left, runtime).localeCompare(
    getAttachmentFileName(right, runtime),
  );
}

function chooseLiteratureSourceByPolicy(
  mdEntries: AttachmentLike[],
  pdfEntries: AttachmentLike[],
  runtime: RuntimeLike,
) {
  if (mdEntries.length > 0) {
    if (mdEntries.length === 1) {
      return mdEntries[0];
    }
    const earliestPdf = [...pdfEntries]
      .filter((entry) => isPdfAttachment(entry, runtime))
      .sort((a, b) => compareByDateAndName(a, b, runtime))[0];
    if (earliestPdf) {
      const stem = getAttachmentFileStem(earliestPdf, runtime);
      const matched = mdEntries.find(
        (entry) => getAttachmentFileStem(entry, runtime) === stem,
      );
      if (matched) {
        return matched;
      }
    }
    return [...mdEntries].sort((a, b) => compareByDateAndName(a, b, runtime))[0];
  }
  if (pdfEntries.length > 0) {
    return [...pdfEntries].sort((a, b) => compareByDateAndName(a, b, runtime))[0];
  }
  return null;
}

function collectSelectedLiteratureSources(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const selectedParents = selection.items?.parents || [];
  const selectedAttachments = selection.items?.attachments || [];
  const selectedParentIds = new Set(
    selectedParents.map((entry) => entry?.item?.id).filter(Boolean),
  );
  const byParent = new Map<number, AttachmentLike>();
  for (const parent of selectedParents) {
    const parentId = parent?.item?.id;
    if (!parentId) {
      continue;
    }
    const allAttachments = parent.attachments || [];
    const mdEntries = allAttachments.filter((entry) =>
      isMarkdownAttachment(entry, runtime),
    );
    const pdfEntries = allAttachments.filter((entry) =>
      isPdfAttachment(entry, runtime),
    );
    const resolved = chooseLiteratureSourceByPolicy(
      mdEntries,
      pdfEntries,
      runtime,
    );
    if (resolved) {
      byParent.set(parentId, resolved);
    }
  }
  const groupedByParent = new Map<
    number,
    { mdEntries: AttachmentLike[]; pdfEntries: AttachmentLike[] }
  >();
  for (const entry of selectedAttachments) {
    const parentId = getAttachmentParentId(entry, runtime);
    if (!parentId || selectedParentIds.has(parentId)) {
      continue;
    }
    if (!isMarkdownAttachment(entry, runtime) && !isPdfAttachment(entry, runtime)) {
      continue;
    }
    const bucket = groupedByParent.get(parentId) || {
      mdEntries: [],
      pdfEntries: [],
    };
    if (isMarkdownAttachment(entry, runtime)) {
      bucket.mdEntries.push(entry);
    } else {
      bucket.pdfEntries.push(entry);
    }
    groupedByParent.set(parentId, bucket);
  }
  for (const [parentId, grouped] of groupedByParent.entries()) {
    if (byParent.has(parentId)) {
      continue;
    }
    const resolved = chooseLiteratureSourceByPolicy(
      grouped.mdEntries,
      grouped.pdfEntries,
      runtime,
    );
    if (resolved) {
      byParent.set(parentId, resolved);
    }
  }
  return Array.from(byParent.values());
}

function parseGeneratedNoteKind(noteContent: unknown) {
  const text = String(noteContent || "");
  const kindMatch = text.match(
    /data-zs-note-kind\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const kind = kindMatch
    ? String(kindMatch[1] || kindMatch[2] || kindMatch[3] || "")
    : "";
  if (kind === "citation_analysis") {
    return "citation-analysis";
  }
  if (
    kind === "digest" ||
    kind === "references" ||
    kind === "citation-analysis" ||
    kind === "conversation-note" ||
    kind === "custom"
  ) {
    return kind;
  }
  if (kind === "literature-digest" || kind === "literature-analysis") {
    return "digest";
  }
  if (
    /<h1[^>]*>\s*(?:Literature\s+)?Digest\s*<\/h1>/i.test(text) ||
    /(^|\n)\s*#\s*(?:Literature\s+)?Digest\s*($|\n)/i.test(text)
  ) {
    return "digest";
  }
  if (
    /<h1[^>]*>\s*References(?:\s+JSON)?\s*<\/h1>/i.test(text) ||
    /(^|\n)\s*#\s*References(?:\s+JSON)?\s*($|\n)/i.test(text)
  ) {
    return "references";
  }
  if (
    /<h1[^>]*>\s*Citation Analysis\s*<\/h1>/i.test(text) ||
    /(^|\n)\s*#\s*Citation Analysis\s*($|\n)/i.test(text)
  ) {
    return "citation-analysis";
  }
  return "";
}

function resolveItem(runtime: RuntimeLike, ref: unknown) {
  if (
    typeof ref !== "string" &&
    typeof ref !== "number" &&
    (typeof ref !== "object" || ref === null)
  ) {
    return null;
  }
  try {
    return runtime.helpers.resolveItemRef(ref as string | number | Zotero.Item);
  } catch {
    return null;
  }
}

function isRegularItem(item: Zotero.Item | null): item is Zotero.Item {
  try {
    if (typeof item?.isRegularItem === "function") {
      return item.isRegularItem();
    }
  } catch {
    return false;
  }
  return !!item && typeof item.getNotes === "function";
}

async function collectParentGeneratedNoteKinds(
  parentId: number,
  runtime: RuntimeLike,
) {
  const kinds = new Set<string>();
  const parentItem = resolveItem(runtime, parentId);
  if (!isRegularItem(parentItem)) {
    return kinds;
  }
  const noteIds = parentItem?.getNotes?.() || [];
  for (const noteRef of noteIds) {
    const noteItem = resolveItem(runtime, noteRef);
    const kind = parseGeneratedNoteKind(noteItem?.getNote?.() || "");
    if (kind) {
      kinds.add(kind);
    }
  }
  return kinds;
}

async function parentHasAllGeneratedNotes(
  parentId: number,
  noteKinds: string[],
  runtime: RuntimeLike,
) {
  const kinds = await collectParentGeneratedNoteKinds(parentId, runtime);
  return noteKinds.every((kind) => kinds.has(kind));
}

function normalizePath(value: unknown) {
  return String(value || "").trim();
}

function toNativePath(value: unknown) {
  const text = normalizePath(value);
  if (/^[A-Za-z]:\//.test(text)) {
    return text.replace(/\//g, "\\");
  }
  return text;
}

function basenamePath(filePath: unknown) {
  const parts = String(filePath || "")
    .split(/[\\/]+/)
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function dirnamePath(filePath: unknown) {
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

function joinPath(baseDir: unknown, name: unknown) {
  const left = String(baseDir || "").replace(/[\\/]+$/, "");
  const right = String(name || "").replace(/^[\\/]+/, "");
  if (!left) return toNativePath(right);
  if (!right) return toNativePath(left);
  const separator = left.includes("\\") ? "\\" : "/";
  return toNativePath(`${left}${separator}${right}`);
}

function replaceExtension(filePath: unknown, extension: string) {
  const normalized = normalizePath(filePath);
  if (!normalized) return "";
  if (/\.[^./\\]+$/.test(normalized)) {
    return normalized.replace(/\.[^./\\]+$/, extension);
  }
  return `${normalized}${extension}`;
}

async function resolveAttachmentSourcePath(
  entry: AttachmentLike,
  runtime: RuntimeLike,
) {
  const candidates: string[] = [];
  const itemId = Number(entry?.item?.id || 0);
  if (itemId) {
    const item = resolveItem(runtime, itemId);
    const resolved = normalizePath(await item?.getFilePathAsync?.());
    if (resolved) {
      candidates.push(resolved);
    }
  }
  candidates.push(
    runtime.helpers.getAttachmentFilePath(entry),
    String(entry.filePath || ""),
    String(entry.item?.data?.path || ""),
  );
  return normalizePath(candidates.find((candidate) => normalizePath(candidate)));
}

function sanitizeFileNameSegment(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveArtifactTargetPath(
  entry: AttachmentLike,
  target: string,
  args: EvaluateWorkflowSelectionArgs,
  runtime: RuntimeLike,
  sourcePath: string,
) {
  const sourceDir = dirnamePath(sourcePath);
  const sourceName = basenamePath(sourcePath);
  if (!sourceDir || !sourceName) {
    return "";
  }
  if (target === "deep-reading-html") {
    return joinPath(sourceDir, replaceExtension(sourceName, ".html"));
  }
  if (target === "mineru-markdown") {
    return joinPath(sourceDir, replaceExtension(sourceName, ".md"));
  }
  if (target === "translator-markdown") {
    const parameterName = "target_language";
    const targetLanguage =
      String(args.executionOptions?.workflowParams?.[parameterName] || "").trim() ||
      "zh-CN";
    const sourceMarkdownName = replaceExtension(sourceName, ".md");
    const stem = sourceMarkdownName.replace(/\.md$/i, "");
    const suffix = sanitizeFileNameSegment(targetLanguage);
    if (!stem || !suffix) {
      return "";
    }
    return joinPath(sourceDir, `${stem}_${suffix}.md`);
  }
  return "";
}

async function fileExists(path: string, runtime: RuntimeLike) {
  const targetPath = toNativePath(path);
  if (!targetPath) {
    return false;
  }
  const hostFile = runtime.hostApi?.file;
  if (typeof hostFile?.exists === "function") {
    return Boolean(await hostFile.exists(targetPath));
  }
  try {
    return Boolean(runtime.zotero.File.pathToFile(targetPath)?.exists?.());
  } catch {
    return false;
  }
}

async function filterArtifactConflicts(
  attachments: AttachmentLike[],
  args: EvaluateWorkflowSelectionArgs,
  runtime: RuntimeLike,
) {
  const artifactRules = (args.manifest || args.workflow?.manifest)
    ?.validateSelection?.exclude?.filter(
      (entry) => entry.kind === "artifact-exists",
    ) as Array<{ kind: "artifact-exists"; target: string }> | undefined;
  if (!artifactRules?.length) {
    return attachments;
  }
  const accepted: AttachmentLike[] = [];
  for (const entry of attachments) {
    const sourcePath = await resolveAttachmentSourcePath(entry, runtime);
    if (!sourcePath) {
      continue;
    }
    let conflict = false;
    for (const rule of artifactRules) {
      const targetPath = resolveArtifactTargetPath(
        entry,
        rule.target,
        args,
        runtime,
        sourcePath,
      );
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

async function filterGeneratedNoteExclusions(
  attachments: AttachmentLike[],
  spec: WorkflowValidateSelectionSpec | undefined,
  runtime: RuntimeLike,
) {
  const rules = spec?.exclude?.filter(
    (entry) => entry.kind === "generated-notes-all",
  ) as Array<{ kind: "generated-notes-all"; noteKinds: string[] }> | undefined;
  if (!rules?.length) {
    return attachments;
  }
  const cache = new Map<number, boolean>();
  const accepted: AttachmentLike[] = [];
  for (const entry of attachments) {
    const parentId = getAttachmentParentId(entry, runtime);
    if (!parentId) {
      continue;
    }
    let excluded = cache.get(parentId);
    if (typeof excluded !== "boolean") {
      excluded = false;
      for (const rule of rules) {
        if (await parentHasAllGeneratedNotes(parentId, rule.noteKinds, runtime)) {
          excluded = true;
          break;
        }
      }
      cache.set(parentId, excluded);
    }
    if (!excluded) {
      accepted.push(entry);
    }
  }
  return accepted;
}

function createAttachmentSelectionUnits(
  selection: SelectionLike,
  attachments: AttachmentLike[],
  runtime: RuntimeLike,
) {
  return attachments.map((entry) => withScopedAttachments(selection, [entry], runtime));
}

async function selectInputUnit(args: {
  manifest: WorkflowManifest;
  selection: SelectionLike;
  runtime: RuntimeLike;
}) {
  const unit = args.manifest.inputs?.unit || "attachment";
  if (unit === "workflow") {
    return {
      contexts: [copySelection(args.selection)],
      totalUnits: 1,
    };
  }
  if (unit === "parent") {
    const contexts = buildParentSelectionUnits(copySelection(args.selection));
    return { contexts, totalUnits: contexts.length };
  }
  if (unit === "note") {
    const contexts = buildNoteSelectionUnits(copySelection(args.selection));
    return { contexts, totalUnits: contexts.length };
  }
  const inputs = args.manifest.inputs;
  const candidates = applyAttachmentMimeFilter(
    collectAttachmentCandidates(copySelection(args.selection)),
    inputs?.accepts?.mime,
  );
  const perParentMin = Math.max(0, inputs?.per_parent?.min ?? 0);
  const rawMax = inputs?.per_parent?.max ?? Number.POSITIVE_INFINITY;
  const perParentMax = Math.max(perParentMin, rawMax);
  const split = splitAttachmentsByPerParentRules({
    attachments: candidates,
    min: perParentMin,
    max: perParentMax,
    runtime: args.runtime,
  });
  return {
    contexts: createAttachmentSelectionUnits(
      args.selection,
      split.valid,
      args.runtime,
    ),
    totalUnits: split.valid.length + split.ambiguousParents.size,
  };
}

async function selectGeneratedNoteCandidates(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const candidates: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  const addCandidate = (
    candidate: Record<string, unknown> & { kind?: unknown; noteItemID?: unknown },
  ) => {
    const key = `${candidate.kind || ""}:${candidate.noteItemID || ""}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(candidate);
  };
  for (const parentEntry of selection.items?.parents || []) {
    const parentId = parentEntry.item?.id;
    if (!parentId) {
      continue;
    }
    const parentItem = resolveItem(runtime, parentId);
    if (!isRegularItem(parentItem)) {
      continue;
    }
    for (const noteRef of parentItem?.getNotes?.() || []) {
      const noteItem = resolveItem(runtime, noteRef);
      if (!noteItem) {
        continue;
      }
      addCandidate({
        kind: parseGeneratedNoteKind(noteItem.getNote?.() || "") || "custom",
        noteItemID: noteItem.id,
        noteItemKey: String(noteItem.key || "").trim(),
        parentItemID: parentItem.id,
        parentItemKey: String(parentItem.key || "").trim(),
        parentTitle: String(parentItem.getField?.("title") || "").trim(),
      });
    }
  }
  for (const noteEntry of selection.items?.notes || []) {
    const noteRef = noteEntry.item?.id || noteEntry.item?.key;
    const noteItem = resolveItem(runtime, noteRef);
    if (!noteItem) {
      continue;
    }
    const parentItem = resolveItem(runtime, noteItem.parentItemID);
    if (!parentItem) {
      continue;
    }
    addCandidate({
      kind: parseGeneratedNoteKind(noteItem.getNote?.() || "") || "custom",
      noteItemID: noteItem.id,
      noteItemKey: String(noteItem.key || "").trim(),
      parentItemID: parentItem.id,
      parentItemKey: String(parentItem.key || "").trim(),
      parentTitle: String(parentItem.getField?.("title") || "").trim(),
    });
  }
  if (candidates.length === 0) {
    return { contexts: [], totalUnits: 0 };
  }
  const cloned = copySelection(selection);
  cloned.items = {
    parents: [],
    notes: [],
    attachments: [],
    children: [
      {
        item: {
          id: Number(candidates[0].parentItemID || 0),
          title: String(candidates[0].parentTitle || ""),
        },
        parent: null,
        attachments: [],
      },
    ],
  };
  cloned.summary = {
    ...(cloned.summary || {}),
    parentCount: 0,
    noteCount: 0,
    attachmentCount: 0,
    childCount: 1,
  };
  cloned.selectionType = "child";
  cloned.exportCandidates = candidates;
  return { contexts: [cloned], totalUnits: candidates.length };
}

function buildDigestRepresentativeTarget(args: {
  noteItem: Zotero.Item;
  parentItem: Zotero.Item;
  kind: "digest-note" | "digest-parent";
}) {
  return {
    kind: args.kind,
    noteItemID: args.noteItem.id,
    noteItemKey: String(args.noteItem.key || "").trim(),
    parentItemID: args.parentItem.id,
    parentItemKey: String(args.parentItem.key || "").trim(),
    parentTitle: String(args.parentItem.getField?.("title") || "").trim(),
  };
}

async function selectDigestRepresentativeImage(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const parents = selection.items?.parents || [];
  const notes = selection.items?.notes || [];
  if (parents.length + notes.length !== 1) {
    return { contexts: [], totalUnits: parents.length + notes.length };
  }
  const cloned = copySelection(selection);
  if (parents.length === 1) {
    const parentId = parents[0].item?.id;
    const parentItem = parentId ? resolveItem(runtime, parentId) : null;
    if (!isRegularItem(parentItem)) {
      return { contexts: [], totalUnits: 1 };
    }
    const digestNotes: Zotero.Item[] = [];
    for (const noteRef of parentItem.getNotes?.() || []) {
      const noteItem = resolveItem(runtime, noteRef);
      if (
        noteItem &&
        parseGeneratedNoteKind(noteItem.getNote?.() || "") === "digest"
      ) {
        digestNotes.push(noteItem);
      }
    }
    if (digestNotes.length !== 1) {
      return { contexts: [], totalUnits: 1 };
    }
    cloned.items = {
      parents: [parents[0]],
      notes: [],
      attachments: [],
      children: [],
    };
    cloned.summary = {
      ...(cloned.summary || {}),
      parentCount: 1,
      noteCount: 0,
      attachmentCount: 0,
      childCount: 0,
    };
    cloned.selectionType = "parent";
    cloned.digestRepresentativeImageTarget = buildDigestRepresentativeTarget({
      noteItem: digestNotes[0],
      parentItem,
      kind: "digest-parent",
    });
    return { contexts: [cloned], totalUnits: 1 };
  }
  const noteRef = notes[0].item?.id || notes[0].item?.key;
  const noteItem = resolveItem(runtime, noteRef);
  if (!noteItem || parseGeneratedNoteKind(noteItem.getNote?.() || "") !== "digest") {
    return { contexts: [], totalUnits: 1 };
  }
  const parentItem = resolveItem(runtime, noteItem.parentItemID);
  if (!parentItem) {
    return { contexts: [], totalUnits: 1 };
  }
  cloned.items = {
    parents: [],
    notes: [notes[0]],
    attachments: [],
    children: [],
  };
  cloned.summary = {
    ...(cloned.summary || {}),
    parentCount: 0,
    noteCount: 1,
    attachmentCount: 0,
    childCount: 0,
  };
  cloned.selectionType = "note";
  cloned.digestRepresentativeImageTarget = buildDigestRepresentativeTarget({
    noteItem,
    parentItem,
    kind: "digest-note",
  });
  return { contexts: [cloned], totalUnits: 1 };
}

async function selectByValidateSelectionPolicy(args: {
  manifest: WorkflowManifest;
  selection: SelectionLike;
  runtime: RuntimeLike;
  rootArgs: EvaluateWorkflowSelectionArgs;
}) {
  const policy = args.manifest.validateSelection?.select?.policy || "input-unit";
  if (policy === "literature-source") {
    const candidates = collectSelectedLiteratureSources(args.selection, args.runtime);
    const withoutGenerated = await filterGeneratedNoteExclusions(
      candidates,
      args.manifest.validateSelection,
      args.runtime,
    );
    const withoutArtifacts = await filterArtifactConflicts(
      withoutGenerated,
      { ...args.rootArgs, manifest: args.manifest },
      args.runtime,
    );
    return {
      contexts: createAttachmentSelectionUnits(
        args.selection,
        withoutArtifacts,
        args.runtime,
      ),
      totalUnits: candidates.length,
    };
  }
  if (policy === "pdf-attachment") {
    const candidates = collectAttachmentCandidates(args.selection).filter((entry) =>
      isPdfAttachment(entry, args.runtime),
    );
    const withoutArtifacts = await filterArtifactConflicts(
      candidates,
      { ...args.rootArgs, manifest: args.manifest },
      args.runtime,
    );
    return {
      contexts: createAttachmentSelectionUnits(
        args.selection,
        withoutArtifacts,
        args.runtime,
      ),
      totalUnits: candidates.length,
    };
  }
  if (policy === "selected-parent") {
    const contexts = buildParentSelectionUnits(args.selection);
    return { contexts, totalUnits: contexts.length };
  }
  if (policy === "generated-note-candidates") {
    return selectGeneratedNoteCandidates(args.selection, args.runtime);
  }
  if (policy === "digest-representative-image") {
    return selectDigestRepresentativeImage(args.selection, args.runtime);
  }
  return selectInputUnit({
    manifest: args.manifest,
    selection: args.selection,
    runtime: args.runtime,
  });
}

export async function evaluateWorkflowSelection(
  args: EvaluateWorkflowSelectionArgs,
): Promise<WorkflowSelectionValidationResult> {
  const manifest = args.manifest || args.workflow?.manifest;
  if (!manifest) {
    throw new Error("workflow manifest is required");
  }
  const runtime = createSelectionRuntime(args.runtime);
  const selection = copySelection(args.selectionContext);
  const hasSelection = hasAnySelectionItems(selection);
  if (!hasSelection && !canWorkflowRunWithoutSelection(manifest)) {
    return {
      state: "disabled",
      reasonCode: "no-selection",
      scopedSelectionContexts: [],
      stats: { totalUnits: 0, validUnits: 0, skippedUnits: 0 },
    };
  }
  const requiredError = validateRequiredCounts(
    manifest.validateSelection,
    selection,
  );
  if (requiredError) {
    return {
      state: "disabled",
      reasonCode: requiredError,
      scopedSelectionContexts: [],
      stats: { totalUnits: totalCount(getSelectionItemCounts(selection)), validUnits: 0, skippedUnits: totalCount(getSelectionItemCounts(selection)) },
    };
  }
  let selected: { contexts: SelectionLike[]; totalUnits: number };
  if (manifest.validateSelection) {
    selected = await selectByValidateSelectionPolicy({
      manifest,
      selection,
      runtime,
      rootArgs: args,
    });
  } else if (
    String(manifest.provider || "").trim() === PASS_THROUGH_BACKEND_TYPE &&
    !manifest.inputs?.unit
  ) {
    const contexts =
      !hasSelection && canWorkflowRunWithoutSelection(manifest)
        ? [selection]
        : splitPassThroughSelectionUnits(selection);
    selected = {
      contexts,
      totalUnits: estimatePassThroughTotalUnits(selection),
    };
  } else if (!hasSelection && canWorkflowRunWithoutSelection(manifest)) {
    selected = { contexts: [selection], totalUnits: 1 };
  } else {
    selected = await selectInputUnit({ manifest, selection, runtime });
  }
  const validUnits = selected.contexts.length;
  const totalUnits = Math.max(selected.totalUnits, validUnits);
  return {
    state: validUnits > 0 ? "enabled" : "disabled",
    reasonCode: validUnits > 0 ? undefined : "no-valid-input-units",
    scopedSelectionContexts: selected.contexts,
    stats: {
      totalUnits,
      validUnits,
      skippedUnits: Math.max(0, totalUnits - validUnits),
    },
  };
}
