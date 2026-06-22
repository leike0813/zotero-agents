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
import { buildWorkflowSettingsUiDescriptor } from "./workflowSettings";
import type { WorkflowExecutionOptions } from "./workflowSettingsDomain";
import { buildSelectionContext } from "./selectionContext";
import {
  buildHostBridgeWorkflowAgentRunHandoff,
  type HostBridgeWorkflowAgentRunApplyStatus,
  type HostBridgeWorkflowAgentRunResult,
} from "./hostBridgeWorkflowAgentRun";
import type { SelectionContext } from "./selectionContext";
import type { LoadedWorkflow } from "../workflows/types";
import { localizeWorkflowLabel } from "../workflows/localization";
import { evaluateWorkflowSelection } from "../workflows/workflowSelectionValidation";

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
  selectionValidation?: {
    policy?: string;
    excludes?: string[];
    derives?: string[];
  };
  parameters: string[];
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
  input?: unknown;
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

export type HostBridgeWorkflowSubmitPlan = {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  workflowOptions: Record<string, unknown>;
  providerProfile: {
    backendId?: string;
    providerOptions: Record<string, unknown>;
  };
  executionOptions: WorkflowExecutionOptions;
};

export type HostBridgeWorkflowAgentRunPlan = {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
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

export type HostBridgeWorkflowDescribeRequest = {
  workflowId?: unknown;
  workflowOptions?: unknown;
  providerProfile?: unknown;
};

export type HostBridgeWorkflowDescribeResult = {
  workflowId: string;
  workflowLabel: string;
  providerId: string;
  selection: {
    acceptsNoSelection: boolean;
    inputUnit?: string;
    selectionValidation?: HostBridgeWorkflowSummary["selectionValidation"];
  };
  workflowOptions: {
    schema: unknown[];
    normalized: Record<string, unknown>;
  };
  providerProfile: {
    requiresBackendProfile: boolean;
    profiles: Array<{ id: string; label: string }>;
    selectedBackendId: string;
    providerOptionsSchema: unknown[];
    normalizedProviderOptions: Record<string, unknown>;
  };
  blockedReason?: string;
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
      "POST /bridge/v1/workflows/describe",
      "POST /bridge/v1/workflows/submit",
      "POST /bridge/v1/workflows/agent-run",
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
      selectionValidation: manifest.validateSelection
        ? {
            policy: manifest.validateSelection.select?.policy,
            excludes: (manifest.validateSelection.exclude || []).map(
              (entry) => entry.kind,
            ),
            derives: manifest.validateSelection.derive || [],
          }
        : undefined,
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
    normalized === "endpoint" ||
    normalized === "autoapproveacppermissions"
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
    throw codedWorkflowValidationError(
      errorCode,
      "selection is required",
    );
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
}): WorkflowExecutionOptions {
  return {
    ...(args.providerProfile.backendId
      ? { backendId: args.providerProfile.backendId }
      : {}),
    workflowParams: { ...args.workflowOptions },
    providerOptions: { ...args.providerProfile.providerOptions },
  };
}

