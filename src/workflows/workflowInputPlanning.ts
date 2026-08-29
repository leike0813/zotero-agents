import { createHookHelpers } from "./helpers";
import { createWorkflowHostApi } from "./hostApi";
import { resolveWorkflowHostContractVersion } from "./workflowHostContract";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import { resolveRuntimeAddon, resolveRuntimeZotero } from "../utils/runtimeBridge";
import { PASS_THROUGH_BACKEND_TYPE } from "../config/defaults";
import { handlers } from "../handlers";
import { resolveWorkflowDisplayLocale } from "./localization";
import { evaluateGeneratedNoteReadiness } from "../modules/libraryArtifactReadiness";
import type {
  LoadedWorkflow,
  WorkflowInputMemberKind,
  WorkflowManifest,
  WorkflowRuntimeContext,
  WorkflowSelectionFilter,
  WorkflowValidateSelectionSpec,
} from "./types";
import type { WorkflowRunOptions } from "./zoteroHostAccessOptions";
import { runtimePathExists } from "../modules/runtimePersistence";

type AttachmentLike = {
  item?: {
    id?: number;
    key?: string;
    title?: string;
    libraryID?: number;
    parentItemID?: number | null;
    data?: { title?: string; contentType?: string; path?: string };
  };
  filePath?: string | null;
  mimeType?: string | null;
  parent?: {
    id?: number | null;
    title?: string;
    data?: { title?: string };
  } | null;
};

type ParentLike = {
  item?: {
    id?: number;
    key?: string;
    title?: string;
    libraryID?: number;
    data?: { title?: string };
  };
  attachments?: AttachmentLike[];
  notes?: Array<Record<string, unknown>>;
};

type ParentRefLike = {
  id?: number | null;
  key?: string;
  title?: string;
  libraryID?: number;
};

type NoteLike = {
  item?: {
    id?: number;
    key?: string;
    title?: string;
    data?: { title?: string };
  };
  note?: string;
  parent?: {
    id?: number | null;
    title?: string;
    data?: { title?: string };
  } | null;
};

