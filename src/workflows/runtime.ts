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
  createBoundWorkflowResearchBundleApi,
  createWorkflowHostApi,
  createWorkflowHostLiveReadAdapters,
  withWorkflowHostLeafScope,
  type WorkflowHostLeafScope,
} from "./hostApi";
import { createHostBridgeWorkflowResourceApi } from "../modules/hostBridgeWorkflowResources";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import {
  WORKFLOW_HOST_API_VERSION,
  resolveWorkflowHostContractVersion,
  summarizeWorkflowHostApiCapabilities,
} from "./workflowHostContract";
import { assertRequestPayloadContract } from "../providers/requestContracts";
import {
  attachWorkflowHookFailureMeta,
  summarizeWorkflowExecutionError,
} from "./errorMeta";
import { measureAsyncTestPerformanceSpan } from "../modules/testPerformanceProbeBridge";
import { resolveInputUnitIdentityFromRequest } from "../modules/workflowExecution/requestMeta";
import type {
  PreparedWorkflowUnit,
  WorkflowRequestBuildPlan,
} from "../modules/workflowExecution/contracts";
import type {
  LoadedWorkflow,
  WorkflowPreflightContext,
  WorkflowPreflightOutcome,
  WorkflowPreflightUnit,
  WorkflowResultContext,
  WorkflowRuntimeContext,
  WorkflowRuntimeInfrastructureContext,
} from "./types";
import type { WorkflowRunOptions } from "./zoteroHostAccessOptions";
import { createProductStorageApi } from "../modules/workflowProductStore";
import {
  SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS,
  buildZoteroHostAccessRuntimeOptions,
  stripZoteroHostAccessRuntimeParams,
} from "./zoteroHostAccessOptions";
import {
  SKILL_RUN_FEEDBACK_RUNTIME_OPTION,
  isSkillRunFeedbackCollectionEnabled,
} from "../modules/skillRunFeedback";
import { planWorkflowInput } from "./workflowInputPlanning";
import type {
  WorkflowScopedSelectionContext,
  WorkflowSelectionValidationMode,
} from "./workflowInputPlanning";
import { resolveWorkflowDisplayLocale } from "./localization";

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

type SelectionLike = WorkflowScopedSelectionContext;

type ResolvedSelectionContexts = {
  contexts: SelectionLike[];
  totalUnits: number;
  candidateStats: {
    total: number;
    accepted: number;
    skipped: number;
    reasons: Readonly<Record<string, number>>;
  };
};

type BuildRequestStats = {
  totalUnits: number;
  requestCount: number;
  skippedUnits: number;
  candidateStats: ResolvedSelectionContexts["candidateStats"];
};

type BuildRequestsResult = unknown[] & {
  __stats?: BuildRequestStats;
  __preflight?: {
    requestUnits: Array<WorkflowPreflightContext | undefined>;
    shortCircuitApplies: Array<{
      index: number;
      taskLabel: string;
      parent: Zotero.Item | number | string | null;
      request: unknown;
      runResult: {
        status: "succeeded";
        requestId: string;
        fetchType: "result";
        resultJson: unknown;
        responseJson: unknown;
        [key: string]: unknown;
      };
      preflight: WorkflowPreflightContext;
    }>;
    aggregates: Array<{
      id: string;
      mode: "single-apply";
      applyWhen: "all-succeeded";
      orderBy: "unit.order";
      requestIndexes: number[];
    }>;
    skippedUnits: number;
  };
};

