import { getLoadedWorkflowSourceById } from "./workflowRuntime";
import { getVisibleLoadedWorkflowEntries } from "./workflowVisibility";
import {
  listActiveWorkflowTaskSummaries,
  listWorkflowTasks,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  listTaskDashboardHistory,
  type TaskDashboardHistoryRecord,
} from "./taskDashboardHistory";
import { isAcpSkillRunTask } from "./dashboardActiveTasks";
import {
  cancelAcpSkillRun,
  connectAcpSkillRun,
  getAcpSkillRunRecord,
  listAcpSkillRunSummaries,
  replyAcpSkillRun,
  type AcpSkillRunSummary,
} from "./acpSkillRunStore";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import {
  getHostBridgeApprovalRequirement,
  requestHostBridgePermissionForRequirement,
  type HostBridgePermissionDecision,
  type HostBridgePermissionScope,
} from "./hostBridgePermissionManager";
import { runWorkflowPreparationSeam } from "./workflowExecution/preparationSeam";
import { runWorkflowUnitDuplicateGuardSeam } from "./workflowExecution/duplicateGuardSeam";
import { submitPreparedWorkflowUnits } from "./workflowExecution/submissionSeam";
import {
  getSequenceRunState,
  listSequenceRunStates,
  type SequenceRunState,
  type SequenceStepRunState,
} from "./workflowExecution/sequenceStateStore";
import { createLocalizedMessageFormatter } from "./workflowExecution/messageFormatter";
import { buildWorkflowSettingsUiDescriptor } from "./workflowSettings";
import {
  assertRequiredWorkflowParameters,
  mergeExecutionOptions,
  type WorkflowExecutionOptions,
} from "./workflowSettingsDomain";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import type {
  WorkflowQueueBackendScope,
  WorkflowQueueEntryId,
  WorkflowSubmissionId,
} from "../jobQueue/workflowSubmissionQueueContracts";
import { buildSelectionContext } from "./selectionContext";
import {
  buildHostBridgeWorkflowAgentRunHandoff,
  type HostBridgeWorkflowAgentRunApplyStatus,
  type HostBridgeWorkflowAgentRunResult,
} from "./hostBridgeWorkflowAgentRun";
import {
  acquireHostBridgeAgentRunApplyLease,
  abandonHostBridgeAgentRunRecord,
  createHostBridgeAgentRunRecord,
  finishHostBridgeAgentRunRecord,
  getExpiredHostBridgeAgentRunRecord,
  getHostBridgeAgentRunApplyReceipt,
  getHostBridgeAgentRunRecord,
  recordHostBridgeAgentRunApplyReceipt,
  releaseHostBridgeAgentRunApplyLease,
  renewHostBridgeAgentRunRecord,
  sealHostBridgeAgentRunRecord,
  type HostBridgeAgentRunPreparedRequest,
} from "./hostBridgeWorkflowAgentRunStore";
import type { SelectionContext } from "./selectionContext";
import type {
  LoadedWorkflow,
  WorkflowResourceBindings,
  WorkflowResourceOutputDescriptor,
} from "../workflows/types";
import { localizeWorkflowLabel } from "../workflows/localization";
import { evaluateWorkflowSelection } from "../workflows/workflowInputPlanning";
import { executeApplyResult, executeBuildRequests } from "../workflows/runtime";
import { ZipBundleReader } from "../workflows/zipBundleReader";
import { projectWorkflowManifestContract } from "../workflows/manifestContract";
import {
  createHostBridgeWorkflowResourceApi,
  createNonInteractiveWorkflowHostApi,
  createWorkflowInteractionRequiredError,
  parseWorkflowResourceBindings,
  supportsHostBridgeNonInteractive,
  validateWorkflowResourceBindings,
} from "./hostBridgeWorkflowResources";
import {
  acquireHostBridgeUploadedFileLease,
  releaseHostBridgeUploadedFileLease,
} from "./hostBridgeFileRegistry";
import { createWorkflowHostApi } from "../workflows/hostApi";
import {
  createDirectoryBundleReader,
  type BundleReader,
} from "./workflowExecution/bundleIO";
import { createWorkflowResultContext } from "./workflowExecution/resultContext";
import {
  resolveTargetParentIDFromRequest,
  resolveTaskNameFromRequest,
} from "./workflowExecution/requestMeta";
import { collectSkillRunFeedbackSidecar } from "./skillRunFeedback";
import {
  describeProviderProfile,
  listProviderProfileBackends,
  validateProviderProfile,
  type ProviderProfileValidationSource,
  type ProviderProfileDescriptor,
  ProviderProfileError,
} from "../providers/profile";
import { listBackendInstances } from "../backends/registry";
import { probeAcpBackendRuntimeOptions } from "./acpBackendProbe";
import { persistBackendsConfig } from "./backendManager";
import {
  getWorkflowSettings,
  getWorkflowSettingsRevision,
} from "./workflowSettings";
import {
  acknowledgeHostBridgeNotificationEvents,
  listHostBridgeNotificationEvents,
  projectSkillRunNotification,
  projectWorkflowRunNotifications,
  type HostBridgeNotificationAckResult,
  type HostBridgeNotificationFilters,
  type HostBridgeNotificationListResult,
} from "./hostBridgeNotificationInbox";

const BROAD_NOTIFICATION_HISTORY_PROJECTION_TTL_MS = 1000;
let broadNotificationHistoryProjectedAt = 0;

export type HostBridgeWorkflowControlManifest = {
  supported: true;
  endpoints: string[];
  explicitInputRequired: true;
  submitRequiresApproval: boolean;
};

export type HostBridgeWorkflowSummary = {
  id: string;
  label: string;
  description: string;
  executionModes: Array<"auto" | "interactive">;
  provider: string;
  version?: string;
  sourceKind: "official" | "dev-local" | "user" | "";
  packageId?: string;
  configurable: boolean;
  acceptsNoSelection: boolean;
  inputs: LoadedWorkflow["manifest"]["inputs"];
  validateSelection: LoadedWorkflow["manifest"]["validateSelection"];
  parameters: string[];
  resultEvidence: {
    fetchType?: "bundle" | "result";
    resultJson?: string;
    artifacts: string[];
    applyBack: boolean;
  };
  supportedInvocationModes: LoadedWorkflow["manifest"]["supportedInvocationModes"];
  resourceRequirements: NonNullable<
    LoadedWorkflow["manifest"]["resourceRequirements"]
  >;
  nonInteractiveSupported: boolean;
};

export type HostBridgeWorkflowSelection =
  | {
      kind: "items";
      items: HostBridgeWorkflowItemRef[];
    }
  | {
      kind: "none";
    };

export type HostBridgeWorkflowInput = HostBridgeWorkflowSelection;

export type HostBridgeWorkflowItemRef = {
  key?: string;
  id?: number;
  libraryId?: number;
};

export type HostBridgeProviderProfileInput = {
  schema?: unknown;
  backendId?: unknown;
  providerOptions?: unknown;
};

export type HostBridgeWorkflowSubmitRequest = {
  workflowId?: unknown;
  selection?: unknown;
  workflowOptions?: unknown;
  providerProfile?: unknown;
  hostOptions?: unknown;
  input?: unknown;
  resourceBindings?: unknown;
};

export type HostBridgeWorkflowAgentRunRequest = {
  workflowId?: unknown;
  selection?: unknown;
  delivery?: unknown;
  workflowOptions?: unknown;
  providerProfile?: unknown;
  agentEngine?: unknown;
  input?: unknown;
};

export type HostBridgeWorkflowAgentApplyRequest = {
  results?: unknown;
};

export type HostBridgeWorkflowAgentApplyResultRef = {
  agentRequestId: string;
  bundle: {
    kind: "local_path";
    path: string;
  };
};

export type HostBridgeWorkflowAgentApplyResult = {
  agentRunId: string;
  workflowId: string;
  appliedAt: string;
  permission: HostBridgePermissionDecision;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  results: Array<{
    agentRequestId: string;
    requestIndex: number;
    namespace: string;
    succeeded: boolean;
    warningCount: number;
    errorCount: number;
    error?: string;
  }>;
  warnings: string[];
  stateChange: "unchanged" | "changed";
  handleConsumption: "consumed";
};

export type HostBridgeWorkflowAgentRunLifecycleResult = {
  agentRunId: string;
  workflowId: string;
  state: string;
  leaseExpiresAt: string;
  retentionExpiresAt: string;
  renewable: boolean;
  abandonable: boolean;
  renewedAt?: string;
  abandonedAt?: string;
};

export type HostBridgeWorkflowSubmitPlan = {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  workflowOptions: Record<string, unknown>;
  providerProfile: {
    backendId?: string;
    providerOptions: Record<string, unknown>;
  };
  providerProfileProvided: boolean;
  executionOptions: WorkflowExecutionOptions;
  resourceBindings?: WorkflowResourceBindings;
};

export type HostBridgeWorkflowAgentRunPlan = {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
};

export type HostBridgeWorkflowSubmitResult =
  | {
      workflowId: string;
      workflowLabel: string;
      admission: "direct";
      workflowRunId: string;
      jobIds: string[];
      totalJobs: number;
      tasks: HostBridgeWorkflowTaskDto[];
      permission: HostBridgePermissionDecision;
      resourceOutputs: WorkflowResourceOutputDescriptor[];
    }
  | {
      workflowId: string;
      workflowLabel: string;
      admission: "host-queue";
      submissionId: WorkflowSubmissionId;
      totalUnits: number;
      queuedUnits: number;
      skippedUnits: number;
      submissionUrl: string;
      queueUrl: string;
      permission: HostBridgePermissionDecision;
      resourceOutputs: WorkflowResourceOutputDescriptor[];
    };

export type HostBridgeWorkflowDescribeRequest = {
  workflowId?: unknown;
  workflowOptions?: unknown;
};

export type HostBridgeWorkflowDescribeResult = {
  workflowId: string;
  workflowLabel: string;
  description: string;
  declaredExecutionModes: Array<"auto" | "interactive">;
  resultEvidence: HostBridgeWorkflowSummary["resultEvidence"];
  selection: {
    acceptsNoSelection: boolean;
    inputs: HostBridgeWorkflowSummary["inputs"];
    validateSelection: HostBridgeWorkflowSummary["validateSelection"];
  };
  workflowOptions: {
    schema: unknown[];
    normalized: Record<string, unknown>;
  };
  providerRequirements: {
    requestKind: string;
    acceptedProviderTypes: string[];
    requiredCapabilities: string[];
  };
  executionModes: {
    hostOwned: {
      supported: boolean;
      command: "workflow submit";
      acceptsWorkflowOptions: true;
      monitorable: true;
      requiresApplyBack: false;
      requiredParameters: string[];
    };
    agentOwned: {
      supported: boolean;
      command: "workflow agent-run";
      acceptsWorkflowOptions: false;
      monitorable: false;
      requiresApplyBack: true;
      requiredParameters: string[];
      blockedReason?: string;
    };
  };
  blockedReason?: string;
  supportedInvocationModes: HostBridgeWorkflowSummary["supportedInvocationModes"];
  resourceRequirements: HostBridgeWorkflowSummary["resourceRequirements"];
  nonInteractiveSupported: boolean;
};

export type HostBridgeWorkflowValidateRequest = {
  workflowId?: unknown;
  selection?: unknown;
  workflowOptions?: unknown;
  providerProfile?: unknown;
  input?: unknown;
  resourceBindings?: unknown;
};

export type HostBridgeWorkflowValidateResult = {
  workflowId: string;
  workflowLabel: string;
  ready: boolean;
  selection: HostBridgeWorkflowSubmitPlan["selection"];
  workflowOptions: Record<string, unknown>;
  diagnostics: Array<{ code: string; message: string }>;
  resourceBindings?: WorkflowResourceBindings;
};

export type HostBridgeProviderProfileDescribeRequest = {
  backendId?: unknown;
  workflowId?: unknown;
};

export type HostBridgeProviderProfileValidateRequest = {
  providerProfile?: unknown;
  workflowId?: unknown;
  source?: unknown;
};

export type HostBridgeProviderProfileValidateResult = {
  valid: true;
  normalizedProfile: {
    schema: string;
    backendId: string;
    providerOptions: Record<string, unknown>;
  };
  descriptor: ProviderProfileDescriptor;
  diagnostics: [];
  source: ProviderProfileValidationSource;
  profileFingerprint: string;
};

export type HostBridgeTaskFilters = {
  workflowId?: string;
  backendId?: string;
  backendType?: string;
  requestId?: string;
  submissionId?: string;
  runId?: string;
  state?: string;
  includeHistory?: boolean;
  activeOnly?: boolean;
  limit?: number;
};

export type HostBridgeWorkflowTaskDto = {
  id: string;
  runId: string;
  workflowRunId: string;
  submissionId?: string;
  submissionUnitId?: string;
  jobId: string;
  skillRunId?: string;
  runKey?: string;
  requestId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  sequenceRole?: "single" | "sequence_step";
  engine?: string;
  targetParentID?: number;
  workflowId: string;
  workflowLabel: string;
  taskName: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  providerId?: string;
  requestKind?: string;
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
  state: WorkflowTaskRecord["state"];
  canReply?: boolean;
  canCancelBackendRun?: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
  source: "active" | "history";
  archivedAt?: string;
};