type SelectionLike = {
  selectionType?: string;
  items?: {
    attachments?: AttachmentLike[];
    parents?: ParentLike[];
    children?: Array<{
      item?: {
        id?: number;
        key?: string;
        title?: string;
        data?: { title?: string };
      };
      parent?: {
        id?: number | null;
        title?: string;
        data?: { title?: string };
      } | null;
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

export type WorkflowScopedSelectionContext = SelectionLike;

export type WorkflowSelectionValidationMode = "menu" | "execute" | "handoff";

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

type WorkflowArtifactAbsentRule = Extract<
  WorkflowSelectionFilter,
  { kind: "artifact-absent" }
>;

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
  const hasGlobalHostApi = Boolean(
    globalHostApi && typeof globalHostApi === "object",
  );
  const currentProjection = !override?.hostApi && !hasGlobalHostApi;
  const hostApi =
    override?.hostApi ||
    (hasGlobalHostApi
      ? (globalHostApi as WorkflowRuntimeContext["hostApi"])
      : createWorkflowHostApi());
  return {
    handlers: override?.handlers || handlers,
    zotero,
    helpers: override?.helpers || createHookHelpers(zotero),
    hostApi,
    hostApiVersion: resolveWorkflowHostContractVersion({
      explicitVersion: override?.hostApiVersion,
      hostApi,
      currentProjection,
    }),
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
  const require = spec?.require?.selection;
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

function parentKeyFromEntry(entry: ParentLike | null | undefined) {
  const item = entry?.item || {};
  const id = Number(item.id || 0);
  if (id) {
    return `id:${id}`;
  }
  const key = String(item.key || "").trim();
  if (key) {
    return `key:${item.libraryID || ""}:${key}`;
  }
  return "";
}

function parentEntryFromRef(
  ref: ParentLike | ParentRefLike | null | undefined,
) {
  if (!ref) {
    return null;
  }
  if ((ref as ParentLike).item) {
    return ref as ParentLike;
  }
  const raw = ref as ParentRefLike;
  const id = Number(raw.id || 0);
  const key = String(raw.key || "").trim();
  if (!id && !key) {
    return null;
  }
  return {
    item: {
      id: id || undefined,
      key,
      title: String(raw.title || "").trim(),
      libraryID: raw.libraryID,
    },
    attachments: [],
    notes: [],
  } satisfies ParentLike;
}

function addParentEntry(
  entries: Map<string, ParentLike>,
  entry: ParentLike | null | undefined,
) {
  const key = parentKeyFromEntry(entry);
  if (!key || !entry || entries.has(key)) {
    return;
  }
  entries.set(key, entry);
}

function collectLiteratureParentEntries(selection: SelectionLike) {
  const entries = new Map<string, ParentLike>();
  for (const parent of selection.items?.parents || []) {
    addParentEntry(entries, parent);
  }
  for (const attachment of selection.items?.attachments || []) {
    addParentEntry(entries, parentEntryFromRef(attachment.parent));
    if (!attachment.parent) {
      addParentEntry(
        entries,
        parentEntryFromRef({ id: attachment.item?.parentItemID || 0 }),
      );
    }
  }
  for (const note of selection.items?.notes || []) {
    addParentEntry(entries, parentEntryFromRef(note.parent));
  }
  for (const child of selection.items?.children || []) {
    addParentEntry(entries, parentEntryFromRef(child.parent));
  }
  return Array.from(entries.values());
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
    kind === "literature-score" ||
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
  rule: WorkflowArtifactAbsentRule,
  args: EvaluateWorkflowSelectionArgs,
  sourcePath: string,
) {
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
    const parameterValue = String(
      args.executionOptions?.workflowParams?.[rule.parameter || ""] ?? "",
    ).trim();
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

async function fileExists(path: string, runtime: RuntimeLike) {
  try {
    const targetPath = toNativePath(path);
    if (!targetPath) {
      return false;
    }
    const hostFile = runtime.hostApi?.file;
    if (typeof hostFile?.exists === "function") {
      return Boolean(await hostFile.exists(targetPath));
    }
    return runtimePathExists(targetPath);
  } catch {
    return false;
  }
}

async function filterMissingSourceFiles(
  attachments: AttachmentLike[],
  runtime: RuntimeLike,
) {
  if (!attachments.length) return attachments;
  const result: AttachmentLike[] = [];
  for (const entry of attachments) {
    const sourcePath = await resolveAttachmentSourcePath(entry, runtime);
    if (!sourcePath) continue;
    if (await fileExists(sourcePath, runtime)) {
      result.push(entry);
    }
  }
  return result;
}

async function filterArtifactConflicts(
  attachments: AttachmentLike[],
  args: EvaluateWorkflowSelectionArgs,
  runtime: RuntimeLike,
) {
  const artifactRules = (args.manifest || args.workflow?.manifest)
    ?.validateSelection?.filters?.filter(
      (entry): entry is WorkflowArtifactAbsentRule =>
        entry.kind === "artifact-absent",
    );
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
      if (args.mode === "menu" && rule.phase === "execute") {
        continue;
      }
      const targetPath = resolveArtifactTargetPath(
        rule,
        args,
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
  const rules = spec?.filters?.filter(
    (entry) => entry.kind === "generated-note-kinds-absent",
  ) as
    | Array<{
        kind: "generated-note-kinds-absent";
        phase: "availability";
        noteKinds: string[];
      }>
    | undefined;
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

export type WorkflowInputCandidate = Readonly<{
  kind: WorkflowInputMemberKind;
  identity: string;
  label: string;
  parentIdentity?: string;
  targetParentID?: number;
  scopedContext: WorkflowScopedSelectionContext;
  value: unknown;
}>;

export type PreparedWorkflowInputUnit = Readonly<{
  unitId: string;
  order: number;
  taskName: string;
  inputUnitIdentity: string;
  memberIdentities: ReadonlyArray<string>;
  memberCount: number;
  members: ReadonlyArray<WorkflowInputCandidate>;
  targetParentIdentity?: string;
  targetParentID?: number;
  selectionContext: WorkflowScopedSelectionContext;
}>;

type WorkflowInputPlanStats = Readonly<{
  candidates: Readonly<{
    total: number;
    accepted: number;
    skipped: number;
    reasons: Readonly<Record<string, number>>;
  }>;
  units: Readonly<{
    total: number;
    executable: number;
    skipped: number;
  }>;
}>;

export type WorkflowInputPlan = Readonly<{
  state: "enabled" | "disabled";
  reasonCode?: string;
  selectionCounts: Readonly<{
    parents: number;
    children: number;
    attachments: number;
    notes: number;
    total: number;
  }>;
  candidates: ReadonlyArray<WorkflowInputCandidate>;
  units: ReadonlyArray<PreparedWorkflowInputUnit>;
  stats: WorkflowInputPlanStats;
}>;

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value as object)) {
    return value;
  }
  seen.add(value as object);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested, seen);
  }
  return Object.freeze(value);
}

function itemIdentity(
  kind: WorkflowInputMemberKind,
  entry: unknown,
  fallback: number,
) {
  const typed =
    entry && typeof entry === "object"
      ? (entry as {
          item?: { id?: unknown; key?: unknown; libraryID?: unknown };
          noteItemID?: unknown;
          noteItemKey?: unknown;
          libraryID?: unknown;
        })
      : {};
  const key = String(
    typed.item?.key || typed.noteItemKey || "",
  ).trim();
  if (key) {
    const libraryID = String(
      typed.item?.libraryID || typed.libraryID || "",
    ).trim();
    return `${kind}:${libraryID ? `${libraryID}:` : ""}${key}`;
  }
  const id = Number(typed.item?.id || typed.noteItemID || 0);
  return id ? `${kind}-id:${id}` : `${kind}-index:${fallback}`;
}

function parentIdentityFromEntry(entry: unknown, kind: WorkflowInputMemberKind) {
  if (!entry || typeof entry !== "object") {
    return {};
  }
  const typed = entry as {
    item?: {
      id?: unknown;
      key?: unknown;
      libraryID?: unknown;
      parentItemID?: unknown;
    };
    parent?: { id?: unknown; key?: unknown; libraryID?: unknown };
    parentItemID?: unknown;
    parentItemKey?: unknown;
    libraryID?: unknown;
  };
  const ownParent =
    kind === "parent"
      ? {
          id: Number(typed.item?.id || 0),
          key: String(typed.item?.key || "").trim(),
          libraryID: typed.item?.libraryID,
        }
      : {
          id: Number(
            typed.parent?.id ||
              typed.item?.parentItemID ||
              typed.parentItemID ||
              0,
          ),
          key: String(
            typed.parent?.key || typed.parentItemKey || "",
          ).trim(),
          libraryID:
            typed.parent?.libraryID ||
            typed.item?.libraryID ||
            typed.libraryID,
        };
  if (ownParent.key) {
    const libraryID = String(ownParent.libraryID || "").trim();
    return {
      parentIdentity: `parent:${libraryID ? `${libraryID}:` : ""}${ownParent.key}`,
      ...(ownParent.id ? { targetParentID: ownParent.id } : {}),
    };
  }
  if (ownParent.id) {
    return {
      parentIdentity: `parent-id:${ownParent.id}`,
      targetParentID: ownParent.id,
    };
  }
  return {};
}

function entryLabel(
  entry: unknown,
  fallback: string,
  runtime: RuntimeLike,
) {
  if (!entry || typeof entry !== "object") {
    return fallback;
  }
  const typed = entry as {
    item?: { title?: unknown; data?: { title?: unknown } };
    parentTitle?: unknown;
    filePath?: unknown;
  };
  return (
    String(
      typed.item?.title ||
        typed.item?.data?.title ||
        typed.parentTitle ||
        "",
    ).trim() ||
    (typed.filePath ? getAttachmentFileName(entry as AttachmentLike, runtime) : "") ||
    fallback
  );
}

function scopeSingleEntry(args: {
  kind: WorkflowInputMemberKind;
  entry: unknown;
  selection: SelectionLike;
}) {
  if (args.kind === "selection") {
    return copySelection(args.selection);
  }
  const cloned = copySelection(args.selection);
  cloned.items = {
    parents: args.kind === "parent" ? [args.entry as ParentLike] : [],
    children:
      args.kind === "child"
        ? [
            args.entry as NonNullable<
              NonNullable<SelectionLike["items"]>["children"]
            >[number],
          ]
        : [],
    notes: args.kind === "note" ? [args.entry as NoteLike] : [],
    attachments:
      args.kind === "attachment"
        ? [args.entry as AttachmentLike]
        : [],
  };
  cloned.summary = {
    parentCount: args.kind === "parent" ? 1 : 0,
    childCount: args.kind === "child" ? 1 : 0,
    noteCount: args.kind === "note" ? 1 : 0,
    attachmentCount: args.kind === "attachment" ? 1 : 0,
  };
  cloned.selectionType = args.kind;
  return cloned;
}

function freezeCandidate(args: {
  kind: WorkflowInputMemberKind;
  entry: unknown;
  index: number;
  selection: SelectionLike;
  runtime: RuntimeLike;
  scopedContext?: SelectionLike;
  identity?: string;
  label?: string;
}) {
  const parent = parentIdentityFromEntry(args.entry, args.kind);
  const scopedContext = deepFreeze(
    args.scopedContext ||
      scopeSingleEntry({
        kind: args.kind,
        entry: args.entry,
        selection: args.selection,
      }),
  );
  return Object.freeze({
    kind: args.kind,
    identity:
      args.identity || itemIdentity(args.kind, args.entry, args.index),
    label:
      args.label ||
      entryLabel(args.entry, `${args.kind} ${args.index + 1}`, args.runtime),
    ...parent,
    scopedContext,
    value: deepFreeze(args.entry),
  });
}

function dedupeCandidates(candidates: WorkflowInputCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.identity)) {
      return false;
    }
    seen.add(candidate.identity);
    return true;
  });
}