const stagedLeafScopeByRuntime = new WeakMap<object, WorkflowHostLeafScope>();
let stagedLeafRunSequence = 0;
const workflowHostInstanceId =
  globalThis.crypto?.randomUUID?.() ||
  `workflow-host-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function resolveStagedWorkflowHostLeafScope(
  runtime: WorkflowRuntimeContext,
) {
  return stagedLeafScopeByRuntime.get(runtime) || null;
}

type NoValidInputUnitsError = Error & {
  code: "NO_VALID_INPUT_UNITS";
  workflowId: string;
  totalUnits: number;
  skippedUnits: number;
  candidateTotal: number;
  candidateSkipped: number;
};

const GLOBAL_WORKFLOW_EXECUTION_RUNTIME_KEY =
  "__zsCurrentWorkflowExecutionRuntime";
let workflowRuntimeScopeTail: Promise<void> = Promise.resolve();

function createNoValidInputUnitsError(args: {
  workflowId: string;
  totalUnits: number;
  candidateTotal?: number;
  candidateSkipped?: number;
}): NoValidInputUnitsError {
  const error = new Error(
    `Workflow ${args.workflowId} has no valid input units after filtering`,
  ) as NoValidInputUnitsError;
  error.name = "NoValidInputUnitsError";
  error.code = "NO_VALID_INPUT_UNITS";
  error.workflowId = args.workflowId;
  error.totalUnits = Math.max(0, Number(args.totalUnits || 0));
  error.skippedUnits = error.totalUnits;
  error.candidateTotal = Math.max(
    0,
    Number(args.candidateTotal ?? args.totalUnits ?? 0),
  );
  error.candidateSkipped = Math.max(
    0,
    Number(args.candidateSkipped ?? error.candidateTotal),
  );
  return error;
}

function resolveTargetParentIDFromSelection(selectionContext: SelectionLike) {
  const attachmentParentID =
    selectionContext?.items?.attachments?.[0]?.parent?.id;
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

function resolveSourceAttachmentPathsFromSelection(
  selectionContext: SelectionLike,
) {
  const paths = collectAttachmentCandidates(selectionContext)
    .map((entry) => String(entry.filePath || "").trim())
    .filter(Boolean);
  return Array.from(new Set(paths));
}

export function resolveTaskNameFromSelection(args: {
  selectionContext: SelectionLike;
  targetParentID: number | null;
  sourceAttachmentPaths: string[];
  workflowLabel?: string;
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
  if (args.workflowLabel) {
    return `Workflow: ${args.workflowLabel}`;
  }
  return "Task";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean)),
  );
}

function resolveWorkflowRequiredMcpTools(manifest: LoadedWorkflow["manifest"]) {
  return normalizeStringArray(manifest.execution?.mcp?.requiredTools);
}

function normalizeSkillRunnerRequestMode(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "auto" || normalized === "interactive"
    ? normalized
    : "";
}

function withNormalizedSkillRunnerRuntimeOptions(args: {
  workflow: LoadedWorkflow;
  requestKind: string;
  request: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
}) {
  if (
    args.requestKind !== "skillrunner.job.v1" &&
    args.requestKind !== "skillrunner.sequence.v1"
  ) {
    return args.request;
  }
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
  if (args.requestKind === "skillrunner.job.v1") {
    const requestMode = normalizeSkillRunnerRequestMode(next.mode);
    delete next.mode;
    if (requestMode) {
      runtimeOptions.execution_mode = requestMode;
    }
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
  if (isSkillRunFeedbackCollectionEnabled()) {
    runtimeOptions[SKILL_RUN_FEEDBACK_RUNTIME_OPTION] = true;
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
  workflowLabel?: string,
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
  if (!isObjectRecord(normalized.targetParentRef) && targetParentID) {
    const parent = Zotero.Items.get(targetParentID);
    if (parent?.key && Number.isSafeInteger(parent.libraryID)) {
      normalized.targetParentRef = {
        libraryId: parent.libraryID,
        key: parent.key,
      };
    }
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
      workflowLabel,
    });
  }
  return normalized;
}

function normalizePreflightContext(args: {
  planId: string;
  unitId: string;
  unitOrder?: number;
  context?: Record<string, unknown>;
  aggregate?: { id: string; mode: "single-apply" };
}): WorkflowPreflightContext {
  return {
    planId: args.planId,
    unitId: args.unitId,
    ...(typeof args.unitOrder === "number"
      ? { unitOrder: args.unitOrder }
      : {}),
    ...(args.context ? { context: args.context } : {}),
    ...(args.aggregate ? { aggregate: args.aggregate } : {}),
  };
}

function assertPreflightOutcome(value: unknown): WorkflowPreflightOutcome {
  if (!isObjectRecord(value)) {
    throw new Error("preflight must return an object outcome");
  }
  const kind = String(value.kind || "").trim();
  if (
    kind !== "continue" &&
    kind !== "replace-units" &&
    kind !== "short-circuit-apply" &&
    kind !== "skip"
  ) {
    throw new Error(`Unsupported preflight outcome kind: ${kind || "<empty>"}`);
  }
  if (kind === "replace-units") {
    const units = value.units;
    if (!Array.isArray(units) || units.length === 0) {
      throw new Error("preflight replace-units outcome requires units[]");
    }
    for (let index = 0; index < units.length; index++) {
      const unit = units[index];
      if (!isObjectRecord(unit) || !String(unit.id || "").trim()) {
        throw new Error(
          `preflight replace-units units[${index}].id must be non-empty`,
        );
      }
    }
    const aggregate = isObjectRecord(value.aggregate) ? value.aggregate : null;
    if (aggregate) {
      if (String(aggregate.id || "").trim() === "") {
        throw new Error("preflight aggregate.id must be non-empty");
      }
      if (aggregate.mode !== "single-apply") {
        throw new Error("preflight aggregate.mode must be single-apply");
      }
      if (aggregate.applyWhen !== "all-succeeded") {
        throw new Error("preflight aggregate.applyWhen must be all-succeeded");
      }
      if (aggregate.orderBy !== "unit.order") {
        throw new Error("preflight aggregate.orderBy must be unit.order");
      }
    }
  }
  if (kind === "short-circuit-apply" && !isObjectRecord(value.apply)) {
    throw new Error("preflight short-circuit-apply outcome requires apply");
  }
  return value as WorkflowPreflightOutcome;
}

function mergePreflightContext(
  base?: Record<string, unknown>,
  unit?: Record<string, unknown>,
) {
  return {
    ...(base || {}),
    ...(unit || {}),
  };
}

function nonEmptyContext(value: Record<string, unknown>) {
  return Object.keys(value).length > 0 ? value : undefined;
}

function resolvePreflightUnitSelection(args: {
  fallback: SelectionLike;
  unit?: WorkflowPreflightUnit;
}) {
  return isObjectRecord(args.unit?.selectionContext)
    ? (args.unit?.selectionContext as SelectionLike)
    : args.fallback;
}

function buildPreflightRequestId(args: {
  workflowId: string;
  planId: string;
  unitId: string;
}) {
  return `preflight-${args.workflowId}-${args.planId}-${args.unitId}`.replace(
    /[^A-Za-z0-9._:-]+/g,
    "-",
  );
}

function createRuntimeContext(
  override?: Partial<WorkflowRuntimeInfrastructureContext>,
): WorkflowRuntimeInfrastructureContext {
  const hostCapabilities = resolveRuntimeHostCapabilities();
  const globalHostApi = (globalThis as Record<string, unknown>).__zsHostApi;
  const hasGlobalHostApi = Boolean(
    globalHostApi && typeof globalHostApi === "object",
  );
  const currentProjection = !override?.hostApi && !hasGlobalHostApi;
  const hostApi =
    override?.hostApi ||
    (hasGlobalHostApi
      ? (globalHostApi as ReturnType<typeof createWorkflowHostApi>)
      : createWorkflowHostApi());
  const zotero =
    override?.zotero ||
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable");
  }
  const invocationMode =
    override?.invocationMode === "non-interactive"
      ? "non-interactive"
      : "interactive";
  return {
    handlers: override?.handlers || handlers,
    zotero,
    helpers: override?.helpers || createHookHelpers(zotero),
    hostApi,
    workflowHostOverride:
      override?.hostApi || hasGlobalHostApi ? hostApi : undefined,
    workflowHostLiveReads:
      override?.workflowHostLiveReads ||
      createWorkflowHostLiveReadAdapters({
        interactionMode:
          invocationMode === "non-interactive"
            ? "non_interactive"
            : "interactive",
      }),
    hostApiVersion: resolveWorkflowHostContractVersion({
      explicitVersion: override?.hostApiVersion,
      hostApi,
      currentProjection,
    }),
    invocationMode,
    addon:
      typeof override?.addon !== "undefined"
        ? (override.addon ?? null)
        : ((resolveRuntimeAddon() as unknown as typeof addon | undefined) ??
          null),
    debugMode:
      typeof override?.debugMode === "boolean"
        ? override.debugMode
        : isDebugModeEnabled(),
    workflowId: String(override?.workflowId || "").trim() || undefined,
    packageId: String(override?.packageId || "").trim() || undefined,
    workflowRootDir:
      String(override?.workflowRootDir || "").trim() || undefined,
    packageRootDir: String(override?.packageRootDir || "").trim() || undefined,
    workflowSourceKind:
      override?.workflowSourceKind === "official" ||
      override?.workflowSourceKind === "dev-local" ||
      override?.workflowSourceKind === "user"
        ? override.workflowSourceKind
        : "",
    hookName:
      override?.hookName === "preflight" ||
      override?.hookName === "buildRequest" ||
      override?.hookName === "applyResult"
        ? override.hookName
        : "",
    locale: resolveWorkflowDisplayLocale(override?.locale),
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
    hostApi: runtime.hostApi,
    hostApiVersion: runtime.hostApiVersion,
    invocationMode: runtime.invocationMode,
    debugMode: runtime.debugMode === true,
    workflowId: runtime.workflowId || "",
    packageId: runtime.packageId || "",
    workflowSourceKind: runtime.workflowSourceKind || "",
    hookName: runtime.hookName || "",
    locale: runtime.locale || "en-US",
    fetch: runtime.fetch ?? null,
    Buffer: runtime.Buffer ?? null,
    btoa: runtime.btoa ?? null,
    atob: runtime.atob ?? null,
    TextEncoder: runtime.TextEncoder ?? null,
    TextDecoder: runtime.TextDecoder ?? null,
    FileReader: runtime.FileReader ?? null,
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
  runtime: WorkflowRuntimeInfrastructureContext;
  workflow: LoadedWorkflow;
  hookName: "preflight" | "buildRequest" | "applyResult";
}) {
  return {
    hostApi: args.runtime.hostApi,
    hostApiVersion: args.runtime.hostApiVersion,
    invocationMode: args.runtime.invocationMode,
    debugMode: args.runtime.debugMode === true,
    workflowId: args.workflow.manifest.id,
    packageId: args.workflow.packageId || "",
    workflowRootDir: args.workflow.rootDir || "",
    packageRootDir: args.workflow.packageRootDir || "",
    workflowSourceKind: args.workflow.workflowSourceKind || "",
    hookName: args.hookName,
    locale: args.runtime.locale,
    fetch: args.runtime.fetch,
    Buffer: args.runtime.Buffer,
    btoa: args.runtime.btoa,
    atob: args.runtime.atob,
    TextEncoder: args.runtime.TextEncoder,
    TextDecoder: args.runtime.TextDecoder,
    FileReader: args.runtime.FileReader,
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
  runtime: WorkflowRuntimeInfrastructureContext;
  hookName: "preflight" | "buildRequest" | "applyResult";
  component: string;
  operation: string;
  work: (hookRuntime: WorkflowRuntimeContext) => Promise<T> | T;
}) {
  const hookRuntime = createHookRuntimeContext({
    runtime: args.runtime,
    workflow: args.workflow,
    hookName: args.hookName,
  });
  let interactiveResources:
    | Awaited<ReturnType<typeof createHostBridgeWorkflowResourceApi>>
    | undefined;
  if (
    hookRuntime.invocationMode === "interactive" &&
    (args.workflow.manifest.resourceRequirements || []).length > 0
  ) {
    interactiveResources = await createHostBridgeWorkflowResourceApi({
      workflowId: args.workflow.manifest.id,
      runId: `${args.workflow.manifest.id}-${args.hookName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      manifest: args.workflow.manifest,
      inputs: {},
      outputBindings: {},
    });
    interactiveResources.mode = "interactive";
  }
  const capabilitySource = resolveHookCapabilitySource(args.workflow);
  const hostApiSummary = summarizeWorkflowHostApiCapabilities(
    hookRuntime.hostApi,
  );
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
    const leafRunId = `${hookRuntime.workflowId || "workflow"}:${hookRuntime.hookName || "hook"}:${++stagedLeafRunSequence}`;
    const result = await withWorkflowHostLeafScope(
      {
        interactionMode:
          hookRuntime.invocationMode === "non-interactive"
            ? "non_interactive"
            : "interactive",
        runScopeId: leafRunId,
        logBinding: {
          workflowId: hookRuntime.workflowId || "unknown",
          packageId: hookRuntime.packageId || "unknown",
          runId: leafRunId,
        },
        resources: hookRuntime.hostApi.resources,
      },
      async (leafScope) => {
        const interactionMode =
          hookRuntime.invocationMode === "non-interactive"
            ? "non_interactive"
            : "interactive";
        const ownerId = `${interactionMode}-workflow:${args.workflow.manifest.id}:${args.hookName}`;
        const resources = interactiveResources || hookRuntime.hostApi.resources;
        const researchBundles = interactiveResources
          ? createBoundWorkflowResearchBundleApi({
              ownerId,
              images: leafScope.owners.images,
              preparedImages: leafScope.preparedImages,
              resources: interactiveResources,
            })
          : hookRuntime.hostApi.researchBundles;
        const packageId = String(args.workflow.packageId || "").trim();
        const workflowId = String(args.workflow.manifest.id || "").trim();
        const contentDigest = String(args.workflow.contentDigest || "").trim();
        const synthesis = createWorkflowSynthesisHostApi({
          ...(packageId && workflowId && contentDigest
            ? {
                resolveAuditExecutionIdentity: async () => ({
                  hostInstanceId: workflowHostInstanceId,
                  principal: { packageId, workflowId, contentDigest },
                }),
              }
            : {}),
        });
        const scopedRuntime = {
          ...hookRuntime,
          hostApi:
            args.runtime.workflowHostOverride ||
            createWorkflowHostApi({
              interactionMode,
              ownerId,
              owners: leafScope.owners,
              preparedImages: leafScope.preparedImages,
              resources,
              researchBundles,
              synthesis,
            }),
          hostApiVersion: WORKFLOW_HOST_API_VERSION,
        } satisfies WorkflowRuntimeContext;
        stagedLeafScopeByRuntime.set(scopedRuntime, leafScope);
        try {
          return await withWorkflowExecutionRuntimeScope(scopedRuntime, () =>
            args.work(scopedRuntime),
          );
        } finally {
          stagedLeafScopeByRuntime.delete(scopedRuntime);
        }
      },
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
      runtimeCapabilitySummary:
        summarizeWorkflowRuntimeCapabilities(hookRuntime),
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
      runtimeCapabilitySummary:
        summarizeWorkflowRuntimeCapabilities(hookRuntime),
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
  } finally {
    await interactiveResources?.cleanup();
  }
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