export type HostBridgeRunLiveness =
  | "active"
  | "waiting"
  | "failed_retriable"
  | "terminal"
  | "unknown";

export type HostBridgeSkillRunActions = {
  canReply: boolean;
  canConnect: boolean;
  canCancelWorkflow: boolean;
  isFailedRetriable: boolean;
};

export type HostBridgeSkillRunDto = {
  skillRunId: string;
  workflowRunId: string;
  workflowId?: string;
  workflowLabel?: string;
  taskName: string;
  state: WorkflowTaskRecord["state"];
  liveness: HostBridgeRunLiveness;
  updatedAt: string;
  createdAt?: string;
  jobId?: string;
  requestId?: string;
  backendId?: string;
  backendType?: string;
  providerId?: string;
  requestKind?: string;
  skillId?: string;
  skillName?: string;
  skillLabel?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  sequenceRole?: "single" | "sequence_step";
  actions: HostBridgeSkillRunActions;
};

export type HostBridgeActiveTaskDto = {
  workflowRunId: string;
  skillRunId: string;
  workflowId?: string;
  taskName: string;
  state: WorkflowTaskRecord["state"];
  liveness: HostBridgeRunLiveness;
  updatedAt: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  actions: HostBridgeSkillRunActions;
};

export type HostBridgeWorkflowRunStatus = {
  runId: string;
  workflowRunId: string;
  found: boolean;
  state:
    | "queued"
    | "running"
    | "waiting"
    | "succeeded"
    | "failed"
    | "canceled"
    | "unknown";
  workflowId?: string;
  workflowLabel?: string;
  liveness: HostBridgeRunLiveness;
  skillRuns: HostBridgeSkillRunDto[];
  currentSkillRunId?: string;
  tasks: HostBridgeWorkflowTaskDto[];
  summary: HostBridgeTaskSummary;
  updatedAt?: string;
};

export type HostBridgeWorkflowCancelResult = {
  accepted: boolean;
  workflowRunId: string;
  cancelRequestedAt: string;
  affectedSkillRuns: HostBridgeSkillRunDto[];
  permission: HostBridgePermissionDecision;
};

export type HostBridgeSkillRunEventDto = {
  eventId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  workflowRunId?: string;
  skillRunId: string;
  workflowId?: string;
  taskName?: string;
  state?: string;
  liveness?: HostBridgeRunLiveness;
  summary: string;
  actions?: HostBridgeSkillRunActions;
};

export type HostBridgeTaskSummary = {
  total: number;
  queued: number;
  running: number;
  waiting_user: number;
  waiting_auth: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return undefined;
}

export function getHostBridgeWorkflowControlManifest(): HostBridgeWorkflowControlManifest {
  return {
    supported: true,
    endpoints: [
      "GET /bridge/v2/workflows",
      "POST /bridge/v2/workflows/describe",
      "POST /bridge/v2/workflows/validate",
      "POST /bridge/v2/workflows/requirements",
      "GET /bridge/v2/workflows/provider-profiles",
      "POST /bridge/v2/workflows/provider-profiles/describe",
      "POST /bridge/v2/workflows/provider-profiles/validate",
      "POST /bridge/v2/workflows/provider-profiles/refresh",
      "POST /bridge/v2/workflows/defaults",
      "POST /bridge/v2/workflows/submit",
      "POST /bridge/v2/workflows/agent-run",
      "POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply",
      "GET /bridge/v2/workflows/agent-runs/{agentRunId}/apply",
      "GET /bridge/v2/workflows/runs",
      "GET /bridge/v2/workflows/runs/{workflowRunId}",
      "POST /bridge/v2/workflows/runs/{workflowRunId}/cancel",
      "GET /bridge/v2/tasks",
      "GET /bridge/v2/tasks/active",
      "GET /bridge/v2/tasks/recent",
      "GET /bridge/v2/skill-runs/{skillRunId}",
      "GET /bridge/v2/skill-runs/{skillRunId}/events",
      "GET /bridge/v2/skill-runs/recent",
      "POST /bridge/v2/skill-runs/{skillRunId}/reply",
      "POST /bridge/v2/skill-runs/{skillRunId}/connect",
      "GET /bridge/v2/notifications",
      "POST /bridge/v2/notifications/ack",
    ],
    explicitInputRequired: true,
    submitRequiresApproval:
      getHostBridgeApprovalRequirement("workflow.submit") !== "none",
  };
}

export function listHostBridgeWorkflows(): HostBridgeWorkflowSummary[] {
  return getVisibleLoadedWorkflowEntries().map((entry) => {
    const manifest = entry.manifest;
    const manifestContract = projectWorkflowManifestContract(manifest);
    return {
      id: manifest.id,
      label: localizeWorkflowLabel(entry),
      description: normalizeString(manifest.description),
      executionModes: manifestContract.executionModes,
      provider: manifest.provider,
      version: manifest.version,
      sourceKind:
        entry.workflowSourceKind || getLoadedWorkflowSourceById(manifest.id),
      packageId: entry.packageId,
      configurable: Object.keys(manifest.parameters || {}).length > 0,
      acceptsNoSelection: manifestContract.selection.acceptsNoSelection,
      inputs: manifestContract.selection.inputs,
      validateSelection: manifestContract.selection.validation,
      parameters: Object.keys(manifest.parameters || {}),
      resultEvidence: manifestContract.resultEvidence,
      supportedInvocationModes: manifestContract.supportedInvocationModes,
      resourceRequirements: manifestContract.resourceRequirements,
      nonInteractiveSupported: supportsHostBridgeNonInteractive(manifest),
    };
  });
}

function getWorkflowById(workflowId: string) {
  return getVisibleLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === workflowId,
  );
}

function createBridgeWindow(selectedItems: Zotero.Item[]) {
  return {
    ZoteroPane: {
      getSelectedItems: () => selectedItems,
    },
    alert: () => undefined,
    confirm: () => {
      throw createWorkflowInteractionRequiredError("window.confirm");
    },
  } as unknown as _ZoteroTypes.MainWindow;
}

function parseItemRef(raw: unknown): HostBridgeWorkflowItemRef | null {
  if (!isObject(raw)) {
    return null;
  }
  const key = normalizeString(raw.key);
  const id = normalizeNumber(raw.id);
  const libraryId = normalizeNumber(raw.libraryId ?? raw.library_id);
  if ((key && id !== undefined) || (!key && id === undefined)) {
    return null;
  }
  return {
    ...(key ? { key } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(libraryId !== undefined ? { libraryId } : {}),
  };
}

function codedWorkflowValidationError(code: string, message: string) {
  const error = new Error(message);
  (error as { code?: string }).code = code;
  return error;
}

function isUnsafeProviderProfileKey(key: string) {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  return (
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("password") ||
    normalized.includes("auth") ||
    normalized.includes("baseurl") ||
    normalized.includes("path") ||
    normalized === "url" ||
    normalized === "endpoint"
  );
}

function isLocalOrBackendAddress(value: string) {
  const trimmed = value.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    /^file:\/\//i.test(trimmed) ||
    /^[A-Za-z]:[\\/]/.test(trimmed) ||
    /^[/\\]/.test(trimmed) ||
    /^~[/\\]/.test(trimmed)
  );
}

function rejectUnsafeProviderProfileValue(value: unknown, path: string) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      rejectUnsafeProviderProfileValue(entry, `${path}[${index}]`),
    );
    return;
  }
  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (isUnsafeProviderProfileKey(key)) {
        throw codedWorkflowValidationError(
          "invalid_workflow_submit_request",
          `providerProfile must not contain sensitive or environment-bound field: ${path}.${key}`,
        );
      }
      rejectUnsafeProviderProfileValue(entry, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && isLocalOrBackendAddress(value)) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      `providerProfile must not contain backend URLs or local paths: ${path}`,
    );
  }
}

function parseWorkflowOptions(raw: unknown) {
  if (typeof raw === "undefined" || raw === null) {
    return {};
  }
  if (!isObject(raw)) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "workflowOptions must be a JSON object",
    );
  }
  return { ...raw };
}

function parseProviderProfile(raw: unknown) {
  if (typeof raw === "undefined" || raw === null) {
    return {
      providerOptions: {},
    };
  }
  if (!isObject(raw)) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "providerProfile must be a JSON object",
    );
  }
  const allowed = new Set(["schema", "backendId", "providerOptions"]);
  const forbidden = Object.keys(raw).filter((key) => !allowed.has(key));
  if (forbidden.length > 0) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      `providerProfile contains unsupported fields: ${forbidden.join(", ")}`,
    );
  }
  const schema = normalizeString(raw.schema);
  if (schema && schema !== "zotero-bridge.provider-profile.v1") {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "providerProfile.schema must be zotero-bridge.provider-profile.v1",
    );
  }
  const providerOptionsRaw = raw.providerOptions;
  if (
    typeof providerOptionsRaw !== "undefined" &&
    providerOptionsRaw !== null &&
    !isObject(providerOptionsRaw)
  ) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "providerProfile.providerOptions must be a JSON object",
    );
  }
  if (isObject(providerOptionsRaw)) {
    rejectUnsafeProviderProfileValue(
      providerOptionsRaw,
      "providerProfile.providerOptions",
    );
  }
  const backendId = normalizeString(raw.backendId);
  return {
    ...(backendId ? { backendId } : {}),
    providerOptions: isObject(providerOptionsRaw)
      ? { ...providerOptionsRaw }
      : {},
  };
}

function parseWorkflowSelection(
  raw: unknown,
  errorCode = "invalid_workflow_submit_request",
): HostBridgeWorkflowSelection {
  if (!isObject(raw)) {
    throw codedWorkflowValidationError(errorCode, "selection is required");
  }
  if (normalizeString(raw.kind) === "none") {
    return { kind: "none" };
  }
  if (normalizeString(raw.kind) && normalizeString(raw.kind) !== "items") {
    throw codedWorkflowValidationError(
      errorCode,
      "selection.kind must be items or none",
    );
  }
  if (!Array.isArray(raw.items)) {
    throw codedWorkflowValidationError(
      errorCode,
      "selection.items must contain explicit Zotero item refs",
    );
  }
  const items = raw.items
    .map(parseItemRef)
    .filter((entry): entry is HostBridgeWorkflowItemRef => !!entry);
  if (items.length !== raw.items.length || items.length === 0) {
    throw codedWorkflowValidationError(
      errorCode,
      "selection.items must contain explicit Zotero item refs",
    );
  }
  return {
    kind: "items",
    items,
  };
}

function buildWorkflowExecutionOptions(args: {
  workflowOptions: Record<string, unknown>;
  providerProfile: HostBridgeWorkflowSubmitPlan["providerProfile"];
  hostOptions?: unknown;
}): WorkflowExecutionOptions {
  return mergeExecutionOptions(
    {},
    {
      ...(args.providerProfile.backendId
        ? { backendId: args.providerProfile.backendId }
        : {}),
      workflowParams: { ...args.workflowOptions },
      providerOptions: { ...args.providerProfile.providerOptions },
      ...(typeof args.hostOptions === "undefined"
        ? {}
        : {
            hostOptions:
              args.hostOptions as WorkflowExecutionOptions["hostOptions"],
          }),
    },
  );
}

function parseHostBridgeWorkflowRequestBase(
  payload:
    | HostBridgeWorkflowSubmitRequest
    | HostBridgeWorkflowDescribeRequest
    | HostBridgeWorkflowValidateRequest,
  errorCode: string,
) {
  const workflowId = normalizeString(payload?.workflowId);
  if (!workflowId) {
    throw codedWorkflowValidationError(errorCode, "workflowId is required");
  }
  let workflowOptions: Record<string, unknown>;
  try {
    workflowOptions = parseWorkflowOptions(payload.workflowOptions);
  } catch (error) {
    if (error && typeof error === "object") {
      (error as { code?: string }).code = errorCode;
    }
    throw error;
  }
  return {
    workflowId,
    workflowOptions,
  };
}

export function parseHostBridgeWorkflowSubmitRequest(
  payload: HostBridgeWorkflowSubmitRequest,
): HostBridgeWorkflowSubmitPlan {
  if (typeof payload?.input !== "undefined") {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "workflow submit uses selection, workflowOptions, and providerProfile; input is not supported",
    );
  }
  const base = parseHostBridgeWorkflowRequestBase(
    payload,
    "invalid_workflow_submit_request",
  );
  const providerProfile = parseProviderProfile(payload.providerProfile);
  const selection = parseWorkflowSelection(payload.selection);
  const resourceBindings = parseWorkflowResourceBindings(
    payload.resourceBindings,
  );
  return {
    ...base,
    providerProfile,
    providerProfileProvided: Object.prototype.hasOwnProperty.call(
      payload || {},
      "providerProfile",
    ),
    executionOptions: buildWorkflowExecutionOptions({
      workflowOptions: base.workflowOptions,
      providerProfile,
      hostOptions: payload.hostOptions,
    }),
    selection,
    ...(resourceBindings ? { resourceBindings } : {}),
  };
}

function assertWorkflowOnlyRequest(
  payload:
    | HostBridgeWorkflowDescribeRequest
    | HostBridgeWorkflowValidateRequest,
  errorCode: string,
) {
  if (Object.prototype.hasOwnProperty.call(payload || {}, "providerProfile")) {
    throw codedWorkflowValidationError(
      errorCode,
      "providerProfile is only accepted by workflow submit; use workflow provider-profile endpoints for discovery and validation",
    );
  }
}

