import { handlers } from "../handlers";
import { getBaseName } from "../utils/path";
import { createHookHelpers } from "./helpers";
import { compileDeclarativeRequest } from "./declarativeRequestCompiler";
import {
  resolveRuntimeAddon,
  resolveRuntimeHostCapabilities,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import {
  PASS_THROUGH_BACKEND_TYPE,
  PASS_THROUGH_REQUEST_KIND,
} from "../config/defaults";
import { isDebugModeEnabled } from "../modules/debugMode";
import {
  emitWorkflowPackageDiagnostic,
  summarizeWorkflowRuntimeCapabilities,
} from "../modules/workflowPackageDiagnostics";
import {
  createWorkflowHostApi,
  summarizeWorkflowHostApiCapabilities,
  WORKFLOW_HOST_API_VERSION,
} from "./hostApi";
import { assertRequestPayloadContract } from "../providers/requestContracts";
import {
  attachWorkflowHookFailureMeta,
  summarizeWorkflowExecutionError,
} from "./errorMeta";
import { canWorkflowRunWithoutSelection } from "./triggerPolicy";
import { measureAsyncTestPerformanceSpan } from "../modules/testPerformanceProbeBridge";
import type {
  LoadedWorkflow,
  WorkflowResultContext,
  WorkflowRuntimeContext,
} from "./types";
import type { WorkflowRunOptions } from "./zoteroHostAccessOptions";
import { createProductStorageApi } from "../modules/workflowProductStore";
import {
  SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
  buildZoteroHostAccessRuntimeOptions,
  stripZoteroHostAccessRuntimeParams,
} from "./zoteroHostAccessOptions";

type AttachmentLike = {
  item?: {
    id?: number;
    title?: string;
    parentItemID?: number | null;
    data?: { contentType?: string };
  };
  filePath?: string | null;
  mimeType?: string | null;
  parent?: { id?: number | null; title?: string } | null;
};

type ParentLike = {
  item?: { id?: number; title?: string };
};

type NoteLike = {
  item?: { id?: number; title?: string };
  parent?: { id?: number | null; title?: string } | null;
};

type SelectionLike = {
  items?: {
    attachments?: AttachmentLike[];
    parents?: Array<ParentLike & { attachments?: AttachmentLike[] }>;
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
};

type ResolvedSelectionContexts = {
  contexts: SelectionLike[];
  totalUnits: number;
};

type BuildRequestStats = {
  totalUnits: number;
  requestCount: number;
  skippedUnits: number;
};

type BuildRequestsResult = unknown[] & {
  __stats?: BuildRequestStats;
};

type NoValidInputUnitsError = Error & {
  code: "NO_VALID_INPUT_UNITS";
  workflowId: string;
  totalUnits: number;
  skippedUnits: number;
};

const GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY =
  "__zsCurrentWorkflowExecutionRuntime";
let workflowRuntimeScopeTail: Promise<void> = Promise.resolve();

function createNoValidInputUnitsError(args: {
  workflowId: string;
  totalUnits: number;
}): NoValidInputUnitsError {
  const error = new Error(
    `Workflow ${args.workflowId} has no valid input units after filtering`,
  ) as NoValidInputUnitsError;
  error.name = "NoValidInputUnitsError";
  error.code = "NO_VALID_INPUT_UNITS";
  error.workflowId = args.workflowId;
  error.totalUnits = Math.max(0, Number(args.totalUnits || 0));
  error.skippedUnits = error.totalUnits;
  return error;
}

function resolveTargetParentIDFromSelection(selectionContext: SelectionLike) {
  const attachmentParentID = selectionContext?.items?.attachments?.[0]?.parent?.id;
  if (attachmentParentID) {
    return attachmentParentID;
  }
  const selectedParentID = selectionContext?.items?.parents?.[0]?.item?.id;
  if (selectedParentID) {
    return selectedParentID;
  }
  const childParentID = selectionContext?.items?.children?.[0]?.parent?.id;
  if (childParentID) {
    return childParentID;
  }
  const childID = selectionContext?.items?.children?.[0]?.item?.id;
  if (childID) {
    return childID;
  }
  const noteParentID = selectionContext?.items?.notes?.[0]?.parent?.id;
  if (noteParentID) {
    return noteParentID;
  }
  const noteID = selectionContext?.items?.notes?.[0]?.item?.id;
  if (noteID) {
    return noteID;
  }
  return null;
}

function resolveSourceAttachmentPathsFromSelection(selectionContext: SelectionLike) {
  const paths = collectAttachmentCandidates(selectionContext)
    .map((entry) => String(entry.filePath || "").trim())
    .filter(Boolean);
  return Array.from(new Set(paths));
}

function resolveTaskNameFromSelection(args: {
  selectionContext: SelectionLike;
  targetParentID: number | null;
  sourceAttachmentPaths: string[];
}) {
  if (args.sourceAttachmentPaths.length > 0) {
    return getBaseName(args.sourceAttachmentPaths[0]);
  }
  const parentTitle =
    args.selectionContext?.items?.attachments?.[0]?.parent?.title ||
    args.selectionContext?.items?.parents?.[0]?.item?.title ||
    args.selectionContext?.items?.children?.[0]?.parent?.title ||
    args.selectionContext?.items?.children?.[0]?.item?.title ||
    args.selectionContext?.items?.notes?.[0]?.parent?.title ||
    args.selectionContext?.items?.notes?.[0]?.item?.title ||
    "";
  if (String(parentTitle || "").trim()) {
    return String(parentTitle).trim();
  }
  if (args.targetParentID) {
    return `item-${args.targetParentID}`;
  }
  return "task";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveSkillRunnerExecutionMode(manifest: LoadedWorkflow["manifest"]) {
  const provider = String(manifest.provider || "").trim();
  const requestKind = String(manifest.request?.kind || "").trim();
  if (provider !== "skillrunner" && requestKind !== "skillrunner.job.v1") {
    return "";
  }
  return String(manifest.execution?.skillrunner_mode || "").trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
}

function resolveWorkflowRequiredMcpTools(manifest: LoadedWorkflow["manifest"]) {
  return normalizeStringArray(manifest.execution?.mcp?.requiredTools);
}

function withInjectedSkillRunnerExecutionMode(args: {
  workflow: LoadedWorkflow;
  requestKind: string;
  request: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
}) {
  if (args.requestKind !== "skillrunner.job.v1") {
    return args.request;
  }
  const executionMode = resolveSkillRunnerExecutionMode(args.workflow.manifest);
  const requiredTools = resolveWorkflowRequiredMcpTools(args.workflow.manifest);
  if (!isObjectRecord(args.request)) {
    return args.request;
  }
  const next = {
    ...args.request,
  };
  const runtimeOptions = isObjectRecord(next.runtime_options)
    ? {
        ...next.runtime_options,
      }
    : {};
  if (executionMode) {
    runtimeOptions.execution_mode = executionMode;
  }
  if (requiredTools.length > 0) {
    runtimeOptions.workflow_mcp = {
      required_tools: requiredTools,
    };
  }
  if (isObjectRecord(next.parameter)) {
    next.parameter = stripZoteroHostAccessRuntimeParams(
      next.parameter as Record<string, unknown>,
    );
  }
  if (SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS) {
    runtimeOptions.zotero_host_access = buildZoteroHostAccessRuntimeOptions({
      manifest: args.workflow.manifest,
      runOptions: args.executionOptions?.runOptions,
    });
  }
  if (Object.keys(runtimeOptions).length > 0) {
    next.runtime_options = runtimeOptions;
  } else {
    delete next.runtime_options;
  }
  return next;
}

function enrichRequestWithSelectionMeta(
  request: unknown,
  selectionContext: SelectionLike,
) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("buildRequest must return an object request payload");
  }
  const normalized = {
    ...(request as Record<string, unknown>),
  };
  const targetParentID = resolveTargetParentIDFromSelection(selectionContext);
  if (typeof normalized.targetParentID !== "number" && targetParentID) {
    normalized.targetParentID = targetParentID;
  }

  const sourceAttachmentPaths =
    Array.isArray(normalized.sourceAttachmentPaths) &&
    normalized.sourceAttachmentPaths.length > 0
      ? normalized.sourceAttachmentPaths
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : resolveSourceAttachmentPathsFromSelection(selectionContext);
  normalized.sourceAttachmentPaths = sourceAttachmentPaths;

  const taskName =
    typeof normalized.taskName === "string" ? normalized.taskName.trim() : "";
  if (!taskName) {
    normalized.taskName = resolveTaskNameFromSelection({
      selectionContext,
      targetParentID:
        typeof normalized.targetParentID === "number"
          ? normalized.targetParentID
          : targetParentID,
      sourceAttachmentPaths,
    });
  }
  return normalized;
}

function createRuntimeContext(
  override?: Partial<WorkflowRuntimeContext>,
): WorkflowRuntimeContext {
  const hostCapabilities = resolveRuntimeHostCapabilities();
  const globalHostApi = (globalThis as Record<string, unknown>).__zsHostApi;
  const zotero =
    override?.zotero ||
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable");
  }
  return {
    handlers: override?.handlers || handlers,
    zotero,
    helpers: override?.helpers || createHookHelpers(zotero),
    hostApi:
      override?.hostApi ||
      (globalHostApi && typeof globalHostApi === "object"
        ? (globalHostApi as ReturnType<typeof createWorkflowHostApi>)
        : createWorkflowHostApi()),
    hostApiVersion:
      typeof override?.hostApiVersion === "number"
        ? override.hostApiVersion
        : WORKFLOW_HOST_API_VERSION,
    addon:
      typeof override?.addon !== "undefined"
        ? (override.addon ?? null)
        : ((resolveRuntimeAddon() as unknown as typeof addon | undefined) ?? null),
    debugMode:
      typeof override?.debugMode === "boolean"
        ? override.debugMode
        : isDebugModeEnabled(),
    workflowId: String(override?.workflowId || "").trim() || undefined,
    packageId: String(override?.packageId || "").trim() || undefined,
    workflowRootDir: String(override?.workflowRootDir || "").trim() || undefined,
    packageRootDir: String(override?.packageRootDir || "").trim() || undefined,
    workflowSourceKind:
      override?.workflowSourceKind === "builtin" ||
      override?.workflowSourceKind === "user"
        ? override.workflowSourceKind
        : "",
    hookName:
      override?.hookName === "filterInputs" ||
      override?.hookName === "buildRequest" ||
      override?.hookName === "applyResult"
        ? override.hookName
        : "",
    fetch:
      typeof override?.fetch !== "undefined"
        ? (override.fetch ?? null)
        : (hostCapabilities.fetch ?? null),
    Buffer:
      typeof override?.Buffer !== "undefined"
        ? (override.Buffer ?? null)
        : (hostCapabilities.Buffer ?? null),
    btoa:
      typeof override?.btoa !== "undefined"
        ? (override.btoa ?? null)
        : (hostCapabilities.btoa ?? null),
    atob:
      typeof override?.atob !== "undefined"
        ? (override.atob ?? null)
        : (hostCapabilities.atob ?? null),
    TextEncoder:
      typeof override?.TextEncoder !== "undefined"
        ? (override.TextEncoder ?? null)
        : (hostCapabilities.TextEncoder ?? null),
    TextDecoder:
      typeof override?.TextDecoder !== "undefined"
        ? (override.TextDecoder ?? null)
        : (hostCapabilities.TextDecoder ?? null),
    FileReader:
      typeof override?.FileReader !== "undefined"
        ? (override.FileReader ?? null)
        : (hostCapabilities.FileReader ?? null),
    navigator:
      typeof override?.navigator !== "undefined"
        ? (override.navigator ?? null)
        : (hostCapabilities.navigator ?? null),
  };
}