function getAttachmentParentId(entry: AttachmentLike) {
  return entry.parent?.id || entry.item?.parentItemID || null;
}

async function resolveSelectionContexts(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  validationMode?: WorkflowSelectionValidationMode;
  runtime: WorkflowRuntimeContext;
}): Promise<ResolvedSelectionContexts> {
  const result = await planWorkflowInput({
    workflow: args.workflow,
    selectionContext: args.selectionContext,
    executionOptions: args.executionOptions,
    mode: args.validationMode || "execute",
    runtime: args.runtime,
  });
  return {
    contexts: result.units.map((unit) => unit.selectionContext),
    totalUnits: result.units.length + result.stats.units.skipped,
    candidateStats: result.stats.candidates,
  };
}

export async function planWorkflowExecutionUnits(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  validationMode?: WorkflowSelectionValidationMode;
  runtime?: Partial<WorkflowRuntimeContext>;
}): Promise<WorkflowRequestBuildPlan> {
  const runtime = createRuntimeContext(args.runtime);
  const inputPlan = await planWorkflowInput({
    workflow: args.workflow,
    selectionContext: args.selectionContext,
    executionOptions: args.executionOptions,
    mode: args.validationMode || "execute",
    runtime,
  });

  if (inputPlan.units.length === 0) {
    throw createNoValidInputUnitsError({
      workflowId: args.workflow.manifest.id,
      totalUnits: inputPlan.stats.units.total,
      candidateTotal: inputPlan.stats.candidates.total,
      candidateSkipped: inputPlan.stats.candidates.skipped,
    });
  }
  const units = inputPlan.units;

  return Object.freeze({
    units: Object.freeze(units),
    stats: Object.freeze({
      totalUnits: units.length,
      executableUnits: units.length,
      skippedUnits: inputPlan.stats.units.skipped,
      candidateStats: inputPlan.stats.candidates,
    }),
  });
}