export function parseHostBridgeWorkflowAgentRunRequest(
  payload: HostBridgeWorkflowAgentRunRequest,
): HostBridgeWorkflowAgentRunPlan {
  const workflowId = normalizeString(payload?.workflowId);
  if (!workflowId) {
    throw codedWorkflowValidationError(
      "invalid_workflow_agent_run_request",
      "workflowId is required",
    );
  }
  for (const key of [
    "workflowOptions",
    "providerProfile",
    "agentEngine",
    "input",
  ] as const) {
    if (typeof payload?.[key] !== "undefined") {
      throw codedWorkflowValidationError(
        "invalid_workflow_agent_run_request",
        `${key} is not accepted by workflow agent-run`,
      );
    }
  }
  if (
    typeof payload?.delivery !== "undefined" &&
    (!payload.delivery ||
      typeof payload.delivery !== "object" ||
      Array.isArray(payload.delivery))
  ) {
    throw codedWorkflowValidationError(
      "invalid_workflow_agent_run_request",
      "delivery must be an object when provided",
    );
  }
  return {
    workflowId,
    selection: parseWorkflowSelection(
      payload?.selection,
      "invalid_workflow_agent_run_request",
    ),
  };
}

export async function describeHostBridgeWorkflow(
  payload: HostBridgeWorkflowDescribeRequest,
): Promise<HostBridgeWorkflowDescribeResult> {
  assertWorkflowOnlyRequest(payload, "invalid_workflow_describe_request");
  const base = parseHostBridgeWorkflowRequestBase(
    payload,
    "invalid_workflow_describe_request",
  );
  const workflow = getWorkflowById(base.workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow,
    draft: { workflowParams: base.workflowOptions },
    candidateBackends: [],
    autoSelectFallbackProfile: false,
    ignoreSavedSettings: true,
  });
  const manifestContract = projectWorkflowManifestContract(workflow.manifest);
  const agentRequiredParameters = manifestContract.requiredWorkflowOptions;
  return {
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    description: normalizeString(workflow.manifest.description),
    declaredExecutionModes: manifestContract.executionModes,
    supportedInvocationModes: manifestContract.supportedInvocationModes,
    resourceRequirements: manifestContract.resourceRequirements,
    nonInteractiveSupported: supportsHostBridgeNonInteractive(
      workflow.manifest,
    ),
    resultEvidence: manifestContract.resultEvidence,
    selection: {
      acceptsNoSelection: manifestContract.selection.acceptsNoSelection,
      inputs: manifestContract.selection.inputs,
      validateSelection: manifestContract.selection.validation,
    },
    workflowOptions: {
      schema: descriptor.workflowSchemaEntries,
      normalized: descriptor.workflowParams,
    },
    providerRequirements: {
      ...manifestContract.providerRequirements,
      requiredCapabilities: manifestContract.providerRequirements.requestKind
        ? [manifestContract.providerRequirements.requestKind]
        : [],
    },
    executionModes: {
      hostOwned: {
        supported:
          manifestContract.resourceRequirements.length === 0 ||
          supportsHostBridgeNonInteractive(workflow.manifest),
        command: "workflow submit",
        acceptsWorkflowOptions: true,
        monitorable: true,
        requiresApplyBack: false,
        requiredParameters: agentRequiredParameters,
      },
      agentOwned: {
        supported: agentRequiredParameters.length === 0,
        command: "workflow agent-run",
        acceptsWorkflowOptions: false,
        monitorable: false,
        requiresApplyBack: true,
        requiredParameters: agentRequiredParameters,
        ...(agentRequiredParameters.length
          ? {
              blockedReason:
                "workflow agent-run cannot supply required workflow options",
            }
          : {}),
      },
    },
    ...(descriptor.blockedReason
      ? { blockedReason: descriptor.blockedReason }
      : {}),
  };
}

export async function validateHostBridgeWorkflow(
  payload: HostBridgeWorkflowValidateRequest,
): Promise<HostBridgeWorkflowValidateResult> {
  assertWorkflowOnlyRequest(payload, "invalid_workflow_validate_request");
  if (typeof payload?.input !== "undefined") {
    throw codedWorkflowValidationError(
      "invalid_workflow_validate_request",
      "workflow validate uses selection and workflowOptions; input is not supported",
    );
  }
  const base = parseHostBridgeWorkflowRequestBase(
    payload,
    "invalid_workflow_validate_request",
  );
  const selection = parseWorkflowSelection(
    payload.selection,
    "invalid_workflow_validate_request",
  );
  const workflow = getWorkflowById(base.workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  if (
    selection.kind === "none" &&
    !canWorkflowRunWithoutSelection(workflow.manifest)
  ) {
    throw codedWorkflowValidationError(
      "invalid_workflow_validate_request",
      "selection.kind=none is only valid for no-selection workflows",
    );
  }
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow,
    draft: { workflowParams: base.workflowOptions },
    candidateBackends: [],
    ignoreSavedSettings: true,
    resolveDynamicOptions: false,
  });
  assertRequiredWorkflowParameters(
    workflow.manifest,
    descriptor.workflowParams,
  );
  const resources = await validateWorkflowResourceBindings({
    manifest: workflow.manifest,
    raw: payload.resourceBindings,
  });
  return {
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    ready: true,
    selection,
    workflowOptions: { ...descriptor.workflowParams },
    diagnostics: [],
    ...(resources.bindings ? { resourceBindings: resources.bindings } : {}),
  };
}

export async function requirementsForHostBridgeWorkflow(
  payload: HostBridgeWorkflowDescribeRequest,
): Promise<HostBridgeWorkflowDescribeResult> {
  return describeHostBridgeWorkflow(payload);
}

export async function listHostBridgeProviderProfiles() {
  return {
    schema: "zotero-bridge.provider-profile-list.v1",
    profiles: await listProviderProfileBackends(),
  };
}

export async function getHostBridgeWorkflowDefaults(payload: {
  workflowId?: unknown;
}) {
  const workflowId = normalizeString(payload?.workflowId);
  if (!workflowId) {
    throw codedWorkflowValidationError(
      "invalid_workflow_defaults_request",
      "workflowId is required",
    );
  }
  const workflow = getWorkflowById(workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  const settings = getWorkflowSettings(workflowId);
  const backendId = normalizeString(settings.backendId);
  const providerOptions = isObject(settings.providerOptions)
    ? { ...settings.providerOptions }
    : {};
  let candidateDiagnostics: Array<{ code: string; message: string }> = [];
  let descriptor: ProviderProfileDescriptor | undefined;
  try {
    rejectUnsafeProviderProfileValue(
      providerOptions,
      "providerProfile.providerOptions",
    );
  } catch (error) {
    candidateDiagnostics = [
      {
        code: "invalid_provider_profile",
        message:
          error instanceof Error
            ? error.message
            : String(error || "invalid provider profile"),
      },
    ];
  }
  if (backendId && candidateDiagnostics.length === 0) {
    try {
      descriptor = await describeProviderProfile(backendId);
    } catch (error) {
      candidateDiagnostics = [
        {
          code:
            (error as { code?: string }).code || "provider_profile_unavailable",
          message:
            error instanceof Error
              ? error.message
              : String(error || "unknown error"),
        },
      ];
    }
  }
  return {
    schema: "zotero-bridge.workflow-defaults.v1",
    workflowId,
    workflowLabel: localizeWorkflowLabel(workflow),
    settingsRevision: getWorkflowSettingsRevision(),
    hasDefault: Boolean(backendId),
    diagnostics: candidateDiagnostics,
    ...(backendId &&
    candidateDiagnostics.every(
      (entry) => entry.code !== "invalid_provider_profile",
    )
      ? {
          providerProfile: {
            schema: "zotero-bridge.provider-profile.v1",
            backendId,
            providerOptions,
          },
          ...(descriptor ? { descriptor } : {}),
        }
      : {}),
  };
}

export async function describeHostBridgeProviderProfile(
  payload: HostBridgeProviderProfileDescribeRequest,
) {
  if (Object.prototype.hasOwnProperty.call(payload || {}, "workflowId")) {
    throw codedWorkflowValidationError(
      "invalid_provider_profile_request",
      "provider profile describe does not accept workflowId",
    );
  }
  return describeProviderProfile(payload?.backendId);
}

export async function validateHostBridgeProviderProfile(
  payload: HostBridgeProviderProfileValidateRequest,
): Promise<HostBridgeProviderProfileValidateResult> {
  if (Object.prototype.hasOwnProperty.call(payload || {}, "workflowId")) {
    throw codedWorkflowValidationError(
      "invalid_provider_profile_request",
      "provider profile validate does not accept workflowId",
    );
  }
  const source =
    payload?.source === "environment-default" ||
    payload?.source === "host-default"
      ? payload.source
      : "explicit";
  const result = await validateProviderProfile(
    payload?.providerProfile,
    source,
  );
  return {
    valid: true,
    normalizedProfile: result.normalizedProfile,
    descriptor: result.descriptor,
    diagnostics: [],
    source: result.source,
    profileFingerprint: result.profileFingerprint,
  };
}

export async function refreshHostBridgeProviderProfile(payload: {
  backendId?: unknown;
}) {
  const backendId = normalizeString(payload?.backendId);
  if (!backendId) {
    throw codedWorkflowValidationError(
      "invalid_provider_profile_request",
      "backendId is required",
    );
  }
  const backends = await listBackendInstances();
  const backend = backends.find((entry) => entry.id === backendId);
  if (!backend) {
    throw new ProviderProfileError(
      "provider_profile_backend_not_found",
      `Backend not found: ${backendId}`,
      { backendId },
    );
  }
  if (backend.type !== "acp") {
    throw codedWorkflowValidationError(
      "provider_profile_refresh_unsupported",
      "Profile refresh is only supported for ACP backends",
    );
  }
  const result = await probeAcpBackendRuntimeOptions({ backend });
  persistBackendsConfig(
    backends.map((entry) => (entry.id === backendId ? result.backend : entry)),
  );
  if (!result.ok) {
    throw codedWorkflowValidationError(
      "provider_profile_refresh_failed",
      result.error || "ACP profile refresh failed",
    );
  }
  return {
    schema: "zotero-bridge.provider-profile-refresh.v1",
    backendId,
    refreshed: true,
    descriptor: await describeProviderProfile(backendId),
  };
}

function resolveZoteroItemRef(ref: HostBridgeWorkflowItemRef) {
  const runtime = globalThis as {
    Zotero?: {
      Libraries?: { userLibraryID?: number };
      Items?: {
        get?: (id: number) => Zotero.Item | false | null | undefined;
        getByLibraryAndKey?: (
          libraryId: number,
          key: string,
        ) => Zotero.Item | false | null | undefined;
      };
    };
  };
  const items = runtime.Zotero?.Items;
  if (!items) {
    throw new Error("Zotero Items API is unavailable");
  }
  if (typeof ref.id === "number") {
    const item = items.get?.(ref.id);
    if (item) {
      return item;
    }
    throw new Error(`Zotero item not found: id=${ref.id}`);
  }
  const key = normalizeString(ref.key);
  const libraryId =
    ref.libraryId ||
    (typeof runtime.Zotero?.Libraries?.userLibraryID === "number"
      ? runtime.Zotero.Libraries.userLibraryID
      : 0);
  if (!key || !libraryId) {
    throw new Error("Zotero item key and libraryId are required");
  }
  const item = items.getByLibraryAndKey?.(libraryId, key);
  if (item) {
    return item;
  }
  throw new Error(`Zotero item not found: key=${key}`);
}

function resolveSelectedItemsForSelection(
  selection: HostBridgeWorkflowSelection,
) {
  if (selection.kind === "none") {
    return [];
  }
  return selection.items.map(resolveZoteroItemRef);
}

function resolveSelectedItemsForPlan(plan: HostBridgeWorkflowSubmitPlan) {
  return resolveSelectedItemsForSelection(plan.selection);
}

export async function prepareHostBridgeWorkflowSubmit(
  payload: HostBridgeWorkflowSubmitRequest,
): Promise<{ plan: HostBridgeWorkflowSubmitPlan; workflow: LoadedWorkflow }> {
  let plan = parseHostBridgeWorkflowSubmitRequest(payload);
  const workflow = getWorkflowById(plan.workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  if (
    plan.selection.kind === "none" &&
    !canWorkflowRunWithoutSelection(workflow.manifest)
  ) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "selection.kind=none is only valid for no-selection workflows",
    );
  }
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow,
    draft: plan.executionOptions,
    resolveDynamicOptions: false,
    ignoreSavedSettings: true,
  });
  assertRequiredWorkflowParameters(
    workflow.manifest,
    descriptor.workflowParams,
  );
  const resources = await validateWorkflowResourceBindings({
    manifest: workflow.manifest,
    raw: plan.resourceBindings,
  });
  plan = {
    ...plan,
    ...(resources.bindings ? { resourceBindings: resources.bindings } : {}),
  };
  const explicitBackendId = normalizeString(plan.providerProfile.backendId);
  if (explicitBackendId && descriptor.selectedProfile !== explicitBackendId) {
    throw codedWorkflowValidationError(
      "workflow_provider_incompatible",
      "providerProfile.backendId is not compatible with this workflow",
    );
  }
  if (
    descriptor.requiresBackendProfile &&
    (!plan.providerProfileProvided || !explicitBackendId)
  ) {
    throw codedWorkflowValidationError(
      "provider_profile_required",
      "A provider profile is required for this workflow; validate and submit an explicit profile.",
    );
  }
  if (explicitBackendId) {
    const validated = await validateProviderProfile({
      schema: "zotero-bridge.provider-profile.v1",
      backendId: explicitBackendId,
      providerOptions: plan.providerProfile.providerOptions,
    });
    plan = {
      ...plan,
      providerProfile: {
        backendId: validated.normalizedProfile.backendId,
        providerOptions: validated.normalizedProfile.providerOptions,
      },
      executionOptions: buildWorkflowExecutionOptions({
        workflowOptions: plan.workflowOptions,
        providerProfile: {
          backendId: validated.normalizedProfile.backendId,
          providerOptions: validated.normalizedProfile.providerOptions,
        },
      }),
    };
  }
  return { plan, workflow };
}