async function withWorkflowExecutionRuntimeScope<T>(
  runtime: WorkflowRuntimeContext,
  work: () => Promise<T> | T,
): Promise<T> {
  const previousTail = workflowRuntimeScopeTail;
  let releaseScope!: () => void;
  workflowRuntimeScopeTail = previousTail.then(
    () =>
      new Promise<void>((resolve) => {
        releaseScope = resolve;
      }),
  );
  await previousTail;
  const host = globalThis as Record<string, unknown>;
  const previous = host[GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY];
  host[GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY] = {
    runtime,
    zotero: runtime.zotero,
    handlers: runtime.handlers,
    helpers: runtime.helpers,
    addon: runtime.addon ?? null,
    debugMode: runtime.debugMode === true,
    workflowId: runtime.workflowId || "",
    packageId: runtime.packageId || "",
    workflowSourceKind: runtime.workflowSourceKind || "",
    hookName: runtime.hookName || "",
    fetch: runtime.fetch ?? null,
    Buffer: runtime.Buffer ?? null,
    btoa: runtime.btoa ?? null,
    atob: runtime.atob ?? null,
    TextEncoder: runtime.TextEncoder ?? null,
    TextDecoder: runtime.TextDecoder ?? null,
    FileReader: runtime.FileReader ?? null,
    navigator: runtime.navigator ?? null,
  };
  try {
    return await work();
  } finally {
    if (typeof previous === "undefined") {
      delete host[GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY];
    } else {
      host[GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY] = previous;
    }
    releaseScope();
  }
}

