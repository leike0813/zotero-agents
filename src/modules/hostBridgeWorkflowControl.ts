import {
  getLoadedWorkflowSourceById,
} from "./workflowRuntime";
import { getVisibleLoadedWorkflowEntries } from "./workflowVisibility";
import {
  listActiveWorkflowTasks,
  listWorkflowTasks,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  listTaskDashboardHistory,
  type TaskDashboardHistoryRecord,
} from "./taskDashboardHistory";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import {
  requestHostBridgePermission,
  type HostBridgePermissionDecision,
  type HostBridgePermissionScope,
} from "./hostBridgePermissionManager";
import { runWorkflowPreparationSeam } from "./workflowExecution/preparationSeam";
import { runWorkflowDuplicateGuardSeam } from "./workflowExecution/duplicateGuardSeam";
import { runWorkflowExecutionSeam } from "./workflowExecution/runSeam";
import { runWorkflowApplySeam } from "./workflowExecution/applySeam";
import { createLocalizedMessageFormatter } from "./workflowExecution/messageFormatter";
import type { WorkflowExecutionOptions } from "./workflowSettingsDomain";
import type { LoadedWorkflow } from "../workflows/types";
import { localizeWorkflowLabel } from "../workflows/localization";

export type HostBridgeWorkflowControlManifest = {
  supported: true;
  endpoints: string[];
  explicitInputRequired: true;
  submitRequiresApproval: true;
};

export type HostBridgeWorkflowSummary = {
  id: string;
  label: string;
  provider: string;
  version?: string;
  sourceKind: "builtin" | "user" | "";
  packageId?: string;
  configurable: boolean;
  acceptsNoSelection: boolean;
  inputUnit?: string;
  parameters: string[];
};

export type HostBridgeWorkflowInput =
  | {
      kind: "items";
      items: HostBridgeWorkflowItemRef[];
    }
  | {
      kind: "none";
    };

export type HostBridgeWorkflowItemRef = {
  key?: string;
  id?: number;
  libraryId?: number;
};

export type HostBridgeWorkflowSubmitRequest = {
  workflowId?: unknown;
  input?: unknown;
  executionOptions?: unknown;
  presentation?: unknown;
};

export type HostBridgeWorkflowSubmitPlan = {
  workflowId: string;
  input: HostBridgeWorkflowInput;
  executionOptions: Record<string, unknown>;
  presentation: {
    notify: false;
    openWorkspace: false;
  };
};

export type HostBridgeWorkflowSubmitResult = {
  workflowId: string;
  workflowLabel: string;
  runId: string;
  jobIds: string[];
  totalJobs: number;
  tasks: HostBridgeWorkflowTaskDto[];
  permission: HostBridgePermissionDecision;
};

export type HostBridgeTaskFilters = {
  workflowId?: string;
  backendId?: string;
  backendType?: string;
  requestId?: string;
  runId?: string;
  state?: string;
  includeHistory?: boolean;
  activeOnly?: boolean;
};

export type HostBridgeWorkflowTaskDto = {
  id: string;
  runId: string;
  jobId: string;
  requestId?: string;
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
  error?: string;
  createdAt: string;
  updatedAt: string;
  source: "active" | "history";
  archivedAt?: string;
};

export type HostBridgeWorkflowRunStatus = {
  runId: string;
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
  tasks: HostBridgeWorkflowTaskDto[];
  summary: HostBridgeTaskSummary;
  updatedAt?: string;
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
      "GET /bridge/v1/workflows",
      "POST /bridge/v1/workflows/submit",
      "GET /bridge/v1/workflows/runs/{runId}",
      "GET /bridge/v1/tasks",
    ],
    explicitInputRequired: true,
    submitRequiresApproval: true,
  };
}