export async function prepareHostBridgeWorkflowAgentRun(
  payload: HostBridgeWorkflowAgentRunRequest,
): Promise<{ plan: HostBridgeWorkflowAgentRunPlan; workflow: LoadedWorkflow }> {
  const plan = parseHostBridgeWorkflowAgentRunRequest(payload);
  const workflow = getWorkflowById(plan.workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  assertRequiredWorkflowParameters(workflow.manifest, {});
  return { plan, workflow };
}

function safeAgentRunSegment(value: unknown, fallback: string) {
  const text = normalizeString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return text || fallback;
}

function requestRecord(request: unknown): Record<string, unknown> {
  return isObject(request) ? request : {};
}

function nestedRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key];
  return isObject(value) ? value : {};
}

function resolveAgentRunRequestKind(args: {
  workflow: LoadedWorkflow;
  request: unknown;
}) {
  const record = requestRecord(args.request);
  return (
    normalizeString(record.kind) ||
    normalizeString(args.workflow.manifest.request?.kind)
  );
}

function resolveAgentRunSkillId(args: {
  workflow: LoadedWorkflow;
  request: unknown;
  index: number;
}) {
  const record = requestRecord(args.request);
  const create = nestedRecord(record, "create");
  const requestJson = nestedRecord(nestedRecord(record, "request"), "json");
  const sequenceSteps = args.workflow.manifest.request?.sequence?.steps || [];
  const sequenceStep = sequenceSteps[args.index];
  return (
    normalizeString(record.skill_id) ||
    normalizeString(record.skillId) ||
    normalizeString(create.skill_id) ||
    normalizeString(requestJson.skill_id) ||
    normalizeString(sequenceStep?.skill_id) ||
    normalizeString(args.workflow.manifest.request?.create?.skill_id)
  );
}

function buildAgentRunNamespace(args: {
  workflow: LoadedWorkflow;
  request: unknown;
  index: number;
}) {
  const record = requestRecord(args.request);
  return safeAgentRunSegment(
    normalizeString(record.namespace) ||
      resolveAgentRunSkillId(args) ||
      `${args.workflow.manifest.id}-${args.index + 1}`,
    `request-${args.index + 1}`,
  );
}

function buildAgentRunPreparedRequests(args: {
  workflow: LoadedWorkflow;
  requests: unknown[];
}): HostBridgeAgentRunPreparedRequest[] {
  return args.requests.map((request, index) => {
    const namespace = buildAgentRunNamespace({
      workflow: args.workflow,
      request,
      index,
    });
    const requestIndex = index;
    const agentRequestId = `req-${(index + 1).toString().padStart(3, "0")}-${namespace}`;
    const requestKind = resolveAgentRunRequestKind({
      workflow: args.workflow,
      request,
    });
    const skillId = resolveAgentRunSkillId({
      workflow: args.workflow,
      request,
      index,
    });
    return {
      agentRequestId,
      requestIndex,
      taskName: resolveTaskNameFromRequest(request, index),
      ...(requestKind ? { requestKind } : {}),
      ...(skillId ? { skillId } : {}),
      namespace,
      resultJsonPath: `result/${namespace}/result.json`,
      bundlePath: `bundle/${namespace}/run_bundle.zip`,
      request,
    };
  });
}

export async function buildHostBridgeWorkflowAgentRun(args: {
  payload: HostBridgeWorkflowAgentRunRequest;
}): Promise<HostBridgeWorkflowAgentRunResult> {
  const { plan, workflow } = await prepareHostBridgeWorkflowAgentRun(
    args.payload,
  );
  const selectedItems = resolveSelectedItemsForSelection(plan.selection);
  const selectionContext = await buildSelectionContext(selectedItems);
  const applyStatus = await evaluateAgentRunApplyStatus({
    workflow,
    selectionContext,
  });
  const rawRequests = await executeBuildRequests({
    workflow,
    selectionContext,
    validationMode: "handoff",
  });
  const preparedRequests = buildAgentRunPreparedRequests({
    workflow,
    requests: rawRequests,
  });
  const record = createHostBridgeAgentRunRecord({
    workflowId: workflow.manifest.id,
    selection: plan.selection,
    requests: preparedRequests,
  });
  return buildHostBridgeWorkflowAgentRunHandoff({
    agentRunId: record.agentRunId,
    expiresAt: record.expiresAt,
    workflow,
    selection: plan.selection,
    selectionContext,
    applyStatus,
    preparedRequests,
  });
}

function parseAgentApplyResults(
  payload: HostBridgeWorkflowAgentApplyRequest,
): HostBridgeWorkflowAgentApplyResultRef[] {
  if (!isObject(payload) || !Array.isArray(payload.results)) {
    throw codedWorkflowValidationError(
      "invalid_agent_run_apply_request",
      "agent-run apply requires body.results",
    );
  }
  const results = payload.results.map(
    (entry): HostBridgeWorkflowAgentApplyResultRef => {
      if (!isObject(entry)) {
        throw codedWorkflowValidationError(
          "invalid_agent_run_apply_request",
          "each result must be an object",
        );
      }
      const agentRequestId = normalizeString(entry.agentRequestId);
      const bundle = isObject(entry.bundle) ? entry.bundle : {};
      const kind = normalizeString(bundle.kind);
      const path = normalizeString(bundle.path);
      if (!agentRequestId || kind !== "local_path" || !path) {
        throw codedWorkflowValidationError(
          "invalid_agent_run_apply_request",
          "each result requires agentRequestId and bundle { kind: local_path, path }",
        );
      }
      return {
        agentRequestId,
        bundle: {
          kind: "local_path",
          path,
        },
      };
    },
  );
  if (results.length === 0) {
    throw codedWorkflowValidationError(
      "invalid_agent_run_apply_request",
      "agent-run apply requires at least one result",
    );
  }
  return results;
}

function codedAgentApplyError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const error = new Error(message);
  (error as { code?: string; details?: Record<string, unknown> }).code = code;
  if (details) {
    (error as { details?: Record<string, unknown> }).details = details;
  }
  return error;
}

function bundlePathLooksZip(bundlePath: string) {
  return bundlePath.toLowerCase().endsWith(".zip");
}

function createAgentApplyBundleReader(bundlePath: string): BundleReader {
  if (bundlePathLooksZip(bundlePath)) {
    return new ZipBundleReader(bundlePath);
  }
  return createDirectoryBundleReader(bundlePath);
}

async function readRequiredBundleJson(args: {
  bundleReader: BundleReader;
  entryPath: string;
  errorCode: string;
}) {
  let text = "";
  try {
    text = await args.bundleReader.readText(args.entryPath);
  } catch (error) {
    throw codedAgentApplyError(
      args.errorCode,
      `agent-run bundle is missing ${args.entryPath}: ${error instanceof Error ? error.message : String(error || "")}`,
      { entryPath: args.entryPath },
    );
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw codedAgentApplyError(
      args.errorCode,
      `agent-run bundle entry is not valid JSON: ${args.entryPath}`,
      { entryPath: args.entryPath },
    );
  }
}

async function validateAgentApplyBundle(args: {
  bundleReader: BundleReader;
  prepared: HostBridgeAgentRunPreparedRequest;
}) {
  await readRequiredBundleJson({
    bundleReader: args.bundleReader,
    entryPath: args.prepared.resultJsonPath,
    errorCode: "invalid_bundle",
  });
  const manifestPath = `bundle/${args.prepared.namespace}/manifest.json`;
  const manifest = await readRequiredBundleJson({
    bundleReader: args.bundleReader,
    entryPath: manifestPath,
    errorCode: "invalid_bundle",
  });
  const manifestRecord = isObject(manifest) ? manifest : {};
  const manifestNamespace = normalizeString(
    manifestRecord.namespace ??
      nestedRecord(manifestRecord, "run").namespace ??
      nestedRecord(manifestRecord, "result").namespace,
  );
  if (manifestNamespace && manifestNamespace !== args.prepared.namespace) {
    throw codedAgentApplyError(
      "invalid_bundle",
      "agent-run bundle namespace does not match prepared request",
      {
        expected: args.prepared.namespace,
        actual: manifestNamespace,
      },
    );
  }
}

async function requestAgentRunApplyPermission(args: {
  workflow: LoadedWorkflow;
  resultCount: number;
  scope?: HostBridgePermissionScope | null;
}) {
  return requestHostBridgePermissionForRequirement({
    action: "workflow.submit",
    title: "Apply workflow agent-run results",
    summary: `Apply ${args.resultCount} agent-run result bundle(s) for workflow ${localizeWorkflowLabel(args.workflow)}.`,
    detail:
      "Host Bridge will import the finalized result bundle(s) into Zotero using the workflow applyResult hook.",
    source: "host-bridge-cli",
    scope: args.scope,
  });
}