function createHookRuntimeContext(args: {
  runtime: WorkflowRuntimeContext;
  workflow: LoadedWorkflow;
  hookName: "filterInputs" | "buildRequest" | "applyResult";
}) {
  const isPackageHostApiWorkflow =
    args.workflow.hookExecutionMode === "precompiled-host-hook";
  return {
    ...args.runtime,
    zotero: isPackageHostApiWorkflow
      ? (undefined as unknown as typeof Zotero)
      : args.runtime.zotero,
    addon: isPackageHostApiWorkflow ? null : args.runtime.addon,
    debugMode: args.runtime.debugMode === true,
    workflowId: args.workflow.manifest.id,
    packageId: args.workflow.packageId || "",
    workflowRootDir: args.workflow.rootDir || "",
    packageRootDir: args.workflow.packageRootDir || "",
    workflowSourceKind: args.workflow.workflowSourceKind || "",
    hookName: args.hookName,
  } satisfies WorkflowRuntimeContext;
}

function resolveHookCapabilitySource(workflow: LoadedWorkflow) {
  if (workflow.hookExecutionMode === "precompiled-host-hook") {
    return "host-api-facade";
  }
  if (workflow.hookExecutionMode === "legacy-text-loader") {
    return "legacy-hook-runtime";
  }
  return "node-native-module";
}

