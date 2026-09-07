/**
 * Dashboard wire contract — single source of truth for the postMessage
 * envelopes exchanged between the dashboard iframe page and the Zotero host
 * (src/modules/taskManagerDialog.ts).
 *
 * Imported both by the host-side modules (src/modules/**) and by the
 * dashboard page bundle (src/dashboard/**). This file must stay free of
 * imports from src/modules/** so the page bundle never pulls in privileged
 * code.
 *
 * Boundary rule: every type here is a pure JSON-serializable wire shape.
 * Snapshot views use the concrete portable DTOs below. Host-internal state
 * that never crosses postMessage (e.g. DashboardState) stays in
 * taskManagerDialog.ts.
 */

import type { SynthesisSidecarObservationEvent } from "../../packages/synthesis-contracts/src/sidecarObservability";

// ---------------------------------------------------------------------------
// iframe -> host
// ---------------------------------------------------------------------------

/**
 * JSON options emitted by the Dashboard workflow-settings editor.  The host
 * domain has a richer `WorkflowExecutionOptions` type, but the page boundary
 * deliberately owns this portable projection so the page bundle does not
 * import host modules.
 */
export type DashboardWorkflowExecutionOptions = {
  backendId?: string;
  workflowParams?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  runOptions?: Record<string, unknown>;
  hostOptions?: Record<string, unknown>;
};

/** Empty payload used by actions whose protocol payload is `{}`. */
export type DashboardEmptyActionPayload = Record<string, never>;

/**
 * Every non-empty payload keeps an index signature for the defensive host
 * decoder while retaining required fields for page-side action callers.
 */
type DashboardActionPayloadShape<Fields extends object> = Fields &
  Record<string, unknown>;

export type DashboardHostActionName =
  | "ready"
  | "select-tab"
  | "acp-trace-recorder-start"
  | "acp-trace-recorder-finish"
  | "acp-trace-recorder-cancel"
  | "acp-trace-recorder-save"
  | "acp-trace-recorder-open-folder"
  | "acp-trace-recorder-reset"
  | "acp-replay-trace-browse"
  | "acp-replay-trace-preflight"
  | "acp-replay-profiler-set-draft"
  | "acp-replay-profiler-start"
  | "acp-replay-profiler-cancel"
  | "acp-replay-profiler-open-folder"
  | "select-product"
  | "select-product-asset"
  | "select-product-section"
  | "select-feedback-skill-filter"
  | "select-feedback-product"
  | "toggle-feedback-product-selected"
  | "toggle-all-feedback-products-selected"
  | "export-selected-feedback"
  | "delete-selected-feedback"
  | "delete-all-feedback"
  | "open-product-folder"
  | "remove-product"
  | "select-workflow-settings-workflow"
  | "open-home-workflow-doc"
  | "close-home-workflow-doc"
  | "open-home-workflow-settings"
  | "run-home-workflow"
  | "workflow-settings-draft"
  | "open-running-task"
  | "open-acp-skill-runs"
  | "view-logs"
  | "select-log-task"
  | "open-log-diagnostics"
  | "select-log-entry"
  | "open-run"
  | "open-management"
  | "show-runs"
  | "mount-management-host"
  | "open-management-external"
  | "refresh-model-cache"
  | "cancel-queued-workflow-unit"
  | "cancel-run"
  | "runtime-logs-toggle-diagnostic"
  | "runtime-logs-set-filters"
  | "runtime-logs-clear-context"
  | "runtime-logs-clear"
  | "runtime-logs-select-entries"
  | "runtime-logs-copy-selected"
  | "runtime-logs-copy-diagnostic-bundle"
  | "runtime-logs-copy-issue-summary"
  | "runtime-logs-copy-entry";

/** Actions handled by the Dashboard controller without a host round-trip. */
export type DashboardLocalActionName =
  | "synthesis-sidecar-select-trace"
  | "synthesis-sidecar-set-trace-filter";

export type DashboardActionName =
  | DashboardHostActionName
  | DashboardLocalActionName;