export async function applyHostBridgeWorkflowAgentRun(args: {
  agentRunId: string;
  payload: HostBridgeWorkflowAgentApplyRequest;
  scope?: HostBridgePermissionScope | null;
}): Promise<HostBridgeWorkflowAgentApplyResult> {
  const agentRunId = normalizeString(args.agentRunId);
  const results = parseAgentApplyResults(args.payload);
  const expired = getExpiredHostBridgeAgentRunRecord(agentRunId);
  if (expired) {
    throw codedAgentApplyError("agent_run_expired", "agent-run has expired", {
      agentRunId,
    });
  }
  const record = getHostBridgeAgentRunRecord(agentRunId);
  if (!record) {
    throw codedAgentApplyError("agent_run_not_found", "agent-run not found", {
      agentRunId,
    });
  }
  if (record.sealedAt) {
    throw codedAgentApplyError(
      "agent_run_already_consumed",
      "agent-run has already been consumed",
      { agentRunId },
    );
  }
  const workflow = getWorkflowById(record.workflowId);
  if (!workflow) {
    throw codedAgentApplyError("workflow_not_found", "workflow not found", {
      workflowId: record.workflowId,
    });
  }

  const preparedById = new Map(
    record.requests.map((request) => [request.agentRequestId, request]),
  );
  for (const result of results) {
    if (!preparedById.has(result.agentRequestId)) {
      throw codedAgentApplyError(
        "unknown_request",
        "agent-run apply result references an unknown request",
        { agentRequestId: result.agentRequestId },
      );
    }
  }

  const lease = acquireHostBridgeAgentRunApplyLease(agentRunId);
  if (!lease) {
    throw codedAgentApplyError(
      record.state === "applying" || record.sealedAt
        ? "agent_run_already_consumed"
        : "agent_run_lifecycle_conflict",
      "agent-run is not available for apply",
      { agentRunId, state: record.state },
    );
  }

  const preflight = [] as Array<{
    result: HostBridgeWorkflowAgentApplyResultRef;
    prepared: HostBridgeAgentRunPreparedRequest;
    bundleReader: BundleReader;
  }>;
  let permission: HostBridgePermissionDecision;
  try {
    const selectedItems = resolveSelectedItemsForSelection(record.selection);
    const selectionContext = await buildSelectionContext(selectedItems);
    const applyStatus = await evaluateAgentRunApplyStatus({
      workflow,
      selectionContext,
    });
    if (!applyStatus.allowed) {
      throw codedAgentApplyError(
        "apply_not_allowed",
        applyStatus.message ||
          "workflow agent-run apply is not currently allowed",
        { reasonCode: applyStatus.reasonCode },
      );
    }
    for (const result of results) {
      const prepared = preparedById.get(result.agentRequestId)!;
      const bundleReader = createAgentApplyBundleReader(result.bundle.path);
      await validateAgentApplyBundle({ bundleReader, prepared });
      preflight.push({ result, prepared, bundleReader });
    }
    recordHostBridgeAgentRunApplyReceipt(agentRunId, {
      agentRunId,
      workflowId: record.workflowId,
      status: "preflight",
      stateChange: "unchanged",
      handleConsumption: "unconsumed",
      recoverable: true,
      results: [],
    });
    permission = await requestAgentRunApplyPermission({
      workflow,
      resultCount: results.length,
      scope: args.scope,
    });
  } catch (error) {
    releaseHostBridgeAgentRunApplyLease(agentRunId);
    throw error;
  }
  if (!sealHostBridgeAgentRunRecord(agentRunId)) {
    releaseHostBridgeAgentRunApplyLease(agentRunId);
    throw codedAgentApplyError(
      "agent_run_already_consumed",
      "agent-run apply lease was lost before write-back",
      { agentRunId },
    );
  }
  recordHostBridgeAgentRunApplyReceipt(agentRunId, {
    agentRunId,
    workflowId: record.workflowId,
    status: "applying",
    stateChange: "unchanged",
    handleConsumption: "consumed",
    recoverable: false,
    results: [],
  });

  const appliedAt = new Date().toISOString();
  const perRequest: HostBridgeWorkflowAgentApplyResult["results"] = [];
  const warnings: string[] = [];
  let succeeded = 0;
  let failed = 0;
  for (const { result, prepared, bundleReader } of preflight) {
    try {
      const workspaceDir =
        typeof bundleReader.getExtractedDir === "function"
          ? await bundleReader.getExtractedDir()
          : result.bundle.path;
      const runResult = {
        status: "succeeded",
        backendStatus: "succeeded",
        requestId: prepared.agentRequestId,
        resultJsonPath: prepared.resultJsonPath,
        resultArtifactBasePath: `result/${prepared.namespace}`,
        workspaceDir,
        bundleDir: workspaceDir,
        responseJson: {
          provider: "agent-run",
          namespace: prepared.namespace,
          resultJsonPath: prepared.resultJsonPath,
        },
      };
      const resultContext = await createWorkflowResultContext({
        runResult,
        bundleReader,
        manifest: workflow.manifest,
      });
      const parent = resolveTargetParentIDFromRequest(prepared.request);
      await executeApplyResult({
        workflow,
        parent,
        bundleReader,
        resultContext,
        request: prepared.request,
        runResult,
      });
      await collectSkillRunFeedbackSidecar({
        workflow,
        request: prepared.request,
        runResult,
        resultContext,
        bundleReader,
        jobId: prepared.agentRequestId,
      });
      if (resultContext.warnings.length > 0) {
        warnings.push(
          ...resultContext.warnings.map(
            (warning) =>
              `${prepared.agentRequestId}: ${warning.code}: ${warning.message}`,
          ),
        );
      }
      succeeded += 1;
      perRequest.push({
        agentRequestId: prepared.agentRequestId,
        requestIndex: prepared.requestIndex,
        namespace: prepared.namespace,
        succeeded: true,
        warningCount: resultContext.warnings.length,
        errorCount: resultContext.errors.length,
      });
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : String(error || "");
      perRequest.push({
        agentRequestId: prepared.agentRequestId,
        requestIndex: prepared.requestIndex,
        namespace: prepared.namespace,
        succeeded: false,
        warningCount: 0,
        errorCount: 1,
        error: message,
      });
    }
  }

  const receiptStatus =
    failed === 0 ? "succeeded" : succeeded > 0 ? "partial" : "failed";
  finishHostBridgeAgentRunRecord({
    agentRunId,
    outcome: receiptStatus,
    ...(failed > 0 ? { error: `${failed} apply-back request(s) failed` } : {}),
  });
  recordHostBridgeAgentRunApplyReceipt(agentRunId, {
    agentRunId,
    workflowId: record.workflowId,
    status: receiptStatus,
    stateChange: succeeded > 0 ? "changed" : "unchanged",
    handleConsumption: "consumed",
    recoverable: false,
    results: perRequest.map((entry) => ({
      agentRequestId: entry.agentRequestId,
      status: entry.succeeded ? "succeeded" : "failed",
      ...(entry.error ? { error: entry.error } : {}),
      ...(!entry.succeeded
        ? {
            safeNextAction:
              "Inspect this receipt before preparing a new agent run.",
          }
        : {}),
    })),
  });

  return {
    agentRunId,
    workflowId: record.workflowId,
    appliedAt,
    permission,
    summary: {
      total: results.length,
      succeeded,
      failed,
    },
    results: perRequest,
    warnings,
    stateChange: succeeded > 0 ? "changed" : "unchanged",
    handleConsumption: "consumed",
  };
}

export function getHostBridgeWorkflowAgentRunApplyReceipt(agentRunId: string) {
  return getHostBridgeAgentRunApplyReceipt(normalizeString(agentRunId));
}

function projectAgentRunLifecycle(
  record: NonNullable<ReturnType<typeof getHostBridgeAgentRunRecord>>,
): HostBridgeWorkflowAgentRunLifecycleResult {
  const mutable = record.state === "prepared" || record.state === "expired";
  return {
    agentRunId: record.agentRunId,
    workflowId: record.workflowId,
    state: record.state,
    leaseExpiresAt: record.expiresAt,
    retentionExpiresAt: record.retentionExpiresAt,
    renewable: mutable,
    abandonable: mutable,
    ...(record.renewedAt ? { renewedAt: record.renewedAt } : {}),
    ...(record.abandonedAt ? { abandonedAt: record.abandonedAt } : {}),
  };
}

function changeHostBridgeWorkflowAgentRunLifecycle(
  agentRunIdInput: string,
  action: "renew" | "abandon",
) {
  const agentRunId = normalizeString(agentRunIdInput);
  const existing =
    getHostBridgeAgentRunRecord(agentRunId) ||
    getExpiredHostBridgeAgentRunRecord(agentRunId);
  if (!existing) {
    throw codedAgentApplyError("agent_run_not_found", "agent-run not found", {
      agentRunId,
    });
  }
  const updated =
    action === "renew"
      ? renewHostBridgeAgentRunRecord(agentRunId)
      : abandonHostBridgeAgentRunRecord(agentRunId);
  if (!updated) {
    throw codedAgentApplyError(
      "agent_run_lifecycle_conflict",
      `agent-run cannot be ${action === "renew" ? "renewed" : "abandoned"} from its current state`,
      { agentRunId, state: existing.state },
    );
  }
  return projectAgentRunLifecycle(updated);
}

export function renewHostBridgeWorkflowAgentRun(agentRunId: string) {
  return changeHostBridgeWorkflowAgentRunLifecycle(agentRunId, "renew");
}

export function abandonHostBridgeWorkflowAgentRun(agentRunId: string) {
  return changeHostBridgeWorkflowAgentRunLifecycle(agentRunId, "abandon");
}

async function evaluateAgentRunApplyStatus(args: {
  workflow: LoadedWorkflow;
  selectionContext: SelectionContext;
}): Promise<HostBridgeWorkflowAgentRunApplyStatus> {
  const validation = await evaluateWorkflowSelection({
    workflow: args.workflow,
    selectionContext: args.selectionContext,
  });
  const allowed = validation.state === "enabled";
  return {
    allowed,
    ...(validation.reasonCode ? { reasonCode: validation.reasonCode } : {}),
    stats: validation.stats,
    message: allowed
      ? "Host-side apply is currently allowed for this selection."
      : "Self-owned execution is allowed, but host-side apply is disabled for this selection.",
  };
}

function describeWorkflowSelection(selection: HostBridgeWorkflowSelection) {
  if (selection.kind === "none") {
    return "Input: no Zotero selection.";
  }
  const count = selection.items.length;
  return `Input: ${count} explicit Zotero item${count === 1 ? "" : "s"}.`;
}

function describeWorkflowExecutionOptions(
  executionOptions: WorkflowExecutionOptions,
) {
  const keys = Object.keys(executionOptions);
  if (!keys.length) {
    return "";
  }
  const preview = keys.slice(0, 4).join(", ");
  const rest = keys.length > 4 ? `, and ${keys.length - 4} more` : "";
  return `Options: ${preview}${rest}.`;
}

function buildWorkflowApprovalRequest(
  workflow: LoadedWorkflow,
  plan: HostBridgeWorkflowSubmitPlan,
) {
  const workflowLabel = localizeWorkflowLabel(workflow);
  const detailLines = [
    `Workflow: ${workflowLabel}`,
    describeWorkflowSelection(plan.selection),
    describeWorkflowExecutionOptions(plan.executionOptions),
    "Source: zotero-bridge CLI.",
    "This may start a workflow backend task and apply workflow results back to Zotero after it completes.",
  ].filter(Boolean);
  return {
    action: "workflow.submit",
    title: "Approve workflow run?",
    summary: `Run "${workflowLabel}" from zotero-bridge.`,
    detail: detailLines.join("\n"),
  };
}

async function resolveWorkflowSubmitPermission(args: {
  approvalRequest: ReturnType<typeof buildWorkflowApprovalRequest>;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}): Promise<HostBridgePermissionDecision> {
  return requestHostBridgePermissionForRequirement({
    ...args.approvalRequest,
    source: "host-bridge-cli",
    scope: args.scope,
    timeoutMs: args.timeoutMs,
  });
}

export async function submitHostBridgeWorkflow(args: {
  payload: HostBridgeWorkflowSubmitRequest;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}): Promise<HostBridgeWorkflowSubmitResult> {
  const { plan, workflow } = await prepareHostBridgeWorkflowSubmit(
    args.payload,
  );
  const approvalRequest = buildWorkflowApprovalRequest(workflow, plan);
  const permission = await resolveWorkflowSubmitPermission({
    approvalRequest,
    scope: args.scope,
    timeoutMs: args.timeoutMs,
  });
  const inputFileIds = Object.values(
    plan.resourceBindings?.inputs || {},
  ).flatMap((binding) => binding.fileIds);
  const lease = inputFileIds.length
    ? await acquireHostBridgeUploadedFileLease(inputFileIds)
    : null;
  let releaseLeaseOnExit = true;
  try {
    const validatedResources = await validateWorkflowResourceBindings({
      manifest: workflow.manifest,
      raw: plan.resourceBindings,
    });
    const resourceApi = await createHostBridgeWorkflowResourceApi({
      workflowId: workflow.manifest.id,
      manifest: workflow.manifest,
      inputs: validatedResources.inputs,
      outputBindings: validatedResources.bindings?.outputs || {},
    });
    const runtime = {
      invocationMode: "non-interactive" as const,
      hostApi: createNonInteractiveWorkflowHostApi({
        base: createWorkflowHostApi(),
        resources: resourceApi,
      }),
    };
    const selectedItems = resolveSelectedItemsForPlan(plan);
    const messageFormatter = createLocalizedMessageFormatter();
    const win = createBridgeWindow(selectedItems);
    const preparation = await runWorkflowPreparationSeam({
      win,
      workflow,
      messageFormatter,
      executionOptionsOverride:
        plan.executionOptions as unknown as WorkflowExecutionOptions,
      ignoreSavedWorkflowSettings: true,
      selectedItemsOverride: selectedItems,
      suppressUiFeedback: true,
      runtime,
    });
    if (preparation.status !== "ready") {
      throw new Error("workflow preparation halted");
    }

    const duplicateGuard = await runWorkflowUnitDuplicateGuardSeam(
      {
        win,
        workflowId: workflow.manifest.id,
        workflowLabel: localizeWorkflowLabel(workflow),
        units: preparation.prepared.plan.units,
      },
      {
        confirmDuplicateSubmission: () => {
          throw createWorkflowInteractionRequiredError(
            "workflow.duplicate-confirmation",
          );
        },
      },
    );
    if (duplicateGuard.allowedUnits.length === 0) {
      throw new Error("workflow submission produced no allowed requests");
    }

    const workflowLabel = localizeWorkflowLabel(workflow);
    const submission = await submitPreparedWorkflowUnits({
      prepared: preparation.prepared,
      units: duplicateGuard.allowedUnits,
      workflowLabel,
      skippedByGuard: duplicateGuard.skippedByDuplicate,
      messageFormatter,
      onTerminal: () => {
        if (lease) {
          releaseHostBridgeUploadedFileLease(lease.leaseId);
          releaseLeaseOnExit = false;
        }
      },
    });
    if (submission.admission === "host-queue") {
      if (lease) {
        releaseLeaseOnExit = false;
      }
      return {
        workflowId: workflow.manifest.id,
        workflowLabel,
        admission: "host-queue",
        submissionId: submission.submissionId!,
        totalUnits: submission.total,
        queuedUnits: submission.queued,
        skippedUnits: submission.skipped,
        submissionUrl: `/bridge/v2/workflows/submissions/${submission.submissionId}`,
        queueUrl: "/bridge/v2/workflows/queue",
        permission,
        resourceOutputs: resourceApi.listOutputs(),
      };
    }

    await submission.completion;
    const runStates = [...submission.executionResults.values()]
      .map((entry) => entry.runState)
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);
    const workflowRunId = runStates[0]?.runId || "";
    return {
      workflowId: workflow.manifest.id,
      workflowLabel,
      admission: "direct",
      workflowRunId,
      jobIds: runStates.flatMap((entry) => entry.jobIds),
      totalJobs: runStates.reduce((total, entry) => total + entry.totalJobs, 0),
      tasks: runStates.flatMap((entry) =>
        listHostBridgeTasks({
          runId: entry.runId,
          includeHistory: false,
        }),
      ),
      permission,
      resourceOutputs: resourceApi.listOutputs(),
    };
  } finally {
    if (lease && releaseLeaseOnExit) {
      releaseHostBridgeUploadedFileLease(lease.leaseId);
    }
  }
}

export function listHostBridgeWorkflowQueue(scope?: WorkflowQueueBackendScope) {
  return {
    units: workflowSubmissionQueue.listQueued(scope),
  };
}

export function getHostBridgeWorkflowSubmission(submissionId: string) {
  const submission = workflowSubmissionQueue.getActiveSubmission(
    submissionId as WorkflowSubmissionId,
  );
  if (!submission) {
    const error = new Error("workflow submission not found or already settled");
    (error as { code?: string }).code = "workflow_submission_not_found";
    throw error;
  }
  return submission;
}