async function runWorkflowHookWithDiagnostics<T>(args: {
  workflow: LoadedWorkflow;
  runtime: WorkflowRuntimeContext;
  hookName: "filterInputs" | "buildRequest" | "applyResult";
  component: string;
  operation: string;
  work: (hookRuntime: WorkflowRuntimeContext) => Promise<T> | T;
}) {
  const hookRuntime = createHookRuntimeContext({
    runtime: args.runtime,
    workflow: args.workflow,
    hookName: args.hookName,
  });
  const capabilitySource = resolveHookCapabilitySource(args.workflow);
  const hostApiSummary = summarizeWorkflowHostApiCapabilities(hookRuntime.hostApi);
  const contract =
    args.workflow.hookExecutionMode === "precompiled-host-hook"
      ? "package-host-api-facade"
      : "legacy-runtime-context";
  emitWorkflowPackageDiagnostic({
    level: "debug",
    scope: "hook",
    workflowId: hookRuntime.workflowId,
    packageId: hookRuntime.packageId,
    workflowSourceKind: hookRuntime.workflowSourceKind,
    hook: hookRuntime.hookName,
    component: args.component,
    operation: args.operation,
    stage: "workflow-hook-execute-start",
    message: `workflow hook ${args.hookName} execution started`,
    runtimeCapabilitySummary: summarizeWorkflowRuntimeCapabilities(hookRuntime),
    details: {
      executionMode: args.workflow.hookExecutionMode || "node-native-module",
      contract,
      capabilitySource,
      hostApiVersion: hookRuntime.hostApiVersion,
      hostApiSummary,
    },
    runtime: hookRuntime,
  });
  try {
    const result = await withWorkflowExecutionRuntimeScope(hookRuntime, () =>
      args.work(hookRuntime),
    );
    emitWorkflowPackageDiagnostic({
      level: "debug",
      scope: "hook",
      workflowId: hookRuntime.workflowId,
      packageId: hookRuntime.packageId,
      workflowSourceKind: hookRuntime.workflowSourceKind,
      hook: hookRuntime.hookName,
      component: args.component,
      operation: args.operation,
      stage: "workflow-hook-execute-succeeded",
      message: `workflow hook ${args.hookName} execution succeeded`,
      runtimeCapabilitySummary: summarizeWorkflowRuntimeCapabilities(hookRuntime),
      details: {
        executionMode: args.workflow.hookExecutionMode || "node-native-module",
        contract,
        capabilitySource,
        hostApiVersion: hookRuntime.hostApiVersion,
        hostApiSummary,
      },
      runtime: hookRuntime,
    });
    return result;
  } catch (error) {
    attachWorkflowHookFailureMeta(error, {
      hookName: hookRuntime.hookName || undefined,
      workflowId: hookRuntime.workflowId || undefined,
      packageId: hookRuntime.packageId || undefined,
      workflowSourceKind: hookRuntime.workflowSourceKind || "",
      capabilitySource,
      executionMode: args.workflow.hookExecutionMode || "node-native-module",
    });
    const normalizedError = summarizeWorkflowExecutionError(error);
    emitWorkflowPackageDiagnostic({
      level: "error",
      scope: "hook",
      workflowId: hookRuntime.workflowId,
      packageId: hookRuntime.packageId,
      workflowSourceKind: hookRuntime.workflowSourceKind,
      hook: hookRuntime.hookName,
      component: args.component,
      operation: args.operation,
      stage: "workflow-hook-execute-failed",
      message: `workflow hook ${args.hookName} execution failed`,
      runtimeCapabilitySummary: summarizeWorkflowRuntimeCapabilities(hookRuntime),
      details: {
        errorMessage: normalizedError.message,
        errorStack: normalizedError.stack,
        hookName: normalizedError.hookName,
        packageId: normalizedError.packageId,
        capabilitySource: normalizedError.capabilitySource,
        executionMode:
          normalizedError.executionMode ||
          args.workflow.hookExecutionMode ||
          "node-native-module",
        contract,
        hostApiVersion: hookRuntime.hostApiVersion,
        hostApiSummary,
      },
      error,
      runtime: hookRuntime,
    });
    throw error;
  }
}