function relatedEntries(
  kind: WorkflowInputMemberKind,
  selection: SelectionLike,
) {
  if (kind === "attachment") {
    return flattenAttachments(selection);
  }
  if (kind === "parent") {
    return collectLiteratureParentEntries(selection);
  }
  if (kind === "child") {
    return selection.items?.children || [];
  }
  if (kind === "note") {
    return [
      ...(selection.items?.notes || []),
      ...(selection.items?.parents || []).flatMap((entry) => entry.notes || []),
    ];
  }
  return [];
}

function selectedEntries(
  kind: WorkflowInputMemberKind,
  selection: SelectionLike,
) {
  if (kind === "parent") return selection.items?.parents || [];
  if (kind === "child") return selection.items?.children || [];
  if (kind === "attachment") return selection.items?.attachments || [];
  if (kind === "note") return selection.items?.notes || [];
  return [];
}

async function selectCandidates(args: {
  manifest: WorkflowManifest;
  selection: SelectionLike;
  runtime: RuntimeLike;
}) {
  const selector = args.manifest.validateSelection.select;
  const memberKind = args.manifest.inputs.member.kind;
  if (selector.policy === "selection") {
    return [
      freezeCandidate({
        kind: "selection",
        entry: args.selection,
        index: 0,
        selection: args.selection,
        runtime: args.runtime,
        identity: "selection:context",
        label: args.manifest.label,
      }),
    ];
  }
  if (selector.policy === "literature-source") {
    return collectSelectedLiteratureSources(args.selection, args.runtime).map(
      (entry, index) =>
        freezeCandidate({
          kind: "attachment",
          entry,
          index,
          selection: args.selection,
          runtime: args.runtime,
        }),
    );
  }
  if (selector.policy === "generated-note-candidates") {
    const selected = await selectGeneratedNoteCandidates(
      args.selection,
      args.runtime,
    );
    const context = selected.contexts[0];
    const entries = Array.isArray(context?.exportCandidates)
      ? (context.exportCandidates as Array<Record<string, unknown>>)
      : [];
    return entries.map((entry, index) => {
      const scopedContext = copySelection(context);
      scopedContext.exportCandidates = [entry];
      return freezeCandidate({
        kind: "generated-note",
        entry,
        index,
        selection: args.selection,
        runtime: args.runtime,
        scopedContext,
        label: String(entry.parentTitle || `Generated note ${index + 1}`),
      });
    });
  }
  if (selector.policy === "digest-representative-image") {
    const selected = await selectDigestRepresentativeImage(
      args.selection,
      args.runtime,
    );
    return selected.contexts.flatMap((context, index) => {
      const entry = context.digestRepresentativeImageTarget;
      if (!entry || typeof entry !== "object") {
        return [];
      }
      return [
        freezeCandidate({
          kind: "digest-image-target",
          entry,
          index,
          selection: args.selection,
          runtime: args.runtime,
          scopedContext: context,
          label: entryLabel(
            entry,
            `Digest image target ${index + 1}`,
            args.runtime,
          ),
        }),
      ];
    });
  }
  const entries =
    selector.source === "related"
      ? relatedEntries(memberKind, args.selection)
      : selectedEntries(memberKind, args.selection);
  return dedupeCandidates(
    entries.map((entry, index) =>
      freezeCandidate({
        kind: memberKind,
        entry,
        index,
        selection: args.selection,
        runtime: args.runtime,
      }),
    ),
  );
}