export type DashboardActionPayloadMap = {
  ready: DashboardEmptyActionPayload;
  "select-tab": DashboardActionPayloadShape<{
    tabKey: string;
  }>;
  "acp-trace-recorder-start": DashboardActionPayloadShape<{
    sourceKind?: "acp-chat-conversation" | "acp-workflow-execution";
    maxBytes?: number;
    maxEvents?: number;
    maxEventBytes?: number;
  }>;
  "acp-trace-recorder-finish": DashboardEmptyActionPayload;
  "acp-trace-recorder-cancel": DashboardEmptyActionPayload;
  "acp-trace-recorder-save": DashboardEmptyActionPayload;
  "acp-trace-recorder-open-folder": DashboardEmptyActionPayload;
  "acp-trace-recorder-reset": DashboardEmptyActionPayload;
  "acp-replay-trace-browse": DashboardActionPayloadShape<{
    phase?: string;
    cadence?: "recorded" | "logical" | "burst";
  }>;
  "acp-replay-trace-preflight": DashboardActionPayloadShape<{
    tracePath?: string;
    phase?: string;
    cadence?: "recorded" | "logical" | "burst";
  }>;
  "acp-replay-profiler-set-draft": DashboardActionPayloadShape<{
    phase?: string;
    cadence?: "recorded" | "logical" | "burst";
  }>;
  "acp-replay-profiler-start": DashboardActionPayloadShape<{
    tracePath?: string;
    phase?: string;
    cadence?: "recorded" | "logical" | "burst";
  }>;
  "acp-replay-profiler-cancel": DashboardEmptyActionPayload;
  "acp-replay-profiler-open-folder": DashboardEmptyActionPayload;
  "select-product": DashboardActionPayloadShape<{ productId: string }>;
  "select-product-asset": DashboardActionPayloadShape<{
    productId: string;
    assetId: string;
  }>;
  "select-product-section": DashboardActionPayloadShape<{
    section: "products" | "feedback";
  }>;
  "select-feedback-skill-filter": DashboardActionPayloadShape<{
    skillId: string;
  }>;
  "select-feedback-product": DashboardActionPayloadShape<{
    productId: string;
  }>;
  "toggle-feedback-product-selected": DashboardActionPayloadShape<{
    productId: string;
    selected: boolean;
  }>;
  "toggle-all-feedback-products-selected": DashboardActionPayloadShape<{
    selected: boolean;
  }>;
  "export-selected-feedback": DashboardEmptyActionPayload;
  "delete-selected-feedback": DashboardEmptyActionPayload;
  "delete-all-feedback": DashboardEmptyActionPayload;
  "open-product-folder": DashboardActionPayloadShape<{ productId: string }>;
  "remove-product": DashboardActionPayloadShape<{ productId: string }>;
  "select-workflow-settings-workflow": DashboardActionPayloadShape<{
    workflowId: string;
  }>;
  "open-home-workflow-doc": DashboardActionPayloadShape<{
    workflowId: string;
  }>;
  "close-home-workflow-doc": DashboardEmptyActionPayload;
  "open-home-workflow-settings": DashboardActionPayloadShape<{
    workflowId: string;
  }>;
  "run-home-workflow": DashboardActionPayloadShape<{ workflowId: string }>;
  "workflow-settings-draft": DashboardActionPayloadShape<{
    workflowId: string;
    executionOptions: DashboardWorkflowExecutionOptions;
    changedSection?: string;
    changedKey?: string;
    changedOrigin?: "choice" | "text" | string;
  }>;
  "open-running-task": DashboardActionPayloadShape<{
    taskId?: string;
    backendId?: string;
    backendType?: string;
    runKey?: string;
    requestId?: string;
    requestKind?: string;
    skillId?: string;
  }>;
  "open-acp-skill-runs": DashboardActionPayloadShape<{
    requestId?: string;
  }>;
  "view-logs": DashboardActionPayloadShape<{
    backendId: string;
    taskId: string;
  }>;
  "select-log-task": DashboardActionPayloadShape<{
    backendId: string;
    taskId: string;
  }>;
  "open-log-diagnostics": DashboardActionPayloadShape<{
    backendId: string;
    taskId: string;
  }>;
  "select-log-entry": DashboardActionPayloadShape<{
    backendId: string;
    logEntryId: string;
  }>;
  "open-run": DashboardActionPayloadShape<{
    backendId: string;
    requestId?: string;
    runKey?: string;
  }>;
  "open-management": DashboardActionPayloadShape<{ backendId: string }>;
  "show-runs": DashboardActionPayloadShape<{ backendId: string }>;
  "mount-management-host": DashboardActionPayloadShape<{
    backendId: string;
    managementUiUrl: string;
  }>;
  "open-management-external": DashboardActionPayloadShape<{
    backendId: string;
  }>;
  "refresh-model-cache": DashboardActionPayloadShape<{
    backendId: string;
  }>;
  "cancel-queued-workflow-unit": DashboardActionPayloadShape<{
    queueId: string;
  }>;
  "cancel-run": DashboardActionPayloadShape<{
    backendId: string;
    requestId: string;
  }>;
  "runtime-logs-toggle-diagnostic": DashboardActionPayloadShape<{
    enabled: boolean;
  }>;
  "runtime-logs-set-filters": DashboardActionPayloadShape<{
    filters: DashboardRuntimeLogFilters;
  }>;
  "runtime-logs-clear-context": DashboardEmptyActionPayload;
  "runtime-logs-clear": DashboardEmptyActionPayload;
  "runtime-logs-select-entries": DashboardActionPayloadShape<{
    entryIds: string[];
  }>;
  "runtime-logs-copy-selected": DashboardActionPayloadShape<{
    format: "pretty-json" | "ndjson";
  }>;
  "runtime-logs-copy-diagnostic-bundle": DashboardEmptyActionPayload;
  "runtime-logs-copy-issue-summary": DashboardEmptyActionPayload;
  "runtime-logs-copy-entry": DashboardActionPayloadShape<{
    entryId: string;
    format: "pretty-json" | "ndjson";
  }>;
  "synthesis-sidecar-select-trace": DashboardActionPayloadShape<{
    traceId: string;
  }>;
  "synthesis-sidecar-set-trace-filter": DashboardActionPayloadShape<{
    filter: string;
  }>;
};

