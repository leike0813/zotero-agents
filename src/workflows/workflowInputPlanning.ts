import { createHookHelpers } from "./helpers";
import { createWorkflowHostApi } from "./hostApi";
import { resolveWorkflowHostContractVersion } from "./workflowHostContract";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import {
  resolveRuntimeAddon,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import { PASS_THROUGH_BACKEND_TYPE } from "../config/defaults";
import { handlers } from "../handlers";
import { resolveWorkflowDisplayLocale } from "./localization";
import {
  evaluateGeneratedNoteFactsReadiness,
  type LibraryArtifactGeneratedNoteFacts,
} from "../modules/libraryArtifactReadiness";
import type {
  LoadedWorkflow,
  WorkflowInputMemberKind,
  WorkflowManifest,
  WorkflowRuntimeContext,
  WorkflowRuntimeInfrastructureContext,
  WorkflowSelectionFilter,
  WorkflowValidateSelectionSpec,
} from "./types";
import type { WorkflowRunOptions } from "./zoteroHostAccessOptions";
import {
  attachmentSelectionFact,
  buildSelectionContext,
  itemRefIdentity,
  lockSelection,
  selectionCounts,
  type SelectionContext,
  type SelectionItemFact,
  type GeneratedNoteCandidate,
} from "../modules/selectionContext";
import type { PortableItemRef } from "./types";

type AttachmentLike = SelectionItemFact;
type SelectionLike = SelectionContext;

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
  runtime?: Partial<WorkflowRuntimeInfrastructureContext>;
};

type RuntimeLike = WorkflowRuntimeInfrastructureContext;

type WorkflowArtifactAbsentRule = Extract<
  WorkflowSelectionFilter,
  { kind: "artifact-absent" }
>;