export function listHostBridgeWorkflows(): HostBridgeWorkflowSummary[] {
  return getVisibleLoadedWorkflowEntries().map((entry) => {
    const manifest = entry.manifest;
    return {
      id: manifest.id,
      label: localizeWorkflowLabel(entry),
      provider: manifest.provider,
      version: manifest.version,
      sourceKind:
        entry.workflowSourceKind || getLoadedWorkflowSourceById(manifest.id),
      packageId: entry.packageId,
      configurable: Object.keys(manifest.parameters || {}).length > 0,
      acceptsNoSelection: canWorkflowRunWithoutSelection(manifest),
      inputUnit: manifest.inputs?.unit,
      parameters: Object.keys(manifest.parameters || {}),
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
    confirm: () => true,
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

export function parseHostBridgeWorkflowSubmitRequest(
  payload: HostBridgeWorkflowSubmitRequest,
): HostBridgeWorkflowSubmitPlan {
  const workflowId = normalizeString(payload?.workflowId);
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  if (!isObject(payload?.input)) {
    throw new Error("explicit workflow input is required");
  }

  const inputRaw = payload.input;
  let input: HostBridgeWorkflowInput;
  if (normalizeString(inputRaw.kind) === "none") {
    input = { kind: "none" };
  } else if (Array.isArray(inputRaw.items)) {
    const items = inputRaw.items
      .map(parseItemRef)
      .filter((entry): entry is HostBridgeWorkflowItemRef => !!entry);
    if (items.length !== inputRaw.items.length || items.length === 0) {
      throw new Error("input.items must contain explicit Zotero item refs");
    }
    input = {
      kind: "items",
      items,
    };
  } else {
    throw new Error("input must contain non-empty items or kind=none");
  }

  return {
    workflowId,
    input,
    executionOptions: isObject(payload.executionOptions)
      ? { ...payload.executionOptions }
      : {},
    presentation: {
      notify: false,
      openWorkspace: false,
    },
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

function resolveSelectedItemsForPlan(plan: HostBridgeWorkflowSubmitPlan) {
  if (plan.input.kind === "none") {
    return [];
  }
  return plan.input.items.map(resolveZoteroItemRef);
}

export function prepareHostBridgeWorkflowSubmit(
  payload: HostBridgeWorkflowSubmitRequest,
) {
  const plan = parseHostBridgeWorkflowSubmitRequest(payload);
  const workflow = getWorkflowById(plan.workflowId);
  if (!workflow) {
    const error = new Error("workflow not found");
    (error as { code?: string }).code = "workflow_not_found";
    throw error;
  }
  if (
    plan.input.kind === "none" &&
    !canWorkflowRunWithoutSelection(workflow.manifest)
  ) {
    throw new Error("input.kind=none is only valid for no-selection workflows");
  }
  return { plan, workflow };
}

function describeWorkflowInput(input: HostBridgeWorkflowInput) {
  if (input.kind === "none") {
    return "Input: no Zotero selection.";
  }
  const count = input.items.length;
  return `Input: ${count} explicit Zotero item${count === 1 ? "" : "s"}.`;
}

function describeWorkflowExecutionOptions(
  executionOptions: Record<string, unknown>,
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
    describeWorkflowInput(plan.input),
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

export async function submitHostBridgeWorkflow(args: {
  payload: HostBridgeWorkflowSubmitRequest;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}): Promise<HostBridgeWorkflowSubmitResult> {
  const { plan, workflow } = prepareHostBridgeWorkflowSubmit(args.payload);
  const approvalRequest = buildWorkflowApprovalRequest(workflow, plan);
  const permission = await requestHostBridgePermission({
    ...approvalRequest,
    source: "host-bridge-cli",
    scope: args.scope,
    timeoutMs: args.timeoutMs,
  });
  const selectedItems = resolveSelectedItemsForPlan(plan);
  const messageFormatter = createLocalizedMessageFormatter();
  const win = createBridgeWindow(selectedItems);
  const preparation = await runWorkflowPreparationSeam({
    win,
    workflow,
    messageFormatter,
    executionOptionsOverride:
      plan.executionOptions as unknown as WorkflowExecutionOptions,
    selectedItemsOverride: selectedItems,
    suppressUiFeedback: true,
  });
  if (preparation.status !== "ready") {
    throw new Error("workflow preparation halted");
  }

  const duplicateGuard = await runWorkflowDuplicateGuardSeam(
    {
      win,
      workflowId: workflow.manifest.id,
      workflowLabel: localizeWorkflowLabel(workflow),
      requests: preparation.prepared.requests,
    },
    {
      confirmDuplicateSubmission: () => true,
    },
  );
  if (duplicateGuard.allowedRequests.length === 0) {
    throw new Error("workflow submission produced no allowed requests");
  }

  const runState = runWorkflowExecutionSeam({
    prepared: {
      ...preparation.prepared,
      requests: duplicateGuard.allowedRequests,
    },
  });
  void runState.idlePromise
    .then(() =>
      runWorkflowApplySeam({
        runState,
        messageFormatter,
      }),
    )
    .catch(() => undefined);

  return {
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    runId: runState.runId,
    jobIds: runState.jobIds,
    totalJobs: runState.totalJobs,
    tasks: listHostBridgeTasks({
      runId: runState.runId,
      includeHistory: false,
    }),
    permission,
  };
}

function taskToDto(
  task: WorkflowTaskRecord | TaskDashboardHistoryRecord,
  source: "active" | "history",
): HostBridgeWorkflowTaskDto {
  const dto: HostBridgeWorkflowTaskDto = {
    id: task.id,
    runId: task.runId,
    jobId: task.jobId,
    workflowId: task.workflowId,
    workflowLabel: task.workflowLabel,
    taskName: task.taskName,
    state: task.state,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    source,
  };
  assignIfString(dto, "requestId", task.requestId);
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
    .replace(/\/(?:Users|home|var|tmp|private|Volumes)\/[^\r\n.;,)]*/g, "[redacted-path]");
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
  if (filters.runId && task.runId !== filters.runId) {
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
    ? listActiveWorkflowTasks()
    : listWorkflowTasks();
  for (const task of workflowTasks) {
    const dto = taskToDto(task, "active");
    if (matchesFilters(dto, filters)) {
      byId.set(dto.id, dto);
    }
  }
  if (!activeOnly && filters.includeHistory !== false) {
    for (const task of listTaskDashboardHistory(filters)) {
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

export function getHostBridgeWorkflowRunStatus(
  runId: string,
): HostBridgeWorkflowRunStatus {
  const normalizedRunId = normalizeString(runId);
  const tasks = normalizedRunId
    ? listHostBridgeTasks({ runId: normalizedRunId, includeHistory: true })
    : [];
  const first = tasks[0];
  return {
    runId: normalizedRunId,
    found: tasks.length > 0,
    state: summarizeRunState(tasks),
    workflowId: first?.workflowId,
    workflowLabel: first?.workflowLabel,
    tasks,
    summary: summarizeTasks(tasks),
    updatedAt: first?.updatedAt,
  };
}