export type DashboardActionPayload<Action extends DashboardActionName> =
  DashboardActionPayloadMap[Action];

export type DashboardHostActionPayload<Action extends DashboardHostActionName> =
  DashboardActionPayloadMap[Action];

export type DashboardActionHandler<
  Actions extends DashboardActionName = DashboardActionName,
> = <Action extends Actions>(
  action: Action,
  payload?: DashboardActionPayload<Action>,
) => void;

export type DashboardHostActionHandler =
  DashboardActionHandler<DashboardHostActionName>;

/** Strict discriminated envelope for actions that cross the host boundary. */
export type DashboardActionEnvelopeFor<Action extends DashboardHostActionName> =
  {
    type: "dashboard:action";
    action: Action;
    payload?: DashboardHostActionPayload<Action>;
  };

export type DashboardActionEnvelope = {
  [Action in DashboardHostActionName]: DashboardActionEnvelopeFor<Action>;
}[DashboardHostActionName];

/** Transitional broad view used only when forwarding a dynamic page action. */
export type DashboardLegacyActionEnvelope = {
  type: "dashboard:action";
  action: DashboardHostActionName;
  payload?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Child dialog actions
// ---------------------------------------------------------------------------

export type BackendManagerDialogDraftRow = {
  internalId: string;
  displayName: string;
  type: string;
  enabled: boolean;
  baseUrl: string;
  authKind: string;
  authToken: string;
  authTokenPlaceholder?: string;
  timeoutMs: string;
  command: string;
  args: string[];
  env: Array<{ key: string; value: string }>;
  acp?: Record<string, unknown>;
};

export type BackendManagerActionName =
  | "ready"
  | "draft-changed"
  | "cancel"
  | "save"
  | "open-management"
  | "refresh-acp-runtime-options"
  | "refresh-model-cache"
  | "open-nodejs-download"
  | "open-preset-link"
  | "add-acp-preset"
  | "add-generic-http-preset";

export type BackendManagerActionPayloadMap = {
  ready: DashboardEmptyActionPayload;
  "draft-changed": DashboardActionPayloadShape<{
    rows: BackendManagerDialogDraftRow[];
  }>;
  cancel: DashboardActionPayloadShape<{
    rows: BackendManagerDialogDraftRow[];
  }>;
  save: DashboardActionPayloadShape<{
    rows: BackendManagerDialogDraftRow[];
  }>;
  "open-management": DashboardActionPayloadShape<{
    row: BackendManagerDialogDraftRow;
    rowIndex: number;
  }>;
  "refresh-acp-runtime-options": DashboardActionPayloadShape<{
    row: BackendManagerDialogDraftRow;
    rowIndex: number;
  }>;
  "refresh-model-cache": DashboardActionPayloadShape<{
    row: BackendManagerDialogDraftRow;
    rowIndex: number;
  }>;
  "open-nodejs-download": DashboardEmptyActionPayload;
  "open-preset-link": DashboardActionPayloadShape<{ url: string }>;
  "add-acp-preset": DashboardActionPayloadShape<{
    presetId: string;
    useNpx: boolean;
    isolated: boolean;
    rows: BackendManagerDialogDraftRow[];
  }>;
  "add-generic-http-preset": DashboardActionPayloadShape<{
    presetId: string;
    rows: BackendManagerDialogDraftRow[];
  }>;
};

export type BackendManagerActionPayload<
  Action extends BackendManagerActionName,
> = BackendManagerActionPayloadMap[Action];

export type BackendManagerActionEnvelopeFor<
  Action extends BackendManagerActionName,
> = {
  type: "backend-manager-dialog:action";
  action: Action;
  payload?: BackendManagerActionPayload<Action>;
};

export type BackendManagerActionEnvelope = {
  [Action in BackendManagerActionName]: BackendManagerActionEnvelopeFor<Action>;
}[BackendManagerActionName];

export type BackendManagerActionHandler = <
  Action extends BackendManagerActionName,
>(
  action: Action,
  payload?: BackendManagerActionPayload<Action>,
) => void;

export type WorkflowSettingsDialogActionName =
  | "ready"
  | "update-draft"
  | "toggle-persist"
  | "resize-to-content"
  | "refresh-acp-runtime-cache"
  | "refresh-skillrunner-model-cache"
  | "confirm"
  | "cancel";

export type WorkflowSettingsDialogActionPayloadMap = {
  ready: DashboardEmptyActionPayload;
  "update-draft": DashboardActionPayloadShape<{
    executionOptions: DashboardWorkflowExecutionOptions;
    changedSection?: string;
    changedKey?: string;
    changedOrigin?: "choice" | "text" | string;
  }>;
  "toggle-persist": DashboardActionPayloadShape<{ checked: boolean }>;
  "resize-to-content": DashboardActionPayloadShape<{
    contentHeight: number;
  }>;
  "refresh-acp-runtime-cache": DashboardActionPayloadShape<{
    executionOptions: DashboardWorkflowExecutionOptions;
  }>;
  "refresh-skillrunner-model-cache": DashboardActionPayloadShape<{
    executionOptions: DashboardWorkflowExecutionOptions;
  }>;
  confirm: DashboardActionPayloadShape<{
    executionOptions: DashboardWorkflowExecutionOptions;
  }>;
  cancel: DashboardEmptyActionPayload;
};

export type WorkflowSettingsDialogActionPayload<
  Action extends WorkflowSettingsDialogActionName,
> = WorkflowSettingsDialogActionPayloadMap[Action];

export type WorkflowSettingsDialogActionEnvelopeFor<
  Action extends WorkflowSettingsDialogActionName,
> = {
  type: "workflow-settings-dialog:action";
  action: Action;
  payload?: WorkflowSettingsDialogActionPayload<Action>;
};

export type WorkflowSettingsDialogActionEnvelope = {
  [Action in WorkflowSettingsDialogActionName]: WorkflowSettingsDialogActionEnvelopeFor<Action>;
}[WorkflowSettingsDialogActionName];

export type WorkflowSettingsDialogActionHandler = <
  Action extends WorkflowSettingsDialogActionName,
>(
  action: Action,
  payload?: WorkflowSettingsDialogActionPayload<Action>,
) => void;

// ---------------------------------------------------------------------------
// host -> iframe
// ---------------------------------------------------------------------------

export type DashboardMessageType = "dashboard:init" | "dashboard:snapshot";

export type DashboardHostMessage = {
  type: DashboardMessageType;
  payload: DashboardSnapshot;
};

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type DashboardRow = {
  id: string;
  rowKind?: "host-queued-workflow-unit";
  queueId?: string;
  workflowId: string;
  workflowLabel: string;
  backendId: string;
  backendType: string;
  backendLabel: string;
  taskName: string;
  state: string;
  stateSemantics: {
    normalized: string;
    terminal: boolean;
    waiting: boolean;
  };
  stateLabel: string;
  runKey?: string;
  requestId?: string;
  requestKind?: string;
  skillId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  workflowRunId?: string;
  engine?: string;
  jobId?: string;
  runId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardLogRow = {
  id: string;
  ts: string;
  level: string;
  scope: string;
  stage: string;
  message: string;
  workflowId?: string;
  requestId?: string;
  jobId?: string;
  detailPayload: unknown;
};

// ---------------------------------------------------------------------------
// Snapshot building blocks
// ---------------------------------------------------------------------------

export type DashboardRuntimeLogFilters = {
  levels?: string[];
  diagnosticMode?: boolean;
  workflowId?: string | string[];
  requestId?: string;
  jobId?: string;
  backendId?: string | string[];
  backendType?: string;
  runId?: string;
};

export type DashboardTabDescriptor = {
  key: string;
  label: string;
  group: "system" | "backend";
  backendId?: string;
  backendType?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type DashboardTaskSummary = {
  total: number;
  running: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

export type DashboardHomeWorkflowEntry = {
  workflowId: string;
  workflowLabel: string;
  providerId: string;
  configurable: boolean;
  official: boolean;
  core: boolean;
  quickRunEnabled: boolean;
  quickRunDisabledReason?: string;
};

export type DashboardHomeWorkflowDocView = {
  workflowId: string;
  workflowLabel: string;
  html: string;
  markdown: string;
  baseFileUri: string;
  missingReadme: boolean;
};

export type DashboardBackendView = {
  backendId: string;
  backendType: string;
  backendBaseUrl: string;
  selectedSubview?: "runs" | "management";
  managementUiUrl?: string;
  title: string;
  rows: DashboardRow[];
  emptyRowsText: string;
  selectedLogTaskId?: string;
  selectedLogTaskRequestId?: string;
  selectedLogTaskJobId?: string;
  logRows: DashboardLogRow[];
  selectedLogEntryId?: string;
  selectedLogEntryPayload?: unknown;
};

export type DashboardRuntimeLogsView = {
  filters: DashboardRuntimeLogFilters;
  diagnosticMode: boolean;
  totalEntries: number;
  budget: {
    maxEntries: number;
    maxBytes: number;
    estimatedBytes: number;
    droppedEntries: number;
    droppedByReason: {
      entry_limit: number;
      byte_budget: number;
      expired: number;
    };
    retentionMode: string;
    maxImportantEntries: number;
    importantEntryCount: number;
  };
  logs: DashboardLogRow[];
  selectedEntryIds: string[];
  filterOptions: {
    backends: { value: string; label: string }[];
    workflows: { value: string; label: string }[];
  };
};

export type DashboardSurfaceSignatures = {
  chrome: string;
  selectedSurface: string;
  selectedSurfaceKey: string;
};

// ---------------------------------------------------------------------------
// Portable host view DTOs
// ---------------------------------------------------------------------------

export type DashboardWorkflowProductAsset = {
  assetId: string;
  label: string;
  relativePath: string;
  contentType?: string;
  availability: "available" | "missing";
  size?: number;
  sha256?: string;
  diagnostics?: string[];
};

/** Product records are host-owned storage records with portable JSON metadata. */
export type DashboardWorkflowProduct = {
  schemaVersion: 2;
  productId: string;
  productKey: string;
  kind: string;
  title: string;
  workflowId: string;
  workflowLabel: string;
  backendId?: string;
  backendType: string;
  runKey?: string;
  requestId: string;
  runId?: string;
  storageRevision: string;
  assets: DashboardWorkflowProductAsset[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DashboardWorkflowProductPreview = {
  productId: string;
  assetId: string;
  path: string;
  exists: boolean;
  previewable: boolean;
  truncated: boolean;
  kind:
    | "markdown"
    | "json"
    | "yaml"
    | "toml"
    | "latex"
    | "text"
    | "binary"
    | "missing";
  language: string;
  text: string;
  formattedText?: string;
  size?: number;
  error?: string;
};

export type DashboardWorkflowRunOptions = {
  zoteroHostAccess?: {
    autoApproveWrites?: boolean;
  };
};

export type DashboardWorkflowHostOptions = {
  queue?: {
    maxConcurrency?: number;
  };
};

export type DashboardWorkflowParameterOption = {
  value: string;
  label: string;
  description?: string;
  meta?: {
    kind: string;
    libraryId?: number;
    collectionKey?: string;
    collectionId?: number | string;
    name?: string;
    path?: string[];
    [key: string]: unknown;
  };
};

export type DashboardWorkflowSchemaEntry = {
  key: string;
  type: "string" | "number" | "boolean" | "array";
  title?: string;
  description?: string;
  placeholder?: string;
  enumValues?: string[];
  options?: DashboardWorkflowParameterOption[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
  visibleIfProviderOption?: {
    key: string;
    equals: boolean;
  };
  diagnostics?: Array<{
    code: string;
    message: string;
  }>;
  min?: number;
  max?: number;
  integer?: boolean;
};

export type DashboardWorkflowSettingsProfile = {
  id: string;
  label: string;
};

export type DashboardWorkflowSettingsDescriptor = {
  workflowId: string;
  workflowLabel: string;
  providerId: string;
  requiresBackendProfile: boolean;
  profiles: DashboardWorkflowSettingsProfile[];
  profileEditable: boolean;
  profileMissing: boolean;
  selectedProfile: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  runOptions: DashboardWorkflowRunOptions;
  hostOptions: DashboardWorkflowHostOptions;
  hostQueueSupported: boolean;
  workflowSchemaEntries: DashboardWorkflowSchemaEntry[];
  providerSchemaEntries: DashboardWorkflowSchemaEntry[];
  runSchemaEntries: DashboardWorkflowSchemaEntry[];
  hasConfigurableSettings: boolean;
  blockedReason?: string;
  missingRequiredWorkflowParams: string[];
};

export type DashboardProductStorageView = {
  section: "products" | "feedback";
  products: DashboardWorkflowProduct[];
  selectedProduct?: DashboardWorkflowProduct;
  selectedAssetId?: string;
  selectedPreview?: DashboardWorkflowProductPreview;
  feedbackProducts?: DashboardWorkflowProduct[];
  feedbackSkillOptions?: string[];
  feedbackSkillFilter?: string;
  selectedFeedbackProduct?: DashboardWorkflowProduct;
  selectedFeedbackProductIds?: string[];
  selectedFeedbackPreview?: DashboardWorkflowProductPreview;
  isExporting?: boolean;
};

export type DashboardWorkflowOptionsView = {
  workflows: Array<{
    workflowId: string;
    workflowLabel: string;
    providerId: string;
  }>;
  selectedWorkflowId: string;
  selectedDescriptor?: DashboardWorkflowSettingsDescriptor;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError?: string;
};

/** The package-owned event is already a pure JSON DTO; re-export it here. */
export type DashboardSynthesisSidecarTraceEvent =
  SynthesisSidecarObservationEvent;

export type DashboardSynthesisSidecarTrace = {
  traceId: string;
  events: DashboardSynthesisSidecarTraceEvent[];
  droppedCount: number;
  active: boolean;
  startedAtMs: number;
  updatedAtMs: number;
};

export type DashboardSynthesisSidecarTraceSnapshot = {
  schema: "synthesis-sidecar-trace-snapshot.v2";
  traces: DashboardSynthesisSidecarTrace[];
  eventCount: number;
};

export type DashboardSkillRunnerConnectionLane =
  | "submit"
  | "foreground-stream"
  | "foreground-query"
  | "settlement"
  | "reconcile"
  | "background"
  | "maintenance"
  | "health";

export type DashboardSkillRunnerConnectionAuditEvent = {
  id: number;
  type:
    | "queued"
    | "started"
    | "finished"
    | "timeout"
    | "skipped_reachability"
    | "skipped_background"
    | "skipped_history"
    | "abort_requested"
    | "aborted"
    | "evicted_stream"
    | "duplicate_stream_rejected"
    | "physical_debt_recorded"
    | "physical_debt_released"
    | "late_resolve_after_timeout"
    | "late_reject_after_timeout"
    | "late_resolve_after_abort"
    | "late_reject_after_abort";
  ts: number;
  backendId?: string;
  lane?: DashboardSkillRunnerConnectionLane;
  requestId?: string;
  operation?: string;
  queuedAt?: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  timeoutMs?: number;
  reason?: string;
  errorName?: string;
};

export type DashboardSkillRunnerConnectionGovernorSnapshot = {
  maxActivePerBackend: number;
  summary: {
    activeTotal: number;
    queuedTotal: number;
    streamTotal: number;
    physicalDebtTotal: number;
    degradedBackendCount: number;
    timeoutCount: number;
    lateSettlementCount: number;
    skippedReachabilityCount: number;
    skippedBackgroundCount: number;
    skippedHistoryCount: number;
    recentTimeoutAt?: number;
    activeByBackend: Array<{ backendId: string; count: number }>;
    queuedByBackend: Array<{ backendId: string; count: number }>;
    physicalDebtByBackend: Array<{ backendId: string; count: number }>;
    activeByLane: Array<{
      lane: DashboardSkillRunnerConnectionLane;
      count: number;
    }>;
    queuedByLane: Array<{
      lane: DashboardSkillRunnerConnectionLane;
      count: number;
    }>;
    streamByBackend: Array<{ backendId: string; count: number }>;
  };
  active: Array<{
    id: number;
    backendId: string;
    lane: DashboardSkillRunnerConnectionLane;
    requestId?: string;
    operation: string;
    stream: boolean;
    startedAt: number;
    lastFocusedAt?: number;
  }>;
  queued: Array<{
    id: number;
    backendId: string;
    lane: DashboardSkillRunnerConnectionLane;
    requestId?: string;
    operation: string;
    queuedAt: number;
  }>;
  events: DashboardSkillRunnerConnectionAuditEvent[];
};

export type DashboardAcpTraceSourceKind =
  | "acp-chat-conversation"
  | "acp-workflow-execution";

export type DashboardAcpTraceRecorderView = {
  state: "idle" | "armed" | "recording" | "stopping" | "frozen" | "saved";
  sourceKind?: DashboardAcpTraceSourceKind;
  rootId?: string;
  binding?:
    | {
        sourceKind: "acp-chat-conversation";
        backendId: string;
        conversationId: string;
        sessionId: string;
        attachKind: "new" | "resume" | "load";
      }
    | {
        sourceKind: "acp-workflow-execution";
        workflowRunId: string;
        workflowId?: string;
      };
  activeTurnCount: number;
  activeRequestCount: number;
  canFinish: boolean;
  claiming: boolean;
  notice?: { code: "session-replaced"; sessionId: string };
  eventCount: number;
  contentBytes: number;
  completion?: "complete" | "incomplete";
  warnings: readonly {
    code:
      | "unowned-event"
      | "active-owner"
      | "event-limit"
      | "byte-limit"
      | "single-event-limit"
      | "user-canceled"
      | "write-failed"
      | "integrity-failed";
    detail?: string;
  }[];
  partialPath?: string;
  savedPath?: string;
  folder?: string;
  limits: {
    maxBytes: number;
    maxEvents: number;
    maxEventBytes: number;
  };
};

export type DashboardAcpReplayTraceMetadata = {
  schema: string;
  sourceKind: DashboardAcpTraceSourceKind;
  digest: string;
  createdAt: string;
  eventCount: number;
  contentBytes: number;
  completion: "complete" | "incomplete";
  sampleName: string;
};

export type DashboardAcpReplayRecord = {
  surface: "closed" | "open-inactive" | "target-active";
  role: "warm-up" | "formal";
  runIndex: number;
  executionCompletion: "complete" | "incomplete";
  measurementCompletion: "complete" | "incomplete";
  measurement: {
    families: Record<
      "transport" | "r1" | "r2" | "r3",
      { state: string; detail: string }
    >;
  };
  replay: {
    warnings: string[];
    drain: { ok: boolean; state: string; detail?: string };
  };
  failure?: { phase: string; detail: string };
};

export type DashboardAcpReplaySurfaceSummary = {
  surface: "closed" | "open-inactive" | "target-active";
  completion: "pending" | "complete" | "incomplete";
  formalCount: number;
  elapsedMeanMs: number;
  elapsedMinMs: number;
  elapsedMaxMs: number;
  eventsPerSecond: number;
  mibPerSecond: number;
  records: DashboardAcpReplayRecord[];
};

export type DashboardAcpReplayMatrix = {
  schema: string;
  createdAt: string;
  executionCompletion: "complete" | "incomplete";
  measurementCompletion: "complete" | "incomplete";
  replayConfig: Record<string, string | number | boolean>;
};

export type DashboardAcpReplayProfilerView = {
  state:
    | "idle"
    | "running"
    | "canceling"
    | "complete"
    | "incomplete"
    | "canceled"
    | "failed";
  tracePath: string;
  traceValidation: "empty" | "unvalidated" | "validating" | "ready" | "invalid";
  traceMetadata?: DashboardAcpReplayTraceMetadata;
  phase: string;
  phaseValidation: "empty" | "ready" | "invalid";
  phaseErrorCode?: string;
  cadence: "recorded" | "logical" | "burst";
  progress: {
    completed: number;
    total: 9;
    surface?: DashboardAcpReplayRecord["surface"];
    role?: DashboardAcpReplayRecord["role"];
    runIndex?: number;
  };
  currentRun?: {
    surface: DashboardAcpReplayRecord["surface"];
    role: DashboardAcpReplayRecord["role"];
    runIndex: number;
    matrixIndex: number;
    syntheticRootId: string;
    startedAt: string;
  };
  records: readonly DashboardAcpReplayRecord[];
  surfaceSummaries: readonly DashboardAcpReplaySurfaceSummary[];
  warnings: readonly string[];
  matrix?: DashboardAcpReplayMatrix;
  resultFolder?: string;
  jsonPath?: string;
  markdownPath?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export type DashboardSnapshot = {
  generatedAt: string;
  title: string;
  labels: Record<string, string>;
  selectedTabKey: string;
  tabs: DashboardTabDescriptor[];
  summary: DashboardTaskSummary;
  runningRows: DashboardRow[];
  homeWorkflows?: DashboardHomeWorkflowEntry[];
  productStorageView?: DashboardProductStorageView;
  homeWorkflowDocView?: DashboardHomeWorkflowDocView;
  backendLoadError?: string;
  workflowOptionsView?: DashboardWorkflowOptionsView;
  backendView?: DashboardBackendView;
  runtimeLogsView?: DashboardRuntimeLogsView;
  synthesisSidecarView?: {
    traceSnapshot: DashboardSynthesisSidecarTraceSnapshot;
  };
  skillRunnerConnectionAuditView?: {
    generatedAt: string;
    governor: DashboardSkillRunnerConnectionGovernorSnapshot;
  };
  acpTraceRecorderView?: DashboardAcpTraceRecorderView;
  acpReplayProfilerView?: DashboardAcpReplayProfilerView;
  surfaceSignatures?: DashboardSurfaceSignatures;
};