export async function executeBuildRequests(args: {
  workflow: LoadedWorkflow;
  selectionContext: unknown;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: WorkflowRunOptions;
  };
  validationMode?: WorkflowSelectionValidationMode;
  preparedUnit?: PreparedWorkflowUnit;
  runtime?: Partial<WorkflowRuntimeContext>;
}) {
  return measureAsyncTestPerformanceSpan(
    "executeBuildRequests",
    {
      workflowId: args.workflow.manifest.id,
      inputUnit: args.workflow.manifest.inputs.member.kind,
      hasBuildHook: !!args.workflow.hooks.buildRequest,
    },
    async () => {
      const runtime = createRuntimeContext(args.runtime);
      const resolved = args.preparedUnit
        ? {
            contexts: [args.preparedUnit.selectionContext],
            totalUnits: 1,
            candidateStats: {
              total: args.preparedUnit.memberCount,
              accepted: args.preparedUnit.memberCount,
              skipped: 0,
              reasons: {},
            },
          }
        : await resolveSelectionContexts({
            workflow: args.workflow,
            selectionContext: args.selectionContext,
            executionOptions: args.executionOptions,
            validationMode: args.validationMode,
            runtime,
          });
      const resolvedSelections = resolved.contexts;

      if (resolvedSelections.length === 0) {
        throw createNoValidInputUnitsError({
          workflowId: args.workflow.manifest.id,
          totalUnits: resolved.totalUnits,
          candidateTotal: resolved.candidateStats.total,
          candidateSkipped: resolved.candidateStats.skipped,
        });
      }

      const requests: BuildRequestsResult = [];
      const preflightState: NonNullable<BuildRequestsResult["__preflight"]> = {
        requestUnits: [],
        shortCircuitApplies: [],
        aggregates: [],
        skippedUnits: 0,
      };
      const buildProviderRequest = async (buildArgs: {
        selectionContext: SelectionLike;
        preflight?: WorkflowPreflightContext;
      }) => {
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
                  selectionContext: buildArgs.selectionContext,
                  preflight: buildArgs.preflight,
                  manifest: args.workflow.manifest,
                  executionOptions: args.executionOptions,
                  runtime: hookRuntime,
                }),
            }),
            buildArgs.selectionContext,
            args.workflow.manifest.label,
          );
          const finalBuiltRequest = withNormalizedSkillRunnerRuntimeOptions({
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
          return finalBuiltRequest;
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
            selectionContext: buildArgs.selectionContext,
            manifest: args.workflow.manifest,
            executionOptions: args.executionOptions,
          }),
          buildArgs.selectionContext,
          args.workflow.manifest.label,
        );
        const finalCompiledRequest = withNormalizedSkillRunnerRuntimeOptions({
          workflow: args.workflow,
          requestKind: requestKindFromManifest,
          request: compiledRequest,
          executionOptions: args.executionOptions,
        });
        assertRequestPayloadContract({
          requestKind: requestKindFromManifest,
          request: finalCompiledRequest,
        });
        return finalCompiledRequest;
      };

      for (let selectionIndex = 0; selectionIndex < resolvedSelections.length; selectionIndex++) {
        const selectionContext = resolvedSelections[selectionIndex];
        if (!args.workflow.hooks.preflight) {
          const request = await buildProviderRequest({ selectionContext });
          requests.push(request);
          preflightState.requestUnits.push(undefined);
          continue;
        }

        const planId = `unit-${selectionIndex + 1}`;
        const outcome = assertPreflightOutcome(
          await runWorkflowHookWithDiagnostics({
            workflow: args.workflow,
            runtime,
            hookName: "preflight",
            component: "workflow-runtime",
            operation: "preflight",
            work: (hookRuntime) =>
              args.workflow.hooks.preflight!({
                selectionContext,
                manifest: args.workflow.manifest,
                executionOptions: args.executionOptions,
                runtime: hookRuntime,
              }),
          }),
        );

        if (outcome.kind === "skip") {
          preflightState.skippedUnits += 1;
          continue;
        }

        if (outcome.kind === "short-circuit-apply") {
          const unitId = "short-circuit";
          const preflight = normalizePreflightContext({
            planId,
            unitId,
            unitOrder: 0,
            context: outcome.context,
          });
          const apply = outcome.apply;
          const request =
            apply.request ||
            ({
              kind: "workflow.preflight.short-circuit.v1",
              taskName: resolveTaskNameFromSelection({
                selectionContext,
                targetParentID: resolveTargetParentIDFromSelection(selectionContext),
                sourceAttachmentPaths:
                  resolveSourceAttachmentPathsFromSelection(selectionContext),
                workflowLabel: args.workflow.manifest.label,
              }),
            } satisfies Record<string, unknown>);
          const requestId = buildPreflightRequestId({
            workflowId: args.workflow.manifest.id,
            planId,
            unitId,
          });
          const runResult = {
            ...(isObjectRecord(apply.runResult) ? apply.runResult : {}),
            status: "succeeded" as const,
            requestId,
            fetchType: "result" as const,
            resultJson: apply.resultJson,
            responseJson: apply.resultJson,
          };
          preflightState.shortCircuitApplies.push({
            index: requests.length + preflightState.shortCircuitApplies.length,
            taskLabel: resolveTaskNameFromSelection({
              selectionContext,
              targetParentID: resolveTargetParentIDFromSelection(selectionContext),
              sourceAttachmentPaths:
                resolveSourceAttachmentPathsFromSelection(selectionContext),
              workflowLabel: args.workflow.manifest.label,
            }),
            parent:
              typeof apply.parent !== "undefined"
                ? apply.parent
                : resolveTargetParentIDFromSelection(selectionContext) || null,
            request,
            runResult,
            preflight,
          });
          continue;
        }

        if (outcome.kind === "continue") {
          const preflight = normalizePreflightContext({
            planId,
            unitId: "main",
            unitOrder: 0,
            context: outcome.context,
          });
          const request = await buildProviderRequest({
            selectionContext,
            preflight,
          });
          requests.push(request);
          preflightState.requestUnits.push(preflight);
          continue;
        }

        const aggregateRequestIndexes: number[] = [];
        const aggregate = outcome.aggregate;
        for (let unitIndex = 0; unitIndex < outcome.units.length; unitIndex++) {
          const unit = outcome.units[unitIndex];
          const unitOrder =
            typeof unit.order === "number" ? unit.order : unitIndex;
          const unitContext = nonEmptyContext(
            mergePreflightContext(outcome.context, unit.context),
          );
          const preflight = normalizePreflightContext({
            planId,
            unitId: String(unit.id || "").trim(),
            unitOrder,
            context: unitContext,
            aggregate: aggregate
              ? {
                  id: aggregate.id,
                  mode: "single-apply",
                }
              : undefined,
          });
          const request = await buildProviderRequest({
            selectionContext: resolvePreflightUnitSelection({
              fallback: selectionContext,
              unit,
            }),
            preflight,
          });
          const requestIndex = requests.length;
          requests.push(request);
          preflightState.requestUnits.push(preflight);
          aggregateRequestIndexes.push(requestIndex);
        }
        if (aggregate) {
          preflightState.aggregates.push({
            id: aggregate.id,
            mode: "single-apply",
            applyWhen: "all-succeeded",
            orderBy: "unit.order",
            requestIndexes: aggregateRequestIndexes,
          });
        }
      }
      const skippedUnits = Math.max(
        0,
        resolved.totalUnits -
          requests.length -
          preflightState.shortCircuitApplies.length,
      ) + preflightState.skippedUnits;
      Object.defineProperty(requests, "__stats", {
        value: {
          totalUnits: resolved.totalUnits,
          requestCount:
            requests.length + preflightState.shortCircuitApplies.length,
          skippedUnits,
          candidateStats: resolved.candidateStats,
        } satisfies BuildRequestStats,
        enumerable: false,
        configurable: true,
        writable: false,
      });
      if (
        preflightState.requestUnits.some(Boolean) ||
        preflightState.shortCircuitApplies.length > 0 ||
        preflightState.aggregates.length > 0 ||
        preflightState.skippedUnits > 0
      ) {
        Object.defineProperty(requests, "__preflight", {
          value: preflightState,
          enumerable: false,
          configurable: true,
          writable: false,
        });
      }

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
  sequenceStep?: {
    id: string;
    index: number;
    workflowId: string;
    skillId: string;
    finalStep: boolean;
    phase: "sequence-step";
  };
  runtime?: Partial<WorkflowRuntimeContext>;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
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
                sequenceStep: args.sequenceStep,
                manifest: args.workflow.manifest,
                runtime: hookRuntime,
                executionOptions: args.executionOptions,
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