function copySelection(selectionContext: unknown): SelectionLike {
  if (!selectionContext || typeof selectionContext !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(selectionContext)) as SelectionLike;
}

function hasAnySelectionItems(selectionContext: SelectionLike) {
  const items = selectionContext?.items || {};
  const attachmentCount = Array.isArray(items.attachments)
    ? items.attachments.length
    : 0;
  const parentCount = Array.isArray(items.parents) ? items.parents.length : 0;
  const childCount = Array.isArray(items.children) ? items.children.length : 0;
  const noteCount = Array.isArray(items.notes) ? items.notes.length : 0;
  return attachmentCount + parentCount + childCount + noteCount > 0;
}

function getSelectionItemCounts(selectionContext: SelectionLike) {
  const items = selectionContext?.items || {};
  return {
    attachments: Array.isArray(items.attachments) ? items.attachments.length : 0,
    parents: Array.isArray(items.parents) ? items.parents.length : 0,
    children: Array.isArray(items.children) ? items.children.length : 0,
    notes: Array.isArray(items.notes) ? items.notes.length : 0,
  };
}

function countNonZeroKinds(counts: {
  attachments: number;
  parents: number;
  children: number;
  notes: number;
}) {
  return [
    counts.attachments > 0,
    counts.parents > 0,
    counts.children > 0,
    counts.notes > 0,
  ].filter(Boolean).length;
}

function estimatePassThroughTotalUnits(selectionContext: SelectionLike) {
  const counts = getSelectionItemCounts(selectionContext);
  const nonZeroKinds = countNonZeroKinds(counts);
  if (nonZeroKinds === 0) {
    return 1;
  }
  if (nonZeroKinds > 1) {
    return 1;
  }
  if (counts.notes > 0) {
    return counts.notes;
  }
  if (counts.parents > 0) {
    return counts.parents;
  }
  if (counts.children > 0) {
    return counts.children;
  }
  if (counts.attachments > 0) {
    return counts.attachments;
  }
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
        : `file:${entry.filePath || ""}|parent:${getAttachmentParentId(entry) || ""}`;
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

function getAttachmentParentId(entry: AttachmentLike) {
  return entry.parent?.id || entry.item?.parentItemID || null;
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
    const filePath = String(entry.filePath || "").toLowerCase();
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
}) {
  const byParent = new Map<number, AttachmentLike[]>();
  const valid: AttachmentLike[] = [];
  const ambiguousParents = new Set<number>();

  for (const entry of args.attachments) {
    const parentId = getAttachmentParentId(entry);
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
  runtime: WorkflowRuntimeContext,
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
    if (!cloned.items) {
      cloned.items = {};
    }
    cloned.items.parents = [parent];
    cloned.items.attachments = [];
    cloned.items.children = [];
    cloned.items.notes = [];
    if (!cloned.summary) {
      cloned.summary = {};
    }
    cloned.summary.parentCount = 1;
    cloned.summary.attachmentCount = 0;
    cloned.summary.childCount = 0;
    cloned.summary.noteCount = 0;
    return cloned;
  });
}