function parseHostBridgeWorkflowRequestBase(
  payload: HostBridgeWorkflowSubmitRequest | HostBridgeWorkflowDescribeRequest,
  errorCode: string,
) {
  const workflowId = normalizeString(payload?.workflowId);
  if (!workflowId) {
    throw codedWorkflowValidationError(errorCode, "workflowId is required");
  }
  let workflowOptions: Record<string, unknown>;
  let providerProfile: ReturnType<typeof parseProviderProfile>;
  try {
    workflowOptions = parseWorkflowOptions(payload.workflowOptions);
    providerProfile = parseProviderProfile(payload.providerProfile);
  } catch (error) {
    if (error && typeof error === "object") {
      (error as { code?: string }).code = errorCode;
    }
    throw error;
  }
  return {
    workflowId,
    workflowOptions,
    providerProfile,
    executionOptions: buildWorkflowExecutionOptions({
      workflowOptions,
      providerProfile,
    }),
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
  const selection = parseWorkflowSelection(payload.selection);
  return {
    ...base,
    selection,
  };
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

function workflowSelectionValidationSummary(workflow: LoadedWorkflow) {
  const validateSelection = workflow.manifest.validateSelection;
  return validateSelection
    ? {
        policy: validateSelection.select?.policy,
        excludes: (validateSelection.exclude || []).map((entry) => entry.kind),
        derives: validateSelection.derive || [],
      }
    : undefined;
}

export async function describeHostBridgeWorkflow(
  payload: HostBridgeWorkflowDescribeRequest,
): Promise<HostBridgeWorkflowDescribeResult> {
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
    draft: base.executionOptions,
    autoSelectFallbackProfile: false,
    ignoreSavedSettings: true,
  });
  return {
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    providerId: descriptor.providerId,
    selection: {
      acceptsNoSelection: canWorkflowRunWithoutSelection(workflow.manifest),
      inputUnit: workflow.manifest.inputs?.unit,
      selectionValidation: workflowSelectionValidationSummary(workflow),
    },
    workflowOptions: {
      schema: descriptor.workflowSchemaEntries,
      normalized: descriptor.workflowParams,
    },
    providerProfile: {
      requiresBackendProfile: descriptor.requiresBackendProfile,
      profiles: descriptor.profiles,
      selectedBackendId: descriptor.selectedProfile,
      providerOptionsSchema: descriptor.providerSchemaEntries,
      normalizedProviderOptions: descriptor.providerOptions,
    },
    ...(descriptor.blockedReason
      ? { blockedReason: descriptor.blockedReason }
      : {}),
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
  const plan = parseHostBridgeWorkflowSubmitRequest(payload);
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
  const explicitBackendId = normalizeString(plan.providerProfile.backendId);
  if (explicitBackendId && descriptor.selectedProfile !== explicitBackendId) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "providerProfile.backendId is not compatible with this workflow",
    );
  }
  if (
    descriptor.requiresBackendProfile &&
    !explicitBackendId
  ) {
    throw codedWorkflowValidationError(
      "invalid_workflow_submit_request",
      "providerProfile.backendId is required for this workflow",
    );
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
  return { plan, workflow };
}

export async function buildHostBridgeWorkflowAgentRun(args: {
  payload: HostBridgeWorkflowAgentRunRequest;
}): Promise<HostBridgeWorkflowAgentRunResult> {
  const { plan, workflow } = await prepareHostBridgeWorkflowAgentRun(
    args.payload,
  );
  const selectedItems = resolveSelectedItemsForSelection(plan.selection);
  const selectionContext = await buildSelectionContext(selectedItems);
  const inputCompatibility = evaluateAgentRunInputCompatibility({
    workflow,
    selectionContext,
  });
  if (!inputCompatibility.compatible) {
    throw codedWorkflowValidationError(
      "invalid_workflow_agent_run_request",
      inputCompatibility.message,
    );
  }
  const applyStatus = await evaluateAgentRunApplyStatus({
    workflow,
    selectionContext,
  });
  return buildHostBridgeWorkflowAgentRunHandoff({
    workflow,
    selection: plan.selection,
    selectionContext,
    applyStatus,
  });
}

function selectionArray(
  selectionContext: SelectionContext,
  key: keyof SelectionContext["items"],
) {
  const value = selectionContext.items?.[key];
  return Array.isArray(value) ? value : [];
}

type AgentRunAttachment = Record<string, unknown> & {
  item?: Record<string, unknown> & {
    id?: unknown;
    parentItemID?: unknown;
    data?: Record<string, unknown>;
  };
  parent?: Record<string, unknown> & { id?: unknown };
  filePath?: unknown;
  mimeType?: unknown;
};