function recordSkip(
  candidate: WorkflowInputCandidate,
  reason: string,
  skipped: Map<string, string>,
) {
  if (!skipped.has(candidate.identity)) {
    skipped.set(candidate.identity, reason);
  }
}

function candidateParentID(candidate: WorkflowInputCandidate) {
  return candidate.targetParentID || 0;
}

async function applyCandidateFilters(args: {
  candidates: WorkflowInputCandidate[];
  rootArgs: EvaluateWorkflowSelectionArgs;
  manifest: WorkflowManifest;
  runtime: RuntimeLike;
  skipped: Map<string, string>;
}) {
  let current = [...args.candidates];
  for (const filter of args.manifest.validateSelection.filters) {
    if (filter.phase === "execute" && args.rootArgs.mode === "menu") {
      continue;
    }
    if (filter.kind === "candidates-per-parent") {
      const counts = new Map<string, number>();
      for (const candidate of current) {
        if (!candidate.parentIdentity) continue;
        counts.set(
          candidate.parentIdentity,
          (counts.get(candidate.parentIdentity) || 0) + 1,
        );
      }
      current = current.filter((candidate) => {
        const count = candidate.parentIdentity
          ? counts.get(candidate.parentIdentity) || 0
          : 0;
        const accepted =
          !!candidate.parentIdentity && matchesCountRule(count, filter.counts);
        if (!accepted) {
          recordSkip(
            candidate,
            candidate.parentIdentity
              ? "candidates-per-parent"
              : "missing-parent",
            args.skipped,
          );
        }
        return accepted;
      });
      continue;
    }
    const accepted: WorkflowInputCandidate[] = [];
    for (const candidate of current) {
      let keep = true;
      const attachment = candidate.value as AttachmentLike;
      if (filter.kind === "source-file-exists") {
        const sourcePath = await resolveAttachmentSourcePath(
          attachment,
          args.runtime,
        );
        keep = !!sourcePath && (await fileExists(sourcePath, args.runtime));
      } else if (filter.kind === "generated-note-kinds-absent") {
        const parentID = candidateParentID(candidate);
        keep =
          !!parentID &&
          !(await parentHasAllGeneratedNotes(
            parentID,
            filter.noteKinds,
            args.runtime,
          ));
      } else if (filter.kind === "generated-note-readiness") {
        const parentID = candidateParentID(candidate);
        const parentItem = parentID ? resolveItem(args.runtime, parentID) : null;
        keep =
          !!parentItem &&
          (
            await evaluateGeneratedNoteReadiness(parentItem, filter)
          ).accepted;
      } else if (filter.kind === "artifact-absent") {
        keep =
          (
            await filterArtifactConflicts(
              [attachment],
              {
                ...args.rootArgs,
                manifest: {
                  ...args.manifest,
                  validateSelection: {
                    ...args.manifest.validateSelection,
                    filters: [filter],
                  },
                },
              },
              args.runtime,
            )
          ).length === 1;
      }
      if (keep) {
        accepted.push(candidate);
      } else {
        recordSkip(candidate, filter.kind, args.skipped);
      }
    }
    current = accepted;
  }
  return current;
}