export function cancelHostBridgeWorkflowQueueUnit(queueId: string) {
  const result = workflowSubmissionQueue.cancel(
    queueId as WorkflowQueueEntryId,
  );
  if (result.status !== "canceled") {
    const error = new Error("workflow queue unit is not pending");
    (error as { code?: string }).code = "queue_unit_not_pending";
    throw error;
  }
  return result;
}

function resolveSkillRunIdFromTask(task: Partial<WorkflowTaskRecord>) {
  return (
    normalizeString(task.runKey) ||
    normalizeString(task.requestId) ||
    normalizeString(task.localRunId) ||
    normalizeString(task.id)
  );
}

function isTerminalTaskState(state: string) {
  return state === "succeeded" || state === "failed" || state === "canceled";
}

function isWaitingTaskState(state: string) {
  return state === "waiting_user" || state === "waiting_auth";
}

function isActiveTaskState(state: string) {
  return state === "queued" || state === "running";
}

function isRecoverableAcpSummary(summary?: AcpSkillRunSummary | null) {
  if (!summary) {
    return false;
  }
  if (summary.status === "failed_retriable") {
    return true;
  }
  const recovery = normalizeString(summary.conversationRecoveryState);
  return (
    summary.status === "failed" &&
    (recovery === "available" ||
      recovery === "connecting" ||
      recovery === "connected" ||
      recovery === "failed")
  );
}

function acpSummaryWorkflowTaskState(
  summary: AcpSkillRunSummary,
): WorkflowTaskRecord["state"] {
  if (summary.status === "repairing") {
    return "running";
  }
  if (summary.pendingPermission) {
    return "waiting_user";
  }
  if (summary.status === "failed_retriable") {
    return summary.pendingInteraction ? "waiting_user" : "failed";
  }
  return summary.status;
}

function livenessForSkillRun(args: {
  state: string;
  acp?: AcpSkillRunSummary | null;
}): HostBridgeRunLiveness {
  if (isRecoverableAcpSummary(args.acp)) {
    return "failed_retriable";
  }
  if (isWaitingTaskState(args.state)) {
    return "waiting";
  }
  if (isActiveTaskState(args.state)) {
    return "active";
  }
  if (isTerminalTaskState(args.state)) {
    return "terminal";
  }
  return "unknown";
}

function actionsForSkillRun(args: {
  state: string;
  acp?: AcpSkillRunSummary | null;
  canReply?: boolean;
  canCancelBackendRun?: boolean;
}): HostBridgeSkillRunActions {
  const failedRetriable = isRecoverableAcpSummary(args.acp);
  return {
    canReply:
      (args.state === "waiting_user" ||
        (failedRetriable && !!args.acp?.pendingInteraction)) &&
      (!!args.acp || args.canReply === true),
    canConnect: failedRetriable,
    canCancelWorkflow:
      !isTerminalTaskState(args.state) ||
      failedRetriable ||
      args.canCancelBackendRun === true,
    isFailedRetriable: failedRetriable,
  };
}

function acpSummaryByRequestId() {
  const byRequest = new Map<string, AcpSkillRunSummary>();
  for (const summary of listAcpSkillRunSummaries({ includeArchived: true })) {
    const requestId = normalizeString(summary.requestId);
    if (requestId) {
      byRequest.set(requestId, summary);
    }
  }
  return byRequest;
}

function buildSkillRunFromTask(
  task: HostBridgeWorkflowTaskDto,
  acpByRequest: Map<string, AcpSkillRunSummary>,
): HostBridgeSkillRunDto | null {
  const skillRunId = normalizeString(task.skillRunId);
  if (!skillRunId) {
    return null;
  }
  const acp = task.requestId ? acpByRequest.get(task.requestId) : undefined;
  const workflowTask = task as HostBridgeWorkflowTaskDto & {
    canReply?: boolean;
    canCancelBackendRun?: boolean;
    skillName?: string;
    skillLabel?: string;
    skillId?: string;
  };
  const state = acp?.status === "repairing" ? "running" : task.state;
  const actions = actionsForSkillRun({
    state,
    acp,
    canReply: workflowTask.canReply,
    canCancelBackendRun: workflowTask.canCancelBackendRun,
  });
  const dto: HostBridgeSkillRunDto = {
    skillRunId,
    workflowRunId: task.workflowRunId,
    workflowId: task.workflowId,
    workflowLabel: task.workflowLabel,
    taskName: acp?.taskName || task.taskName,
    state,
    liveness: livenessForSkillRun({ state, acp }),
    updatedAt: acp?.updatedAt || task.updatedAt,
    createdAt: acp?.createdAt || task.createdAt,
    jobId: acp?.jobId || task.jobId,
    requestId: acp?.requestId || task.requestId,
    backendId: acp?.backendId || task.backendId,
    backendType: acp?.backendType || task.backendType,
    providerId: task.providerId,
    requestKind: task.requestKind,
    skillId: acp?.skillId || workflowTask.skillId,
    skillName: acp?.skillName || workflowTask.skillName,
    skillLabel: acp?.skillLabel || workflowTask.skillLabel,
    sequenceStepId: acp?.sequenceStepId || task.sequenceStepId,
    sequenceStepIndex:
      typeof acp?.sequenceStepIndex === "number"
        ? acp.sequenceStepIndex
        : task.sequenceStepIndex,
    sequenceFinalStepId: acp?.sequenceFinalStepId || task.sequenceFinalStepId,
    sequenceRole:
      acp?.sequenceStepId || task.sequenceStepId ? "sequence_step" : "single",
    actions,
  };
  return dto;
}

function skillRunRank(run: HostBridgeSkillRunDto) {
  if (run.liveness === "waiting") {
    return 4;
  }
  if (run.liveness === "failed_retriable") {
    return 3;
  }
  if (run.liveness === "active") {
    return 2;
  }
  if (run.liveness === "terminal") {
    return 1;
  }
  return 0;
}

function currentSkillRunId(skillRuns: HostBridgeSkillRunDto[]) {
  return [...skillRuns].sort((left, right) => {
    const rank = skillRunRank(right) - skillRunRank(left);
    if (rank !== 0) {
      return rank;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  })[0]?.skillRunId;
}

function workflowLiveness(skillRuns: HostBridgeSkillRunDto[]) {
  if (skillRuns.some((run) => run.liveness === "waiting")) {
    return "waiting" as const;
  }
  if (skillRuns.some((run) => run.liveness === "failed_retriable")) {
    return "failed_retriable" as const;
  }
  if (skillRuns.some((run) => run.liveness === "active")) {
    return "active" as const;
  }
  if (
    skillRuns.length > 0 &&
    skillRuns.every((run) => run.liveness === "terminal")
  ) {
    return "terminal" as const;
  }
  return "unknown" as const;
}

function taskToDto(
  task: WorkflowTaskRecord | TaskDashboardHistoryRecord,
  source: "active" | "history",
): HostBridgeWorkflowTaskDto {
  const workflowTask = task as Partial<WorkflowTaskRecord>;
  const skillRunId = resolveSkillRunIdFromTask(workflowTask);
  const dto: HostBridgeWorkflowTaskDto = {
    id: task.id,
    runId: task.runId,
    workflowRunId: task.runId,
    jobId: task.jobId,
    ...(skillRunId ? { skillRunId } : {}),
    workflowId: task.workflowId,
    workflowLabel: task.workflowLabel,
    taskName: task.taskName,
    state: task.state,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    source,
  };
  assignIfString(dto, "runKey", workflowTask.runKey);
  assignIfString(dto, "requestId", task.requestId);
  assignIfString(dto, "submissionId", workflowTask.submissionId);
  assignIfString(dto, "submissionUnitId", workflowTask.submissionUnitId);
  assignIfString(dto, "sequenceStepId", workflowTask.sequenceStepId);
  if (typeof workflowTask.sequenceStepIndex === "number") {
    dto.sequenceStepIndex = workflowTask.sequenceStepIndex;
  }
  assignIfString(dto, "sequenceFinalStepId", workflowTask.sequenceFinalStepId);
  dto.sequenceRole = workflowTask.sequenceStepId ? "sequence_step" : "single";
  if (typeof workflowTask.canReply === "boolean") {
    dto.canReply = workflowTask.canReply;
  }
  if (typeof workflowTask.canCancelBackendRun === "boolean") {
    dto.canCancelBackendRun = workflowTask.canCancelBackendRun;
  }
  assignIfString(dto, "engine", task.engine);
  if (typeof task.targetParentID === "number") {
    dto.targetParentID = task.targetParentID;
  }
  const safeInputUnitIdentity = sanitizeExternalInputUnitIdentity(
    task.inputUnitIdentity,
  );
  if (safeInputUnitIdentity) {
    dto.inputUnitIdentity = safeInputUnitIdentity;
  }
  assignIfString(dto, "inputUnitLabel", task.inputUnitLabel);
  assignIfString(dto, "providerId", task.providerId);
  assignIfString(dto, "requestKind", task.requestKind);
  assignIfString(dto, "backendId", task.backendId);
  assignIfString(dto, "backendType", task.backendType);
  assignIfString(dto, "backendBaseUrl", task.backendBaseUrl);
  const safeError = sanitizeExternalTaskError(task.error);
  if (safeError) {
    dto.error = safeError;
  }
  if ("archivedAt" in task && task.archivedAt) {
    dto.archivedAt = task.archivedAt;
  }
  return dto;
}

function assignIfString<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  value: unknown,
) {
  const normalized = normalizeString(value);
  if (normalized) {
    target[key] = normalized as T[K];
  }
}

function sanitizeExternalInputUnitIdentity(value: unknown) {
  const identity = normalizeString(value);
  if (!identity) {
    return "";
  }
  if (
    identity.toLowerCase().startsWith("attachment-path:") ||
    /^[A-Za-z]:[\\/]/.test(identity) ||
    identity.startsWith("/") ||
    identity.includes("\\") ||
    identity.includes("/")
  ) {
    return "";
  }
  return identity;
}

function sanitizeExternalTaskError(value: unknown) {
  const error = normalizeString(value);
  if (!error) {
    return "";
  }
  return error
    .replace(/[A-Za-z]:[\\/][^\r\n.;,)]*/g, "[redacted-path]")
    .replace(
      /\/(?:Users|home|var|tmp|private|Volumes)\/[^\r\n.;,)]*/g,
      "[redacted-path]",
    );
}

function matchesRunIdFilter(taskRunIdRaw: unknown, requestedRunIdRaw: unknown) {
  const taskRunId = normalizeString(taskRunIdRaw);
  const requestedRunId = normalizeString(requestedRunIdRaw);
  if (!requestedRunId) {
    return true;
  }
  if (taskRunId === requestedRunId) {
    return true;
  }
  if (requestedRunId.includes("-job-")) {
    return false;
  }
  return taskRunId.startsWith(`${requestedRunId}-job-`);
}

function matchesFilters(
  task: HostBridgeWorkflowTaskDto,
  filters: HostBridgeTaskFilters,
) {
  if (filters.workflowId && task.workflowId !== filters.workflowId) {
    return false;
  }
  if (filters.backendId && task.backendId !== filters.backendId) {
    return false;
  }
  if (filters.backendType && task.backendType !== filters.backendType) {
    return false;
  }
  if (filters.requestId && task.requestId !== filters.requestId) {
    return false;
  }
  if (filters.submissionId && task.submissionId !== filters.submissionId) {
    return false;
  }
  if (!matchesRunIdFilter(task.runId, filters.runId)) {
    return false;
  }
  if (filters.state && task.state !== filters.state) {
    return false;
  }
  return true;
}

export function listHostBridgeTasks(
  filters: HostBridgeTaskFilters = {},
): HostBridgeWorkflowTaskDto[] {
  const byId = new Map<string, HostBridgeWorkflowTaskDto>();
  const activeOnly = filters.activeOnly || filters.includeHistory === false;
  const workflowTasks = activeOnly
    ? listActiveWorkflowTaskSummaries({
        backendId: filters.backendId,
        requestId: filters.requestId,
        submissionId: filters.submissionId,
      })
    : listWorkflowTasks();
  for (const task of workflowTasks) {
    if (isAcpSkillRunTask(task)) {
      continue;
    }
    const dto = taskToDto(task, "active");
    if (matchesFilters(dto, filters)) {
      byId.set(dto.id, dto);
    }
  }
  if (!activeOnly && filters.includeHistory !== false) {
    for (const task of listTaskDashboardHistory(filters)) {
      if (isAcpSkillRunTask(task)) {
        continue;
      }
      const dto = taskToDto(task, "history");
      if (matchesFilters(dto, filters) && !byId.has(dto.id)) {
        byId.set(dto.id, dto);
      }
    }
  }
  return Array.from(byId.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function historyLimit(value: unknown, fallback = 20) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(1, Math.min(200, Math.floor(parsed)));
  }
  return fallback;
}

export function listHostBridgeRecentTasks(filters: HostBridgeTaskFilters = {}) {
  return {
    tasks: listHostBridgeTasks({
      ...filters,
      includeHistory: true,
    }).slice(0, historyLimit(filters.limit)),
  };
}