function buildNoteSelectionUnits(selection: SelectionLike) {
  const notes = selection.items?.notes || [];
  return notes.map((note) => {
    const cloned = copySelection(selection);
    if (!cloned.items) {
      cloned.items = {};
    }
    cloned.items.notes = [note];
    cloned.items.attachments = [];
    cloned.items.children = [];
    cloned.items.parents = [];
    if (!cloned.summary) {
      cloned.summary = {};
    }
    cloned.summary.noteCount = 1;
    cloned.summary.attachmentCount = 0;
    cloned.summary.childCount = 0;
    cloned.summary.parentCount = 0;
    return cloned;
  });
}

async function resolveAttachmentSelectionUnits(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  runtime: WorkflowRuntimeContext;
}): Promise<ResolvedSelectionContexts> {
  const copied = copySelection(args.selectionContext);
  const inputs = args.workflow.manifest.inputs;
  const allowedMimes = inputs?.accepts?.mime;
  const perParentMin = Math.max(0, inputs?.per_parent?.min ?? 0);
  const rawMax = inputs?.per_parent?.max ?? Number.POSITIVE_INFINITY;
  const perParentMax = Math.max(perParentMin, rawMax);

  const candidates = applyAttachmentMimeFilter(
    collectAttachmentCandidates(copied),
    allowedMimes,
  );
  const declarativeFiltered = withScopedAttachments(
    copied,
    candidates,
    args.runtime,
  );

  let split = splitAttachmentsByPerParentRules({
    attachments: candidates,
    min: perParentMin,
    max: perParentMax,
  });
  const totalUnitsBeforeHook = split.valid.length + split.ambiguousParents.size;

  if (args.workflow.hooks.filterInputs) {
    const fromHook = (await runWorkflowHookWithDiagnostics({
      workflow: args.workflow,
      runtime: args.runtime,
      hookName: "filterInputs",
      component: "workflow-runtime",
      operation: "filter-inputs",
      work: (hookRuntime) =>
        args.workflow.hooks.filterInputs!({
          selectionContext: declarativeFiltered,
          manifest: args.workflow.manifest,
          executionOptions: args.executionOptions,
          runtime: hookRuntime,
        }),
    })) as SelectionLike;

    const hookSelection = copySelection(fromHook);
    const hookDirectAttachments = hookSelection.items?.attachments;
    const hookSourceAttachments = Array.isArray(hookDirectAttachments)
      ? (hookDirectAttachments as AttachmentLike[])
      : collectAttachmentCandidates(hookSelection);
    const hookAttachments = applyAttachmentMimeFilter(
      hookSourceAttachments,
      allowedMimes,
    );
    split = splitAttachmentsByPerParentRules({
      attachments: hookAttachments,
      min: perParentMin,
      max: perParentMax,
    });
  }

  const contexts = split.valid.map((entry) =>
    withScopedAttachments(copied, [entry], args.runtime),
  );
  return {
    contexts,
    totalUnits: totalUnitsBeforeHook,
  };
}