function mergeScopedContexts(
  candidates: ReadonlyArray<WorkflowInputCandidate>,
) {
  const merged = copySelection(candidates[0]?.scopedContext || {});
  const arrays: Record<
    "parents" | "children" | "attachments" | "notes",
    unknown[]
  > = {
    parents: [],
    children: [],
    attachments: [],
    notes: [],
  };
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const items = candidate.scopedContext.items || {};
    for (const kind of Object.keys(arrays) as Array<keyof typeof arrays>) {
      for (const entry of items[kind] || []) {
        const identity = itemIdentity(
          kind === "parents"
            ? "parent"
            : kind === "children"
              ? "child"
              : kind === "attachments"
                ? "attachment"
                : "note",
          entry,
          arrays[kind].length,
        );
        const key = `${kind}:${identity}`;
        if (seen.has(key)) continue;
        seen.add(key);
        arrays[kind].push(entry);
      }
    }
  }
  merged.items = {
    parents: arrays.parents as ParentLike[],
    children: arrays.children as NonNullable<
      NonNullable<SelectionLike["items"]>["children"]
    >,
    attachments: arrays.attachments as AttachmentLike[],
    notes: arrays.notes as NoteLike[],
  };
  merged.summary = {
    parentCount: arrays.parents.length,
    childCount: arrays.children.length,
    attachmentCount: arrays.attachments.length,
    noteCount: arrays.notes.length,
  };
  const generated = candidates
    .filter((candidate) => candidate.kind === "generated-note")
    .map((candidate) => candidate.value);
  if (generated.length > 0) {
    merged.exportCandidates = generated;
  }
  const digest = candidates.find(
    (candidate) => candidate.kind === "digest-image-target",
  );
  if (digest) {
    merged.digestRepresentativeImageTarget = digest.value;
  }
  return deepFreeze(merged);
}