function createSelectionRuntime(
  override?: Partial<WorkflowRuntimeInfrastructureContext>,
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
        : ((resolveRuntimeAddon() as WorkflowRuntimeInfrastructureContext["addon"]) ??
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

function copySelection(value: unknown): SelectionLike {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as SelectionLike).items)
  ) {
    throw new Error("Canonical locked selection is required");
  }
  return JSON.parse(JSON.stringify(value)) as SelectionLike;
}
function getSelectionItemCounts(selection: SelectionLike) {
  return selectionCounts(selection);
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

function getAttachmentFileName(entry: AttachmentLike) {
  return entry.filename || "";
}
function getAttachmentFileStem(entry: AttachmentLike) {
  return getAttachmentFileName(entry)
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
}
function isMarkdownAttachment(entry: AttachmentLike) {
  return (
    ["text/markdown", "text/x-markdown"].includes(entry.contentType || "") ||
    /\.md$/i.test(entry.filename || "")
  );
}
function isPdfAttachment(entry: AttachmentLike) {
  return (
    entry.contentType === "application/pdf" ||
    /\.pdf$/i.test(entry.filename || "")
  );
}
function applyAttachmentMimeFilter(
  attachments: AttachmentLike[],
  mimes?: string[],
) {
  if (!mimes?.length) return attachments;
  return attachments.filter(
    (entry) =>
      mimes.includes(entry.contentType || "") ||
      (/\.md$/i.test(entry.filename || "") &&
        mimes.some((mime) =>
          ["text/markdown", "text/x-markdown", "text/plain"].includes(mime),
        )) ||
      (/\.pdf$/i.test(entry.filename || "") &&
        mimes.includes("application/pdf")),
  );
}
async function readAttachments(ref: PortableItemRef, runtime: RuntimeLike) {
  const result: AttachmentLike[] = [];
  let cursor: string | undefined;
  do {
    const page = await runtime.hostApi.library.getItemAttachments(ref, {
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    result.push(...page.attachments.map(attachmentSelectionFact));
    if (!page.hasMore) return result;
    if (!page.nextCursor || cursor === page.nextCursor)
      throw new Error("Invalid attachment continuation");
    cursor = page.nextCursor;
  } while (cursor);
  return result;
}
async function hydrateSelected(item: SelectionItemFact, runtime: RuntimeLike) {
  if (item.kind !== "attachment" || item.filename !== undefined) return item;
  const detail = await runtime.hostApi.library.getItemDetail(item.ref);
  if (detail.kind !== "attachment")
    throw new Error("Selected attachment changed kind");
  return attachmentSelectionFact(detail.item);
}
async function regularParent(
  item: SelectionItemFact,
  runtime: RuntimeLike,
): Promise<SelectionItemFact | null> {
  if (item.kind === "parent") return item;
  let ref = item.parentRef;
  const seen = new Set<string>();
  while (ref && !seen.has(itemRefIdentity(ref))) {
    seen.add(itemRefIdentity(ref));
    const fact = (await buildSelectionContext([ref], runtime.hostApi)).items[0];
    if (fact.kind === "parent") return fact;
    ref = fact.parentRef;
  }
  return null;
}
function compareByDateAndName(a: AttachmentLike, b: AttachmentLike) {
  const delta =
    (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
  return (
    delta || getAttachmentFileName(a).localeCompare(getAttachmentFileName(b))
  );
}
function chooseLiteratureSourceByPolicy(entries: AttachmentLike[]) {
  const md = entries.filter(isMarkdownAttachment);
  const pdf = entries.filter(isPdfAttachment).sort(compareByDateAndName);
  if (md.length === 1) return md[0];
  if (md.length > 1)
    return (
      (pdf[0] &&
        md.find(
          (item) =>
            getAttachmentFileStem(item) === getAttachmentFileStem(pdf[0]),
        )) ||
      md.sort(compareByDateAndName)[0]
    );
  return pdf[0] || null;
}
async function collectSelectedLiteratureSources(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const parents = selection.items.filter((item) => item.kind === "parent");
  const selectedParents = new Set(
    parents.map((item) => itemRefIdentity(item.ref)),
  );
  const groups = new Map<string, AttachmentLike[]>();
  for (const parent of parents)
    groups.set(
      itemRefIdentity(parent.ref),
      await readAttachments(parent.ref, runtime),
    );
  for (const fact of selection.items.filter(
    (item) => item.kind === "attachment",
  )) {
    const entry = await hydrateSelected(fact, runtime);
    if (!entry.parentRef) continue;
    const key = itemRefIdentity(entry.parentRef);
    if (selectedParents.has(key)) continue;
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(chooseLiteratureSourceByPolicy)
    .filter((entry): entry is AttachmentLike => !!entry);
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

async function readNotes(
  parentRef: PortableItemRef,
  runtime: RuntimeLike,
): Promise<GeneratedNoteCandidate[]> {
  return (await readGeneratedNoteFacts(parentRef, runtime)).map((note) => ({
    ref: { libraryId: parentRef.libraryId, key: note.key },
    parentRef,
    noteKind:
      parseGeneratedNoteKind(note.html) ||
      note.payloadBlocks.find((block) => !block.errors?.length)?.noteKind ||
      "custom",
  }));
}
async function parentHasAllGeneratedNotes(
  parentRef: PortableItemRef,
  kinds: string[],
  runtime: RuntimeLike,
) {
  const notes = await readNotes(parentRef, runtime);
  return kinds.every((kind) => notes.some((note) => note.noteKind === kind));
}

async function readGeneratedNoteFacts(
  parentRef: PortableItemRef,
  runtime: RuntimeLike,
) {
  const facts: LibraryArtifactGeneratedNoteFacts[] = [];
  let cursor: string | undefined;
  do {
    const page = await runtime.hostApi.library.getItemNotes(parentRef, {
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    for (const note of page.notes) {
      const detail = await runtime.hostApi.library.getNoteDetail(note.ref, {
        format: "html",
      });
      const payloadBlocks: LibraryArtifactGeneratedNoteFacts["payloadBlocks"] =
        [];
      let payloadCursor: string | undefined;
      do {
        const payloadPage = await runtime.hostApi.library.listNotePayloads(
          note.ref,
          { limit: 100, ...(payloadCursor ? { cursor: payloadCursor } : {}) },
        );
        for (const summary of payloadPage.payloads) {
          const value = summary.issues.length
            ? undefined
            : await runtime.hostApi.library.getNotePayload(note.ref, {
                payloadType: summary.payloadType,
              });
          payloadBlocks.push({
            payloadType: summary.payloadType,
            noteKind: summary.noteKind,
            version: summary.version,
            encoding: summary.encoding,
            encodedValue: "",
            estimatedSize: summary.estimatedBytes,
            format: summary.format,
            payload: value?.value,
            errors: summary.issues.map((issue) => issue.code),
          });
        }
        if (!payloadPage.hasMore) break;
        if (!payloadPage.nextCursor || payloadCursor === payloadPage.nextCursor)
          throw new Error("Invalid payload continuation");
        payloadCursor = payloadPage.nextCursor;
      } while (payloadCursor);
      facts.push({
        key: note.ref.key,
        title: detail.title,
        html: detail.content,
        updatedAt: detail.revision,
        payloadBlocks,
      });
    }
    if (!page.hasMore) return facts;
    if (!page.nextCursor || cursor === page.nextCursor)
      throw new Error("Invalid note continuation");
    cursor = page.nextCursor;
  } while (cursor);
  return facts;
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
  const detail = await runtime.hostApi.library.getItemDetail(entry.ref);
  return detail.kind === "attachment" && detail.item.file.state === "available"
    ? detail.item.file.path
    : "";
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
    return !!path && (await runtime.hostApi.file.exists(toNativePath(path)));
  } catch {
    return false;
  }
}

async function filterArtifactConflicts(
  attachments: AttachmentLike[],
  args: EvaluateWorkflowSelectionArgs,
  runtime: RuntimeLike,
) {
  const artifactRules = (
    args.manifest || args.workflow?.manifest
  )?.validateSelection?.filters?.filter(
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

async function selectGeneratedNoteCandidates(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const notes = new Map<string, GeneratedNoteCandidate>();
  for (const item of selection.items) {
    if (item.kind === "parent") {
      for (const note of await readNotes(item.ref, runtime))
        notes.set(itemRefIdentity(note.ref), {
          ...note,
          parentTitle: item.title,
        });
    } else if (item.kind === "note") {
      const detail = await runtime.hostApi.library.getNoteDetail(item.ref, {
        format: "html",
      });
      notes.set(itemRefIdentity(item.ref), {
        ref: item.ref,
        ...(item.parentRef ? { parentRef: item.parentRef } : {}),
        noteKind: parseGeneratedNoteKind(detail.content) || "custom",
      });
    }
  }
  return [...notes.values()];
}
async function selectDigestRepresentativeImage(
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  if (selection.items.length !== 1) return null;
  const item = selection.items[0];
  if (item.kind === "parent") {
    const notes = (await readNotes(item.ref, runtime)).filter(
      (note) => note.noteKind === "digest",
    );
    return notes.length === 1 ? { ...notes[0], parentTitle: item.title } : null;
  }
  if (item.kind !== "note" || !item.parentRef) return null;
  const detail = await runtime.hostApi.library.getNoteDetail(item.ref, {
    format: "html",
  });
  return parseGeneratedNoteKind(detail.content) === "digest"
    ? { ref: item.ref, parentRef: item.parentRef, noteKind: "digest" }
    : null;
}

export type WorkflowInputCandidate = Readonly<{
  kind: WorkflowInputMemberKind;
  identity: string;
  label: string;
  parentIdentity?: string;
  targetParentRef?: PortableItemRef;
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
  targetParentRef?: PortableItemRef;
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
  if (kind === "selection") return "selection:context";
  return `${kind}:${itemRefIdentity((entry as SelectionItemFact).ref)}`;
}
function parentIdentityFromEntry(
  entry: unknown,
  kind: WorkflowInputMemberKind,
) {
  const fact = entry as SelectionItemFact;
  const ref = kind === "parent" ? fact.ref : fact.parentRef;
  return ref
    ? { parentIdentity: `parent:${itemRefIdentity(ref)}`, targetParentRef: ref }
    : {};
}
function entryLabel(entry: unknown, fallback: string) {
  const fact = entry as SelectionItemFact & { parentTitle?: string };
  return fact.title || fact.filename || fact.parentTitle || fallback;
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
}): WorkflowInputCandidate {
  const scopedContext =
    args.scopedContext ||
    (args.kind === "selection"
      ? args.selection
      : lockSelection(
          [args.entry as SelectionItemFact],
          args.selection.sampledAt,
        ));
  return Object.freeze({
    kind: args.kind,
    identity: args.identity || itemIdentity(args.kind, args.entry, args.index),
    label:
      args.label || entryLabel(args.entry, `${args.kind} ${args.index + 1}`),
    ...parentIdentityFromEntry(args.entry, args.kind),
    scopedContext: deepFreeze(scopedContext),
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

async function relatedEntries(
  kind: WorkflowInputMemberKind,
  selection: SelectionLike,
  runtime: RuntimeLike,
) {
  const entries: SelectionItemFact[] = [];
  for (const item of selection.items) {
    if (kind === "parent") {
      const parent = await regularParent(item, runtime);
      if (parent) entries.push(parent);
    } else if (kind === "attachment") {
      if (item.kind === "attachment")
        entries.push(await hydrateSelected(item, runtime));
      else if (item.kind === "parent")
        entries.push(...(await readAttachments(item.ref, runtime)));
    } else if (kind === "note") {
      if (item.kind === "note") entries.push(item);
      else if (item.kind === "parent") {
        for (const note of await readNotes(item.ref, runtime))
          entries.push({
            kind: "note",
            itemType: "note",
            ref: note.ref,
            parentRef: item.ref,
          });
      }
    } else if (kind === item.kind) entries.push(item);
  }
  return entries;
}
async function selectCandidates(args: {
  manifest: WorkflowManifest;
  selection: SelectionLike;
  runtime: RuntimeLike;
}) {
  const selector = args.manifest.validateSelection.select;
  const kind = args.manifest.inputs.member.kind;
  const freeze = (
    entry: unknown,
    index: number,
    memberKind = kind,
    scopedContext?: SelectionLike,
  ) =>
    freezeCandidate({
      kind: memberKind,
      entry,
      index,
      selection: args.selection,
      runtime: args.runtime,
      scopedContext,
    });
  if (selector.policy === "selection") return [freeze(args.selection, 0)];
  if (selector.policy === "literature-source")
    return (
      await collectSelectedLiteratureSources(args.selection, args.runtime)
    ).map((entry, index) => freeze(entry, index, "attachment"));
  if (selector.policy === "generated-note-candidates") {
    return (
      await selectGeneratedNoteCandidates(args.selection, args.runtime)
    ).map((entry, index) =>
      freeze(entry, index, "generated-note", {
        ...lockSelection(
          [
            {
              kind: "note",
              itemType: "note",
              ref: entry.ref,
              ...(entry.parentRef ? { parentRef: entry.parentRef } : {}),
            },
          ],
          args.selection.sampledAt,
        ),
        exportCandidates: [entry],
      }),
    );
  }
  if (selector.policy === "digest-representative-image") {
    const entry = await selectDigestRepresentativeImage(
      args.selection,
      args.runtime,
    );
    return entry
      ? [
          freeze(entry, 0, "digest-image-target", {
            ...args.selection,
            digestRepresentativeImageTarget: entry,
          }),
        ]
      : [];
  }
  const entries =
    selector.source === "related"
      ? await relatedEntries(kind, args.selection, args.runtime)
      : await Promise.all(
          args.selection.items
            .filter((item) => item.kind === kind)
            .map((item) => hydrateSelected(item, args.runtime)),
        );
  return dedupeCandidates(entries.map((entry, index) => freeze(entry, index)));
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

function candidateParentRef(candidate: WorkflowInputCandidate) {
  return candidate.targetParentRef;
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
        const parentRef = candidateParentRef(candidate);
        keep =
          !!parentRef &&
          !(await parentHasAllGeneratedNotes(
            parentRef,
            filter.noteKinds,
            args.runtime,
          ));
      } else if (filter.kind === "generated-note-readiness") {
        const parentRef = candidateParentRef(candidate);
        keep =
          !!parentRef &&
          (
            await evaluateGeneratedNoteFactsReadiness(
              await readGeneratedNoteFacts(parentRef, args.runtime),
              filter,
            )
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
  if (candidates.length === 1 && candidates[0].kind === "selection") {
    return candidates[0].scopedContext;
  }
  const items = new Map<string, SelectionItemFact>();
  for (const candidate of candidates)
    for (const item of candidate.scopedContext.items) {
      const key = itemRefIdentity(item.ref);
      if (!items.has(key)) items.set(key, item);
    }
  const generated = candidates
    .filter((item) => item.kind === "generated-note")
    .map((item) => item.value as GeneratedNoteCandidate);
  const digest = candidates.find((item) => item.kind === "digest-image-target");
  return deepFreeze({
    ...lockSelection(
      [...items.values()],
      candidates[0]?.scopedContext.sampledAt,
    ),
    ...(generated.length ? { exportCandidates: generated } : {}),
    ...(digest
      ? {
          digestRepresentativeImageTarget:
            digest.value as GeneratedNoteCandidate,
        }
      : {}),
  });
}

function freezeUnit(args: {
  candidates: WorkflowInputCandidate[];
  order: number;
  taskName: string;
  targetParentIdentity?: string;
  targetParentRef?: PortableItemRef;
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
    ...(args.targetParentRef ? { targetParentRef: args.targetParentRef } : {}),
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
        targetParentRef: candidate.targetParentRef,
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
    const targetParentRef =
      targetParentIdentity &&
      args.candidates.every(
        (candidate) =>
          candidate.targetParentRef &&
          args.candidates[0].targetParentRef &&
          itemRefIdentity(candidate.targetParentRef) ===
            itemRefIdentity(args.candidates[0].targetParentRef),
      )
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
  const groups = new Map<
    string,
    {
      members: WorkflowInputCandidate[];
      targetParentRef?: PortableItemRef;
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
      targetParentRef: candidate.targetParentRef,
      label:
        candidate.kind === "parent"
          ? candidate.label
          : String(
              (candidate.value as { parentTitle?: string }).parentTitle ||
                candidate.label,
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
        targetParentRef: group.targetParentRef,
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
    scopedSelectionContexts: plan.units.map((unit) => unit.selectionContext),
    stats: {
      totalUnits: plan.stats.candidates.total,
      validUnits: plan.units.length,
      skippedUnits: plan.stats.candidates.skipped,
    },
  };
}