function summarizeRunState(tasks: HostBridgeWorkflowTaskDto[]) {
  if (tasks.length === 0) {
    return "unknown" as const;
  }
  const states = new Set(tasks.map((task) => task.state));
  if (states.has("failed")) {
    return "failed" as const;
  }
  if (states.has("canceled")) {
    return "canceled" as const;
  }
  if (states.has("running")) {
    return "running" as const;
  }
  if (states.has("waiting_user") || states.has("waiting_auth")) {
    return "waiting" as const;
  }
  if (states.has("queued")) {
    return "queued" as const;
  }
  if (states.size === 1 && states.has("succeeded")) {
    return "succeeded" as const;
  }
  return "unknown" as const;
}

function summarizeTasks(
  tasks: HostBridgeWorkflowTaskDto[],
): HostBridgeTaskSummary {
  const summary: HostBridgeTaskSummary = {
    total: tasks.length,
    queued: 0,
    running: 0,
    waiting_user: 0,
    waiting_auth: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const task of tasks) {
    switch (task.state) {
      case "queued":
        summary.queued += 1;
        break;
      case "running":
        summary.running += 1;
        break;
      case "waiting_user":
        summary.waiting_user += 1;
        break;
      case "waiting_auth":
        summary.waiting_auth += 1;
        break;
      case "succeeded":
        summary.succeeded += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "canceled":
        summary.canceled += 1;
        break;
    }
  }
  return summary;
}

function skillRunsAsWorkflowTasks(
  skillRuns: HostBridgeSkillRunDto[],
): HostBridgeWorkflowTaskDto[] {
  return skillRuns.map((skillRun) => ({
    id: skillRun.skillRunId,
    workflowRunId: skillRun.workflowRunId,
    runId: skillRun.workflowRunId,
    jobId: skillRun.jobId || "",
    requestId: skillRun.requestId || skillRun.skillRunId,
    workflowId: skillRun.workflowId || "",
    workflowLabel: skillRun.workflowLabel || skillRun.workflowId || "",
    taskName: skillRun.taskName,
    providerId: skillRun.providerId || skillRun.backendType || "",
    requestKind: skillRun.requestKind || "",
    backendId: skillRun.backendId || "",
    backendType: skillRun.backendType || "",
    backendBaseUrl: "",
    engine: "",
    state: skillRun.state,
    error: undefined,
    createdAt: skillRun.createdAt || skillRun.updatedAt,
    updatedAt: skillRun.updatedAt,
    source: "active" as const,
    skillRunId: skillRun.skillRunId,
  }));
}

function summarizeSkillRuns(skillRuns: HostBridgeSkillRunDto[]) {
  return summarizeTasks(skillRunsAsWorkflowTasks(skillRuns));
}

function workflowStateFromSequenceState(state: SequenceRunState) {
  switch (state.status) {
    case "completed":
      return "succeeded" as const;
    case "failed":
      return "failed" as const;
    case "canceled":
      return "canceled" as const;
    case "waiting_interaction":
      return "waiting" as const;
    case "running_step":
    case "continuing":
      return "running" as const;
    default:
      return "unknown" as const;
  }
}

function workflowStateFromSequenceStateAndSkillRuns(
  state: SequenceRunState,
  skillRuns: HostBridgeSkillRunDto[],
) {
  const rootState = workflowStateFromSequenceState(state);
  if (
    rootState === "succeeded" ||
    rootState === "failed" ||
    rootState === "canceled"
  ) {
    return rootState;
  }
  const stepState = summarizeRunState(skillRunsAsWorkflowTasks(skillRuns));
  if (
    stepState === "waiting" ||
    stepState === "failed" ||
    stepState === "canceled" ||
    stepState === "running"
  ) {
    return stepState;
  }
  return rootState;
}

function workflowLivenessFromSequenceState(
  state: SequenceRunState | null,
  skillRuns: HostBridgeSkillRunDto[],
) {
  const projected = workflowLiveness(skillRuns);
  if (projected !== "unknown" || !state) {
    return projected;
  }
  switch (state.status) {
    case "waiting_interaction":
      return "waiting" as const;
    case "running_step":
    case "continuing":
      return "active" as const;
    case "completed":
    case "failed":
    case "canceled":
      return "terminal" as const;
    default:
      return "unknown" as const;
  }
}

function sequenceStepWorkflowTaskState(
  state: SequenceRunState,
  step: SequenceStepRunState,
): WorkflowTaskRecord["state"] {
  if (step.status === "succeeded") {
    return "succeeded";
  }
  if (step.status === "failed") {
    return "failed";
  }
  if (step.status === "canceled") {
    return "canceled";
  }
  if (step.status === "deferred" || state.status === "waiting_interaction") {
    return "waiting_user";
  }
  if (step.status === "running" || state.status === "continuing") {
    return "running";
  }
  return "queued";
}

function hasSkillRunForRequest(
  runs: Map<string, HostBridgeSkillRunDto>,
  requestId: string,
) {
  if (!requestId) {
    return false;
  }
  if (runs.has(requestId)) {
    return true;
  }
  for (const run of runs.values()) {
    if (normalizeString(run.requestId) === requestId) {
      return true;
    }
  }
  return false;
}

function addSequenceStepSkillRunFallbacks(args: {
  byId: Map<string, HostBridgeSkillRunDto>;
  state?: SequenceRunState | null;
}) {
  const state = args.state;
  if (!state) {
    return;
  }
  for (const step of state.steps) {
    const requestId = normalizeString(step.requestId);
    if (!requestId || hasSkillRunForRequest(args.byId, requestId)) {
      continue;
    }
    const taskState = sequenceStepWorkflowTaskState(state, step);
    args.byId.set(requestId, {
      skillRunId: requestId,
      workflowRunId: state.workflowRunId,
      workflowId: state.workflowId,
      workflowLabel: state.workflowLabel,
      taskName:
        normalizeString(step.skillName) ||
        `${state.workflowLabel || state.workflowId} / ${step.stepId}`,
      state: taskState,
      liveness: livenessForSkillRun({ state: taskState }),
      updatedAt: step.updatedAt || state.updatedAt,
      createdAt: state.createdAt,
      jobId: `${state.jobId}:${step.stepId}`,
      requestId,
      backendId: state.backendId,
      backendType: state.backendType,
      skillId: step.skillId,
      skillName: step.skillName,
      sequenceStepId: step.stepId,
      sequenceStepIndex: step.index,
      sequenceFinalStepId: state.finalStepId,
      sequenceRole: "sequence_step",
      actions: actionsForSkillRun({
        state: taskState,
        canReply: taskState === "waiting_user",
        canCancelBackendRun: !isTerminalTaskState(taskState),
      }),
    });
  }
}

function acpSummaryToSkillRun(
  summary: AcpSkillRunSummary,
): HostBridgeSkillRunDto {
  const state = acpSummaryWorkflowTaskState(summary);
  return {
    skillRunId: summary.requestId,
    workflowRunId: summary.runId || summary.requestId,
    workflowId: summary.workflowId,
    workflowLabel: summary.workflowLabel,
    taskName:
      summary.taskName ||
      summary.skillLabel ||
      summary.skillName ||
      summary.requestId,
    state,
    liveness: livenessForSkillRun({ state, acp: summary }),
    updatedAt: summary.updatedAt,
    createdAt: summary.createdAt,
    jobId: summary.jobId,
    requestId: summary.requestId,
    backendId: summary.backendId,
    backendType: summary.backendType,
    skillId: summary.skillId,
    skillName: summary.skillName,
    skillLabel: summary.skillLabel,
    sequenceStepId: summary.sequenceStepId,
    sequenceStepIndex: summary.sequenceStepIndex,
    sequenceFinalStepId: summary.sequenceFinalStepId,
    sequenceRole: summary.sequenceStepId ? "sequence_step" : "single",
    actions: actionsForSkillRun({
      state,
      acp: summary,
      canReply: summary.status === "waiting_user",
      canCancelBackendRun: !isTerminalTaskState(state),
    }),
  };
}