function freezeUnit(args: {
  candidates: WorkflowInputCandidate[];
  order: number;
  taskName: string;
  targetParentIdentity?: string;
  targetParentID?: number;
}) {
  const members = Object.freeze([...args.candidates]);
  const memberIdentities = Object.freeze(
    members.map((candidate) => candidate.identity),
  );
  return Object.freeze({
    unitId: `unit-${args.order + 1}`,
    order: args.order,
    taskName: args.taskName,
    inputUnitIdentity:
      memberIdentities.length === 1
        ? memberIdentities[0]
        : `group:${memberIdentities.join("+")}`,
    memberIdentities,
    memberCount: members.length,
    members,
    ...(args.targetParentIdentity
      ? { targetParentIdentity: args.targetParentIdentity }
      : {}),
    ...(args.targetParentID ? { targetParentID: args.targetParentID } : {}),
    selectionContext: mergeScopedContexts(members),
  });
}

function groupCandidates(args: {
  candidates: WorkflowInputCandidate[];
  manifest: WorkflowManifest;
  skipped: Map<string, string>;
}) {
  const mode = args.manifest.inputs.grouping.mode;
  if (mode === "each") {
    return args.candidates.map((candidate, order) =>
      freezeUnit({
        candidates: [candidate],
        order,
        taskName: candidate.label,
        targetParentIdentity: candidate.parentIdentity,
        targetParentID: candidate.targetParentID,
      }),
    );
  }
  if (mode === "all") {
    if (args.candidates.length === 0) return [];
    const parentIdentities = new Set(
      args.candidates.map((candidate) => candidate.parentIdentity),
    );
    const targetParentIdentity =
      parentIdentities.size === 1
        ? args.candidates[0].parentIdentity
        : undefined;
    const targetParentID =
      targetParentIdentity &&
      args.candidates.every(
        (candidate) =>
          candidate.targetParentID === args.candidates[0].targetParentID,
      )
        ? args.candidates[0].targetParentID
        : undefined;
    return [
      freezeUnit({
        candidates: args.candidates,
        order: 0,
        taskName: args.manifest.label,
        targetParentIdentity,
        targetParentID,
      }),
    ];
  }
  const groups = new Map<
    string,
    {
      members: WorkflowInputCandidate[];
      targetParentID?: number;
      label: string;
    }
  >();
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
      targetParentID: candidate.targetParentID,
      label:
        candidate.kind === "parent"
          ? candidate.label
          : String(
              (candidate.value as { parent?: { title?: unknown } }).parent
                ?.title || candidate.label,
            ),
    });
  }
  return Array.from(groups.entries()).map(
    ([targetParentIdentity, group], order) =>
      freezeUnit({
        candidates: group.members,
        order,
        taskName: group.label,
        targetParentIdentity,
        targetParentID: group.targetParentID,
      }),
  );
}