async function resolveSelectionContexts(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  runtime: WorkflowRuntimeContext;
}): Promise<ResolvedSelectionContexts> {
  const allowsEmptySelection = canWorkflowRunWithoutSelection(
    args.workflow.manifest,
  );
  const isPassThroughWorkflow =
    String(args.workflow.manifest.provider || "").trim() ===
    PASS_THROUGH_BACKEND_TYPE;
  if (isPassThroughWorkflow && !args.workflow.manifest.inputs?.unit) {
    const originalSelection = copySelection(args.selectionContext);
    const totalUnitsBeforeHook = estimatePassThroughTotalUnits(originalSelection);
    const startedWithoutSelection = !hasAnySelectionItems(originalSelection);
    let scopedSelection = originalSelection;
    if (args.workflow.hooks.filterInputs) {
      const filtered = await runWorkflowHookWithDiagnostics({
        workflow: args.workflow,
        runtime: args.runtime,
        hookName: "filterInputs",
        component: "workflow-runtime",
        operation: "filter-inputs",
        work: (hookRuntime) =>
          args.workflow.hooks.filterInputs!({
            selectionContext: scopedSelection,
            manifest: args.workflow.manifest,
            executionOptions: args.executionOptions,
            runtime: hookRuntime,
          }),
      });
      scopedSelection = copySelection(filtered);
    }
    if (!scopedSelection || typeof scopedSelection !== "object") {
      return {
        contexts: [],
        totalUnits: totalUnitsBeforeHook,
      };
    }
    if (!hasAnySelectionItems(scopedSelection)) {
      if (startedWithoutSelection && allowsEmptySelection) {
        return {
          contexts: [scopedSelection],
          totalUnits: totalUnitsBeforeHook,
        };
      }
      return {
        contexts: [],
        totalUnits: totalUnitsBeforeHook,
      };
    }
    const contexts = splitPassThroughSelectionUnits(scopedSelection);
    return {
      contexts,
      totalUnits: Math.max(totalUnitsBeforeHook, contexts.length),
    };
  }

  if (allowsEmptySelection) {
    const originalSelection = copySelection(args.selectionContext);
    const startedWithoutSelection = !hasAnySelectionItems(originalSelection);
    let scopedSelection = originalSelection;
    if (args.workflow.hooks.filterInputs) {
      const filtered = await runWorkflowHookWithDiagnostics({
        workflow: args.workflow,
        runtime: args.runtime,
        hookName: "filterInputs",
        component: "workflow-runtime",
        operation: "filter-inputs",
        work: (hookRuntime) =>
          args.workflow.hooks.filterInputs!({
            selectionContext: scopedSelection,
            manifest: args.workflow.manifest,
            executionOptions: args.executionOptions,
            runtime: hookRuntime,
          }),
      });
      scopedSelection = copySelection(filtered);
    }
    if (!scopedSelection || typeof scopedSelection !== "object") {
      return {
        contexts: [],
        totalUnits: 1,
      };
    }
    if (!hasAnySelectionItems(scopedSelection)) {
      if (startedWithoutSelection) {
        return {
          contexts: [scopedSelection],
          totalUnits: 1,
        };
      }
      return {
        contexts: [],
        totalUnits: 1,
      };
    }
  }

  const unit = args.workflow.manifest.inputs?.unit || "attachment";
  if (unit === "workflow") {
    const context = copySelection(args.selectionContext);
    return {
      contexts: [context],
      totalUnits: 1,
    };
  }
  if (unit === "parent") {
    const contexts = buildParentSelectionUnits(copySelection(args.selectionContext));
    return {
      contexts,
      totalUnits: contexts.length,
    };
  }
  if (unit === "note") {
    const contexts = buildNoteSelectionUnits(copySelection(args.selectionContext));
    return {
      contexts,
      totalUnits: contexts.length,
    };
  }
  return resolveAttachmentSelectionUnits(args);
}