function attachmentParentId(entry: AgentRunAttachment) {
  const candidates = [entry.parent?.id, entry.item?.parentItemID];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function attachmentMime(entry: AgentRunAttachment) {
  return String(
    entry.mimeType || entry.item?.data?.contentType || "",
  ).trim();
}

function attachmentFilePath(entry: AgentRunAttachment) {
  return String(entry.filePath || entry.item?.data?.path || "").toLowerCase();
}

function attachmentMatchesMime(entry: AgentRunAttachment, mimes?: string[]) {
  if (!mimes?.length) {
    return true;
  }
  const mime = attachmentMime(entry);
  if (mime && mimes.includes(mime)) {
    return true;
  }
  const filePath = attachmentFilePath(entry);
  if (
    filePath.endsWith(".md") &&
    (mimes.includes("text/markdown") ||
      mimes.includes("text/x-markdown") ||
      mimes.includes("text/plain"))
  ) {
    return true;
  }
  return filePath.endsWith(".pdf") && mimes.includes("application/pdf");
}

function collectAgentRunAttachmentCandidates(
  selectionContext: SelectionContext,
) {
  const direct = selectionArray(selectionContext, "attachments");
  const source =
    direct.length > 0
      ? direct
      : [
          ...selectionArray(selectionContext, "parents").flatMap((entry) =>
            Array.isArray(entry.attachments) ? entry.attachments : [],
          ),
          ...selectionArray(selectionContext, "children").flatMap((entry) =>
            Array.isArray(entry.attachments) ? entry.attachments : [],
          ),
        ];
  const seen = new Set<string>();
  const output: AgentRunAttachment[] = [];
  for (const raw of source) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const entry = raw as AgentRunAttachment;
    const id =
      typeof entry.item?.id === "number" ? `id:${entry.item.id}` : "";
    const key =
      id ||
      `file:${String(entry.filePath || entry.item?.data?.path || "")}|parent:${attachmentParentId(entry)}`;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(entry);
  }
  return output;
}

function countValidAgentRunAttachments(args: {
  workflow: LoadedWorkflow;
  selectionContext: SelectionContext;
}) {
  const inputs = args.workflow.manifest.inputs;
  const candidates = collectAgentRunAttachmentCandidates(args.selectionContext);
  const mimeMatched = candidates.filter((entry) =>
    attachmentMatchesMime(entry, inputs?.accepts?.mime),
  );
  const perParentMin = Math.max(0, inputs?.per_parent?.min ?? 0);
  const rawMax = inputs?.per_parent?.max ?? Number.POSITIVE_INFINITY;
  const perParentMax = Math.max(perParentMin, rawMax);
  const byParent = new Map<number, number>();
  for (const entry of mimeMatched) {
    const parentId = attachmentParentId(entry);
    if (!parentId) {
      continue;
    }
    byParent.set(parentId, (byParent.get(parentId) || 0) + 1);
  }
  let valid = 0;
  for (const count of byParent.values()) {
    if (count >= perParentMin && count <= perParentMax) {
      valid += count;
    }
  }
  return {
    candidates: candidates.length,
    mimeMatched: mimeMatched.length,
    valid,
  };
}

function evaluateAgentRunInputCompatibility(args: {
  workflow: LoadedWorkflow;
  selectionContext: SelectionContext;
}) {
  const unit = args.workflow.manifest.inputs?.unit || "attachment";
  if (unit === "workflow") {
    return {
      compatible: true,
      message: "workflow input is compatible",
    };
  }
  if (unit === "parent") {
    const count = selectionArray(args.selectionContext, "parents").length;
    return {
      compatible: count > 0,
      message:
        count > 0
          ? "parent input is compatible"
          : "workflow agent-run requires at least one parent input",
    };
  }
  if (unit === "note") {
    const count = selectionArray(args.selectionContext, "notes").length;
    return {
      compatible: count > 0,
      message:
        count > 0
          ? "note input is compatible"
          : "workflow agent-run requires at least one note input",
    };
  }
  const counts = countValidAgentRunAttachments(args);
  let message = "attachment input is compatible";
  if (counts.candidates === 0) {
    message = "workflow agent-run requires at least one attachment input";
  } else if (counts.mimeMatched === 0) {
    message =
      "workflow agent-run attachment inputs do not match inputs.accepts.mime";
  } else if (counts.valid === 0) {
    message =
      "workflow agent-run attachment inputs do not satisfy inputs.per_parent";
  }
  return {
    compatible: counts.valid > 0,
    message,
  };
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

export async function submitHostBridgeWorkflow(args: {
  payload: HostBridgeWorkflowSubmitRequest;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
}): Promise<HostBridgeWorkflowSubmitResult> {
  const { plan, workflow } = await prepareHostBridgeWorkflowSubmit(
    args.payload,
  );
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
    ignoreSavedWorkflowSettings: true,
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
    .replace(
      /\/(?:Users|home|var|tmp|private|Volumes)\/[^\r\n.;,)]*/g,
      "[redacted-path]",
    );
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
    ? listActiveWorkflowTaskSummaries({
        backendId: filters.backendId,
        requestId: filters.requestId,
      })
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