function buildReasonCounts(skipped: Map<string, string>) {
  const counts: Record<string, number> = {};
  for (const reason of skipped.values()) {
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return Object.freeze(counts);
}

function freezePlan(args: {
  state: "enabled" | "disabled";
  reasonCode?: string;
  selectionCounts: WorkflowInputPlan["selectionCounts"];
  candidates: WorkflowInputCandidate[];
  units: PreparedWorkflowInputUnit[];
  totalCandidates: number;
  skipped: Map<string, string>;
}) {
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
        skipped: Math.max(
          args.skipped.size,
          args.totalCandidates - candidates.length,
        ),
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

export async function planWorkflowInput(
  args: EvaluateWorkflowSelectionArgs,
): Promise<WorkflowInputPlan> {
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
  const skipped = new Map<string, string>();

  if (
    args.mode !== "handoff" &&
    !hasAnySelectionItems(selection) &&
    manifest.trigger.requiresSelection
  ) {
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
  const requiredError =
    args.mode === "handoff"
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
      const accepted =
        candidate.kind === "attachment" &&
        applyAttachmentMimeFilter(
          [candidate.value as AttachmentLike],
          acceptedMimes,
        ).length === 1;
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
  if (
    args.mode !== "handoff" &&
    !matchesCountRule(
      candidates.length,
      manifest.validateSelection.require?.candidates,
    )
  ) {
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
  const acceptedIdentities = new Set(
    units.flatMap((unit) => unit.memberIdentities),
  );
  candidates = candidates.filter((candidate) =>
    acceptedIdentities.has(candidate.identity),
  );
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

export async function evaluateWorkflowSelection(
  args: EvaluateWorkflowSelectionArgs,
): Promise<WorkflowSelectionValidationResult> {
  const plan = await planWorkflowInput(args);
  return {
    state: plan.state,
    reasonCode: plan.reasonCode,
    scopedSelectionContexts: plan.units.map(
      (unit) => unit.selectionContext,
    ),
    stats: {
      totalUnits: plan.stats.candidates.total,
      validUnits: plan.units.length,
      skippedUnits: plan.stats.candidates.skipped,
    },
  };
}