export async function executeBuildRequests(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  runtime?: Partial<WorkflowRuntimeContext>;
}) {
  return measureAsyncTestPerformanceSpan(
    "executeBuildRequests",
    {
      workflowId: args.workflow.manifest.id,
      inputUnit: args.workflow.manifest.inputs?.unit || "attachment",
      hasBuildHook: !!args.workflow.hooks.buildRequest,
    },
    async () => {
      const runtime = createRuntimeContext(args.runtime);
      const resolved = await resolveSelectionContexts({
        workflow: args.workflow,
        selectionContext: args.selectionContext,
        executionOptions: args.executionOptions,
        runtime,
      });
      const resolvedSelections = resolved.contexts;

      if (resolvedSelections.length === 0) {
        throw createNoValidInputUnitsError({
          workflowId: args.workflow.manifest.id,
          totalUnits: resolved.totalUnits,
        });
      }

      const requests: BuildRequestsResult = [];
      for (const selectionContext of resolvedSelections) {
        const passThroughFallbackKind =
          String(args.workflow.manifest.provider || "").trim() ===
          PASS_THROUGH_BACKEND_TYPE
            ? PASS_THROUGH_REQUEST_KIND
            : "";
        const requestKind = String(
          args.workflow.manifest.request?.kind || passThroughFallbackKind,
        ).trim();

        if (args.workflow.hooks.buildRequest) {
          const builtRequest = enrichRequestWithSelectionMeta(
            await runWorkflowHookWithDiagnostics({
              workflow: args.workflow,
              runtime,
              hookName: "buildRequest",
              component: "workflow-runtime",
              operation: "build-request",
              work: (hookRuntime) =>
                args.workflow.hooks.buildRequest!({
                  selectionContext,
                  manifest: args.workflow.manifest,
                  executionOptions: args.executionOptions,
                  runtime: hookRuntime,
                }),
            }),
            selectionContext,
          );
          const finalBuiltRequest = withInjectedSkillRunnerExecutionMode({
            workflow: args.workflow,
            requestKind,
            request: builtRequest,
            executionOptions: args.executionOptions,
          });
          if (requestKind) {
            assertRequestPayloadContract({
              requestKind,
              request: finalBuiltRequest,
            });
          }
          requests.push(finalBuiltRequest);
          continue;
        }

        const request = args.workflow.manifest.request;
        const requestKindFromManifest = String(
          request?.kind || passThroughFallbackKind,
        ).trim();
        if (!requestKindFromManifest) {
          throw new Error(
            `Workflow ${args.workflow.manifest.id} missing buildRequest hook and request declaration`,
          );
        }

        const compiledRequest = enrichRequestWithSelectionMeta(
          compileDeclarativeRequest({
            kind: requestKindFromManifest,
            selectionContext,
            manifest: args.workflow.manifest,
            executionOptions: args.executionOptions,
          }),
          selectionContext,
        );
        const finalCompiledRequest = withInjectedSkillRunnerExecutionMode({
          workflow: args.workflow,
          requestKind: requestKindFromManifest,
          request: compiledRequest,
          executionOptions: args.executionOptions,
        });
        assertRequestPayloadContract({
          requestKind: requestKindFromManifest,
          request: finalCompiledRequest,
        });
        requests.push(finalCompiledRequest);
      }
      const skippedUnits = Math.max(0, resolved.totalUnits - requests.length);
      Object.defineProperty(requests, "__stats", {
        value: {
          totalUnits: resolved.totalUnits,
          requestCount: requests.length,
          skippedUnits,
        } satisfies BuildRequestStats,
        enumerable: false,
        configurable: true,
        writable: false,
      });

      return requests;
    },
  );
}

export async function executeApplyResult(args: {
  workflow: LoadedWorkflow;
  parent: Zotero.Item | number | string | null;
  bundleReader: {
    readText: (entryPath: string) => Promise<string>;
    getExtractedDir?: () => Promise<string>;
  };
  resultContext?: WorkflowResultContext;
  request?: unknown;
  runResult?: unknown;
  runtime?: Partial<WorkflowRuntimeContext>;
}) {
  return measureAsyncTestPerformanceSpan(
    "executeApplyResult",
    {
      workflowId: args.workflow.manifest.id,
      hasRequest: typeof args.request !== "undefined",
      hasRunResult: typeof args.runResult !== "undefined",
    },
    async () => {
      const runtime = createRuntimeContext(args.runtime);
      const productStorage = createProductStorageApi({
        manifest: args.workflow.manifest,
        resultContext: args.resultContext,
        request: args.request,
        runResult: args.runResult,
      });
      const hookResult = await measureAsyncTestPerformanceSpan(
        "executeApplyResult:hook",
        {
          workflowId: args.workflow.manifest.id,
          hasRequest: typeof args.request !== "undefined",
          hasRunResult: typeof args.runResult !== "undefined",
        },
        () =>
          runWorkflowHookWithDiagnostics({
            workflow: args.workflow,
            runtime,
            hookName: "applyResult",
            component: "workflow-runtime",
            operation: "apply-result",
            work: (hookRuntime) =>
              args.workflow.hooks.applyResult({
                parent: args.parent,
                bundleReader: args.bundleReader,
                resultContext: args.resultContext,
                productStorage,
                request: args.request,
                runResult: args.runResult,
                manifest: args.workflow.manifest,
                runtime: hookRuntime,
              }),
          }),
      );
      return measureAsyncTestPerformanceSpan(
        "executeApplyResult:finalize",
        {
          workflowId: args.workflow.manifest.id,
        },
        async () => hookResult,
      );
    },
  );
}