function buildSkillRunsForWorkflow(args: {
  workflowRunId?: string;
  tasks: HostBridgeWorkflowTaskDto[];
  sequenceState?: SequenceRunState | null;
}) {
  const acpByRequest = acpSummaryByRequestId();
  const byId = new Map<string, HostBridgeSkillRunDto>();
  for (const task of args.tasks) {
    const skillRun = buildSkillRunFromTask(task, acpByRequest);
    if (skillRun) {
      byId.set(skillRun.skillRunId, skillRun);
    }
  }
  const workflowRunId = normalizeString(args.workflowRunId);
  for (const summary of acpByRequest.values()) {
    if (workflowRunId && normalizeString(summary.runId) !== workflowRunId) {
      continue;
    }
    const skillRun = acpSummaryToSkillRun(summary);
    byId.set(skillRun.skillRunId, {
      ...byId.get(skillRun.skillRunId),
      ...skillRun,
    });
  }
  addSequenceStepSkillRunFallbacks({
    byId,
    state: args.sequenceState,
  });
  return Array.from(byId.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function getHostBridgeWorkflowRunStatus(
  runId: string,
): HostBridgeWorkflowRunStatus {
  const normalizedRunId = normalizeString(runId);
  const sequenceState = normalizedRunId
    ? getSequenceRunState(normalizedRunId)
    : null;
  const tasks = normalizedRunId
    ? listHostBridgeTasks({ runId: normalizedRunId, includeHistory: true })
    : [];
  const skillRuns = buildSkillRunsForWorkflow({
    workflowRunId: normalizedRunId,
    tasks,
    sequenceState,
  });
  const first = tasks[0];
  const firstSkillRun = skillRuns[0];
  const found = !!sequenceState || tasks.length > 0 || skillRuns.length > 0;
  const state = sequenceState
    ? workflowStateFromSequenceStateAndSkillRuns(sequenceState, skillRuns)
    : tasks.length > 0
      ? summarizeRunState(tasks)
      : summarizeRunState(skillRunsAsWorkflowTasks(skillRuns));
  return {
    runId: normalizedRunId,
    workflowRunId: normalizedRunId,
    found,
    state,
    workflowId:
      sequenceState?.workflowId ||
      first?.workflowId ||
      firstSkillRun?.workflowId,
    workflowLabel:
      sequenceState?.workflowLabel ||
      first?.workflowLabel ||
      firstSkillRun?.workflowLabel,
    liveness: workflowLivenessFromSequenceState(sequenceState, skillRuns),
    skillRuns,
    currentSkillRunId: currentSkillRunId(skillRuns),
    tasks,
    summary:
      sequenceState || tasks.length === 0
        ? summarizeSkillRuns(skillRuns)
        : summarizeTasks(tasks),
    updatedAt:
      sequenceState?.updatedAt || first?.updatedAt || firstSkillRun?.updatedAt,
  };
}

function sequenceStateMatchesFilters(
  state: SequenceRunState,
  filters: HostBridgeTaskFilters,
) {
  if (filters.workflowId && state.workflowId !== filters.workflowId) {
    return false;
  }
  if (filters.backendId && state.backendId !== filters.backendId) {
    return false;
  }
  if (filters.backendType && state.backendType !== filters.backendType) {
    return false;
  }
  if (
    filters.runId &&
    !matchesRunIdFilter(state.workflowRunId, filters.runId)
  ) {
    return false;
  }
  if (filters.state) {
    const workflowState = workflowStateFromSequenceState(state);
    if (
      filters.state !== workflowState &&
      !(filters.state === "waiting_user" && workflowState === "waiting")
    ) {
      return false;
    }
  }
  return true;
}

export function listHostBridgeWorkflowRuns(
  filters: HostBridgeTaskFilters = {},
) {
  const tasks = listHostBridgeTasks({
    ...filters,
    includeHistory: true,
  });
  const runIds = new Set<string>();
  const runs: HostBridgeWorkflowRunStatus[] = [];
  for (const task of tasks) {
    const runId = normalizeString(task.workflowRunId || task.runId);
    if (!runId || runIds.has(runId)) {
      continue;
    }
    runIds.add(runId);
    runs.push(getHostBridgeWorkflowRunStatus(runId));
  }
  for (const sequenceState of listSequenceRunStates()) {
    const runId = normalizeString(sequenceState.workflowRunId);
    if (
      !runId ||
      runIds.has(runId) ||
      !sequenceStateMatchesFilters(sequenceState, filters)
    ) {
      continue;
    }
    runIds.add(runId);
    runs.push(getHostBridgeWorkflowRunStatus(runId));
  }
  return {
    runs: runs.sort((left, right) =>
      normalizeString(right.updatedAt).localeCompare(
        normalizeString(left.updatedAt),
      ),
    ),
  };
}

export function listHostBridgeActiveTasks(): HostBridgeActiveTaskDto[] {
  const tasks = listHostBridgeTasks({
    includeHistory: false,
    activeOnly: true,
  });
  const acpByRequest = acpSummaryByRequestId();
  const rows = new Map<string, HostBridgeActiveTaskDto>();
  for (const task of tasks) {
    const skillRun = buildSkillRunFromTask(task, acpByRequest);
    if (!skillRun) {
      continue;
    }
    if (
      skillRun.liveness !== "active" &&
      skillRun.liveness !== "waiting" &&
      skillRun.liveness !== "failed_retriable"
    ) {
      continue;
    }
    rows.set(skillRun.skillRunId, {
      workflowRunId: skillRun.workflowRunId,
      skillRunId: skillRun.skillRunId,
      workflowId: skillRun.workflowId,
      taskName: skillRun.taskName,
      state: skillRun.state,
      liveness: skillRun.liveness,
      updatedAt: skillRun.updatedAt,
      sequenceStepId: skillRun.sequenceStepId,
      sequenceStepIndex: skillRun.sequenceStepIndex,
      sequenceFinalStepId: skillRun.sequenceFinalStepId,
      actions: skillRun.actions,
    });
  }
  for (const acp of acpByRequest.values()) {
    const skillRun = acpSummaryToSkillRun(acp);
    if (
      skillRun.liveness === "active" ||
      skillRun.liveness === "waiting" ||
      skillRun.liveness === "failed_retriable"
    ) {
      rows.set(skillRun.skillRunId, {
        workflowRunId: skillRun.workflowRunId,
        skillRunId: skillRun.skillRunId,
        workflowId: skillRun.workflowId,
        taskName: skillRun.taskName,
        state: skillRun.state,
        liveness: skillRun.liveness,
        updatedAt: skillRun.updatedAt,
        sequenceStepId: skillRun.sequenceStepId,
        sequenceStepIndex: skillRun.sequenceStepIndex,
        sequenceFinalStepId: skillRun.sequenceFinalStepId,
        actions: skillRun.actions,
      });
    }
  }
  return Array.from(rows.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listHostBridgeRecentSkillRuns(
  filters: HostBridgeTaskFilters = {},
) {
  const acpByRequest = acpSummaryByRequestId();
  const byId = new Map<string, HostBridgeSkillRunDto>();
  for (const task of listHostBridgeTasks({
    ...filters,
    includeHistory: true,
  })) {
    const skillRun = buildSkillRunFromTask(task, acpByRequest);
    if (skillRun && (!filters.state || skillRun.state === filters.state)) {
      byId.set(skillRun.skillRunId, skillRun);
    }
  }
  for (const summary of acpByRequest.values()) {
    const skillRun = acpSummaryToSkillRun(summary);
    if (filters.workflowId && skillRun.workflowId !== filters.workflowId) {
      continue;
    }
    if (filters.backendId && skillRun.backendId !== filters.backendId) {
      continue;
    }
    if (filters.backendType && skillRun.backendType !== filters.backendType) {
      continue;
    }
    if (filters.state && skillRun.state !== filters.state) {
      continue;
    }
    byId.set(skillRun.skillRunId, skillRun);
  }
  return {
    skillRuns: Array.from(byId.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    ),
  };
}

function skillRunError(code: string, message: string, details?: unknown) {
  const error = new Error(message);
  (error as { code?: string; details?: unknown }).code = code;
  if (typeof details !== "undefined") {
    (error as { details?: unknown }).details = details;
  }
  return error;
}

export function getHostBridgeSkillRun(
  skillRunIdRaw: string,
): HostBridgeSkillRunDto {
  const skillRunId = normalizeString(skillRunIdRaw);
  if (!skillRunId) {
    throw skillRunError("invalid_skill_run_id", "skillRunId is required");
  }
  const acp = getAcpSkillRunRecord(skillRunId);
  if (acp) {
    return acpSummaryToSkillRun({
      requestId: acp.requestId,
      status: acp.status,
      backendStatus: acp.backendStatus,
      backendId: acp.backendId,
      backendType: acp.backendType,
      backendLabel: acp.backendLabel,
      workflowId: acp.workflowId,
      workflowLabel: acp.workflowLabel,
      jobId: acp.jobId,
      runId: acp.runId,
      sequenceStepId: acp.sequenceStepId,
      sequenceStepIndex: acp.sequenceStepIndex,
      taskName: acp.taskName,
      skillName: acp.skillName,
      skillLabel: acp.skillLabel,
      skillId: acp.skillId,
      executionMode: acp.executionMode,
      workspaceDir: acp.workspaceDir,
      agentFamily: acp.agentFamily,
      conversationState: acp.conversationState,
      conversationRecoveryState: acp.conversationRecoveryState,
      conversationError: acp.conversationError,
      replyState: acp.replyState,
      connectionActionState: acp.connectionActionState,
      applyResultState: acp.applyResultState,
      pendingPermission: acp.pendingPermission || null,
      activePrompt: acp.activePrompt,
      error: acp.error,
      removedAt: acp.removedAt,
      archivedAt: acp.archivedAt,
      createdAt: acp.createdAt,
      updatedAt: acp.updatedAt,
    });
  }
  for (const task of listHostBridgeTasks({ includeHistory: true })) {
    if (task.skillRunId === skillRunId) {
      const skillRun = buildSkillRunFromTask(task, acpSummaryByRequestId());
      if (skillRun) {
        return skillRun;
      }
    }
  }
  throw skillRunError("skill_run_not_found", "Skill run not found", {
    skillRunId,
  });
}

export function listHostBridgeSkillRunEvents(
  skillRunIdRaw: string,
  filters: { sinceUpdatedAt?: string; limit?: number } = {},
) {
  const skillRun = getHostBridgeSkillRun(skillRunIdRaw);
  refreshHostBridgeNotificationProjection({ skillRunId: skillRun.skillRunId });
  const notifications = listHostBridgeNotificationEvents({
    skillRunId: skillRun.skillRunId,
    limit: historyLimit(filters.limit),
  }).notifications;
  const sinceUpdatedAt = normalizeString(filters.sinceUpdatedAt);
  const events = notifications
    .filter((event) => !sinceUpdatedAt || event.createdAt > sinceUpdatedAt)
    .map(
      (event): HostBridgeSkillRunEventDto => ({
        eventId: event.eventId,
        type: event.type,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
        workflowRunId: event.workflowRunId,
        skillRunId: skillRun.skillRunId,
        workflowId: event.workflowId,
        taskName: event.taskName,
        state: event.state,
        liveness: event.liveness,
        summary: event.summary,
        actions: event.actions,
      }),
    );
  return {
    skillRun,
    events,
    returned: events.length,
  };
}

function refreshHostBridgeNotificationProjection(
  filters: HostBridgeNotificationFilters = {},
) {
  const workflowRunId = normalizeString(filters.workflowRunId);
  const skillRunId = normalizeString(filters.skillRunId);
  const runIds = new Set<string>();

  if (workflowRunId) {
    projectWorkflowRunNotifications(
      getHostBridgeWorkflowRunStatus(workflowRunId),
    );
    return;
  }

  if (skillRunId) {
    try {
      const skillRun = getHostBridgeSkillRun(skillRunId);
      projectSkillRunNotification(skillRun);
      if (skillRun.workflowRunId) {
        runIds.add(skillRun.workflowRunId);
      }
    } catch {
      return;
    }
  } else {
    const acpByRequest = acpSummaryByRequestId();
    for (const task of listHostBridgeTasks({ includeHistory: false })) {
      if (task.workflowRunId) {
        runIds.add(task.workflowRunId);
      }
      const skillRun = buildSkillRunFromTask(task, acpByRequest);
      if (skillRun) {
        projectSkillRunNotification(skillRun);
      }
    }
    for (const acp of acpByRequest.values()) {
      const skillRun = acpSummaryToSkillRun(acp);
      projectSkillRunNotification(skillRun);
      if (skillRun.workflowRunId) {
        runIds.add(skillRun.workflowRunId);
      }
    }
    const now = Date.now();
    if (
      now - broadNotificationHistoryProjectedAt >=
      BROAD_NOTIFICATION_HISTORY_PROJECTION_TTL_MS
    ) {
      broadNotificationHistoryProjectedAt = now;
      for (const task of listHostBridgeTasks({ includeHistory: true })) {
        if (task.source !== "history") {
          continue;
        }
        if (task.workflowRunId) {
          runIds.add(task.workflowRunId);
        }
        const skillRun = buildSkillRunFromTask(task, acpByRequest);
        if (skillRun) {
          projectSkillRunNotification(skillRun);
        }
      }
    }
  }

  for (const runId of runIds) {
    projectWorkflowRunNotifications(getHostBridgeWorkflowRunStatus(runId));
  }
}

export function listHostBridgeNotifications(
  filters: HostBridgeNotificationFilters = {},
): HostBridgeNotificationListResult {
  return listHostBridgeNotificationEvents(filters);
}

export function ackHostBridgeNotifications(
  eventIds: string[],
  clientId?: string,
): HostBridgeNotificationAckResult {
  return acknowledgeHostBridgeNotificationEvents(eventIds, clientId);
}

export function resetHostBridgeNotificationProjectionForTests() {
  broadNotificationHistoryProjectedAt = 0;
}

function scopedCancelDecision(args: {
  scope?: HostBridgePermissionScope | null;
  workflowRunId: string;
  skillRuns: HostBridgeSkillRunDto[];
}): HostBridgePermissionDecision | null {
  const scopeRequestId = normalizeString(args.scope?.requestId);
  const scopeRunId = normalizeString(args.scope?.runId);
  const scopeIds = new Set([scopeRequestId, scopeRunId].filter(Boolean));
  if (scopeIds.size === 0) {
    return null;
  }
  const matchesWorkflow = scopeIds.has(args.workflowRunId);
  const matchesSkillRun = args.skillRuns.some(
    (run) =>
      scopeIds.has(run.skillRunId) ||
      (run.requestId ? scopeIds.has(run.requestId) : false),
  );
  if (!matchesWorkflow && !matchesSkillRun) {
    return null;
  }
  const channel =
    args.scope?.kind === "skillrunner-run"
      ? "skillrunner-run"
      : args.scope?.kind === "acp-chat"
        ? "acp-chat"
        : args.scope?.kind === "acp-skill-run" || args.scope?.kind === "acp-run"
          ? "acp-skill-run"
          : "global";
  return {
    outcome: "approved",
    requestId: "host-bridge-workflow-cancel-scoped",
    channel,
  };
}

async function resolveWorkflowCancelPermission(args: {
  workflowRunId: string;
  skillRuns: HostBridgeSkillRunDto[];
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}) {
  const scoped = scopedCancelDecision(args);
  if (scoped) {
    return scoped;
  }
  return requestHostBridgePermissionForRequirement({
    action: "workflow.cancel",
    title: "Cancel workflow run?",
    summary: `Cancel workflow run ${args.workflowRunId}.`,
    detail:
      "This records a cancellation intent and attempts to cancel active supported skill runs. It does not guarantee immediate terminal status.",
    source: "host-bridge-cli",
    scope: args.scope,
    timeoutMs: args.timeoutMs,
  });
}

export async function cancelHostBridgeWorkflowRun(args: {
  workflowRunId: string;
  reason?: string;
  message?: string;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}): Promise<HostBridgeWorkflowCancelResult> {
  const workflowRunId = normalizeString(args.workflowRunId);
  if (!workflowRunId) {
    throw skillRunError("workflow_run_not_found", "Workflow run not found");
  }
  const status = getHostBridgeWorkflowRunStatus(workflowRunId);
  if (!status.found) {
    throw skillRunError("workflow_run_not_found", "Workflow run not found", {
      workflowRunId,
    });
  }
  const permission = await resolveWorkflowCancelPermission({
    workflowRunId,
    skillRuns: status.skillRuns,
    scope: args.scope,
    timeoutMs: args.timeoutMs,
  });
  for (const skillRun of status.skillRuns) {
    if (
      skillRun.backendType === "acp" &&
      skillRun.requestId &&
      !isTerminalTaskState(skillRun.state)
    ) {
      try {
        await cancelAcpSkillRun(skillRun.requestId);
      } catch {
        // Cancellation is an intent; individual backend failures are reflected by later status reads.
      }
    }
  }
  return {
    accepted: true,
    workflowRunId,
    cancelRequestedAt: new Date().toISOString(),
    affectedSkillRuns: status.skillRuns,
    permission,
  };
}

export async function replyHostBridgeSkillRun(args: {
  skillRunId: string;
  message: string;
}) {
  const skillRun = getHostBridgeSkillRun(args.skillRunId);
  if (skillRun.backendType !== "acp" || !skillRun.requestId) {
    throw skillRunError(
      "unsupported_interaction_backend",
      "Skill run reply is only supported for ACP skill runs",
      { skillRunId: skillRun.skillRunId },
    );
  }
  if (!skillRun.actions.canReply) {
    throw skillRunError("skill_run_not_waiting", "Skill run is not waiting", {
      skillRunId: skillRun.skillRunId,
      state: skillRun.state,
    });
  }
  await replyAcpSkillRun({
    requestId: skillRun.requestId,
    message: args.message,
  });
  return getHostBridgeSkillRun(skillRun.skillRunId);
}

export async function connectHostBridgeSkillRun(args: { skillRunId: string }) {
  const skillRun = getHostBridgeSkillRun(args.skillRunId);
  if (skillRun.backendType !== "acp" || !skillRun.requestId) {
    throw skillRunError(
      "unsupported_interaction_backend",
      "Skill run connect is only supported for ACP skill runs",
      { skillRunId: skillRun.skillRunId },
    );
  }
  if (!skillRun.actions.canConnect) {
    throw skillRunError(
      "skill_run_not_recoverable",
      "Skill run is not recoverable",
      { skillRunId: skillRun.skillRunId, state: skillRun.state },
    );
  }
  await connectAcpSkillRun(skillRun.requestId);
  return getHostBridgeSkillRun(skillRun.skillRunId);
}
