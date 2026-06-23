import type { BackendInstance } from "../../backends/types";
import { DEFAULT_BACKEND_TYPE } from "../../config/defaults";
import { localizeWorkflowLabel } from "../../workflows/localization";
import type { LoadedWorkflow } from "../../workflows/types";
import { getPref } from "../../utils/prefs";
import type { PluginRunStoreReadonlyRow } from "./pluginStateReadonly";

type SkillRunnerRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "succeeded"
  | "failed"
  | "canceled";

type SkillRunnerSubmitPhase =
  | "pre_request"
  | "creating"
  | "created"
  | "uploading"
  | "request_ready";

type HarnessSkillRunnerRunRecord = {
  schemaVersion: "3.0.0";
  runKey: string;
  requestId?: string;
  backendId: string;
  workflowId: string;
  workflowRunId: string;
  jobId: string;
  taskName: string;
  skillId?: string;
  sequenceRunId?: string;
  sequenceJobId?: string;
  sequenceStepId?: string;
  status: SkillRunnerRunStatus;
  submitPhase: SkillRunnerSubmitPhase;
  backendStatus?: SkillRunnerRunStatus;
  observerState?: "attached" | "detached";
  error?: string;
  requestPayload?: unknown;
  fetchType?: "bundle" | "result";
  executionMode?: "auto" | "interactive";
  apply: {
    state: string;
    attempt: number;
    maxAttempt?: number;
    nextRetryAt?: string;
    error?: string;
    updatedAt?: string;
  };
  result?: {
    resultJson?: unknown;
    resultJsonPath?: string;
    workspaceDir?: string;
  };
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type HarnessSequenceRunState = {
  sequenceRunId: string;
  finalStepId?: string;
  steps: Array<{
    stepId: string;
    skillId?: string;
    skillName?: string;
    index?: number;
    requestId?: string;
  }>;
};

export type HarnessSkillRunnerRunProjection = {
  id: string;
  taskId: string;
  key: string;
  runKey: string;
  runId: string;
  workflowRunId: string;
  jobId: string;
  requestId?: string;
  workflowId: string;
  workflowLabel: string;
  workflowName: string;
  skillName?: string;
  skillId?: string;
  sequenceRunId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  sequenceJobId?: string;
  backendId: string;
  backendType: typeof DEFAULT_BACKEND_TYPE;
  backendLabel: string;
  backendBaseUrl?: string;
  taskName: string;
  title: string;
  state: string;
  status: string;
  mainStatus: string;
  stateLabel: string;
  statusLabel: string;
  stateSemantics: {
    normalized: string;
    terminal: boolean;
    waiting: boolean;
  };
  requestAssigned: boolean;
  backendInteractive: boolean;
  canOpen: boolean;
  canOpenStream: boolean;
  canCancel: boolean;
  canCancelBackendRun: boolean;
  canReply: boolean;
  canArchiveLocalRun: boolean;
  selectable: boolean;
  terminal: boolean;
  skillRunnerLifecycleState: SkillRunnerRunStatus;
  submitPhase: SkillRunnerSubmitPhase;
  backendStatus?: SkillRunnerRunStatus;
  observerState?: "attached" | "detached";
  applyState?: string;
  applyAttempt?: number;
  applyMaxAttempt?: number;
  applyNextRetryAt?: string;
  applyError?: string;
  applyUpdatedAt?: string;
  resultJsonPath?: string;
  workspaceDir?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  raw: HarnessSkillRunnerRunRecord;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStatus(value: unknown): SkillRunnerRunStatus {
  const normalized = cleanString(value);
  return [
    "queued",
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
  ].includes(normalized)
    ? (normalized as SkillRunnerRunStatus)
    : "running";
}

function normalizeSubmitPhase(value: unknown): SkillRunnerSubmitPhase {
  const normalized = cleanString(value);
  return [
    "pre_request",
    "creating",
    "created",
    "uploading",
    "request_ready",
  ].includes(normalized)
    ? (normalized as SkillRunnerSubmitPhase)
    : "request_ready";
}

function parseRunRecord(
  row: PluginRunStoreReadonlyRow,
): HarnessSkillRunnerRunRecord | null {
  const payload = row.payload;
  if (cleanString(payload.schemaVersion) !== "3.0.0") {
    return null;
  }
  const runKey = cleanString(payload.runKey) || cleanString(row.runKey);
  const backendId =
    cleanString(payload.backendId) || cleanString(row.backendId);
  const workflowId = cleanString(payload.workflowId);
  const workflowRunId = cleanString(payload.workflowRunId);
  const jobId = cleanString(payload.jobId);
  if (!runKey || !backendId || !workflowId || !workflowRunId || !jobId) {
    return null;
  }
  const apply = isRecord(payload.apply) ? payload.apply : {};
  const result = isRecord(payload.result) ? payload.result : undefined;
  return {
    schemaVersion: "3.0.0",
    runKey,
    requestId:
      cleanString(payload.requestId) || cleanString(row.requestId) || undefined,
    backendId,
    workflowId,
    workflowRunId,
    jobId,
    taskName: cleanString(payload.taskName) || jobId,
    skillId: cleanString(payload.skillId) || undefined,
    sequenceRunId: cleanString(payload.sequenceRunId) || undefined,
    sequenceJobId: cleanString(payload.sequenceJobId) || undefined,
    sequenceStepId: cleanString(payload.sequenceStepId) || undefined,
    status: normalizeStatus(payload.status || row.state),
    submitPhase: normalizeSubmitPhase(payload.submitPhase),
    backendStatus: cleanString(payload.backendStatus)
      ? normalizeStatus(payload.backendStatus)
      : undefined,
    observerState:
      cleanString(payload.observerState) === "detached"
        ? "detached"
        : cleanString(payload.observerState) === "attached"
          ? "attached"
          : undefined,
    error: cleanString(payload.error) || undefined,
    requestPayload: payload.requestPayload,
    fetchType:
      cleanString(payload.fetchType) === "bundle" ||
      cleanString(payload.fetchType) === "result"
        ? (cleanString(payload.fetchType) as "bundle" | "result")
        : undefined,
    executionMode:
      cleanString(payload.executionMode) === "interactive"
        ? "interactive"
        : cleanString(payload.executionMode) === "auto"
          ? "auto"
          : undefined,
    apply: {
      state: cleanString(apply.state) || "idle",
      attempt: Number(apply.attempt || 0) || 0,
      maxAttempt: Number(apply.maxAttempt || 0) || undefined,
      nextRetryAt: cleanString(apply.nextRetryAt) || undefined,
      error: cleanString(apply.error) || undefined,
      updatedAt: cleanString(apply.updatedAt) || undefined,
    },
    result: result
      ? {
          resultJson: result.resultJson,
          resultJsonPath: cleanString(result.resultJsonPath) || undefined,
          workspaceDir: cleanString(result.workspaceDir) || undefined,
        }
      : undefined,
    archivedAt: cleanString(payload.archivedAt) || undefined,
    createdAt: cleanString(payload.createdAt) || cleanString(row.updatedAt),
    updatedAt: cleanString(payload.updatedAt) || cleanString(row.updatedAt),
  };
}

function parseSequenceState(
  row: PluginRunStoreReadonlyRow,
): HarnessSequenceRunState | null {
  const payload = row.payload;
  const raw = isRecord(payload.sequenceState) ? payload.sequenceState : payload;
  const sequenceRunId = cleanString(raw.sequenceRunId);
  if (!sequenceRunId) {
    return null;
  }
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  return {
    sequenceRunId,
    finalStepId: cleanString(raw.finalStepId) || undefined,
    steps: steps
      .filter(isRecord)
      .map((step) => ({
        stepId: cleanString(step.stepId),
        skillId: cleanString(step.skillId) || undefined,
        skillName: cleanString(step.skillName) || undefined,
        index: Number.isFinite(Number(step.index))
          ? Number(step.index)
          : undefined,
        requestId: cleanString(step.requestId) || undefined,
      }))
      .filter((step) => step.stepId),
  };
}

function readSkillDisplayById() {
  const entries = new Map<string, string>();
  try {
    const parsed = JSON.parse(
      cleanString(getPref("skillRunnerSkillDisplayRegistryJson")) || "{}",
    );
    if (!isRecord(parsed)) {
      return entries;
    }
    for (const [key, raw] of Object.entries(parsed)) {
      if (!isRecord(raw)) {
        continue;
      }
      const skillId = cleanString(raw.skillId) || cleanString(key);
      const skillName = cleanString(raw.skillName);
      if (skillId && skillName) {
        entries.set(skillId, skillName);
      }
    }
  } catch {
    return entries;
  }
  return entries;
}

function stateSemantics(status: SkillRunnerRunStatus) {
  const normalized = status === "queued" ? "queued" : status;
  return {
    normalized,
    terminal:
      normalized === "succeeded" ||
      normalized === "failed" ||
      normalized === "canceled",
    waiting: normalized === "waiting_user" || normalized === "waiting_auth",
  };
}

function stateLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function workflowLabelForId(
  workflowId: string,
  workflowById: Map<string, LoadedWorkflow>,
) {
  const workflow = workflowById.get(workflowId);
  return workflow ? localizeWorkflowLabel(workflow) : workflowId;
}

function backendLabel(backend: BackendInstance | undefined, backendId: string) {
  return cleanString(backend?.displayName) || backendId;
}

function sequenceStateForRun(
  run: HarnessSkillRunnerRunRecord,
  sequenceByRunId: Map<string, HarnessSequenceRunState>,
) {
  const state = run.sequenceRunId
    ? sequenceByRunId.get(run.sequenceRunId)
    : undefined;
  const step = state?.steps.find((entry) => entry.stepId === run.sequenceStepId);
  return { state, step };
}

export function projectSkillRunnerReadonlyRuns(args: {
  runRows: PluginRunStoreReadonlyRow[];
  sequenceRows: PluginRunStoreReadonlyRow[];
  backendById: Map<string, BackendInstance>;
  workflows: LoadedWorkflow[];
}) {
  const workflowById = new Map(
    args.workflows.map((workflow) => [workflow.manifest.id, workflow]),
  );
  const sequenceByRunId = new Map<string, HarnessSequenceRunState>();
  for (const row of args.sequenceRows) {
    const state = parseSequenceState(row);
    if (state) {
      sequenceByRunId.set(state.sequenceRunId, state);
    }
  }
  const skillDisplayById = readSkillDisplayById();
  return args.runRows
    .map(parseRunRecord)
    .filter((run): run is HarnessSkillRunnerRunRecord => !!run)
    .filter((run) => !cleanString(run.archivedAt))
    .map((run) => {
      const backend = args.backendById.get(run.backendId);
      const { state: sequenceState, step } = sequenceStateForRun(
        run,
        sequenceByRunId,
      );
      const skillId = cleanString(run.skillId);
      const skillName =
        cleanString(step?.skillName) ||
        cleanString(skillDisplayById.get(skillId)) ||
        skillId ||
        run.taskName;
      const semantics = stateSemantics(run.status);
      const backendAvailable = !!cleanString(backend?.baseUrl);
      const requestAssigned = !!cleanString(run.requestId);
      const backendInteractive =
        requestAssigned &&
        run.submitPhase === "request_ready" &&
        backendAvailable;
      const canOpenStream =
        backendInteractive && !semantics.terminal && !semantics.waiting;
      const canCancelBackendRun = backendInteractive && !semantics.terminal;
      const canReply =
        backendInteractive &&
        !semantics.terminal &&
        run.status === "waiting_user" &&
        run.executionMode === "interactive";
      const workflowLabel = workflowLabelForId(run.workflowId, workflowById);
      return {
        id: run.runKey,
        taskId: run.runKey,
        key: run.runKey,
        runKey: run.runKey,
        runId: run.workflowRunId,
        workflowRunId: run.workflowRunId,
        jobId: run.jobId,
        requestId: run.requestId,
        workflowId: run.workflowId,
        workflowLabel,
        workflowName: workflowLabel,
        skillName,
        skillId: run.skillId,
        sequenceRunId: run.sequenceRunId,
        sequenceStepId: run.sequenceStepId,
        sequenceStepIndex: step?.index,
        sequenceFinalStepId: sequenceState?.finalStepId,
        sequenceJobId: run.sequenceJobId,
        backendId: run.backendId,
        backendType: DEFAULT_BACKEND_TYPE,
        backendLabel: backendLabel(backend, run.backendId),
        backendBaseUrl: cleanString(backend?.baseUrl) || undefined,
        taskName: run.taskName,
        title: run.taskName,
        state: run.status === "queued" ? "queued" : run.status,
        status: run.status === "queued" ? "queued" : run.status,
        mainStatus: run.status === "queued" ? "queued" : run.status,
        stateLabel: stateLabel(run.status),
        statusLabel: stateLabel(run.status),
        stateSemantics: semantics,
        requestAssigned,
        backendInteractive,
        canOpen: canOpenStream,
        canOpenStream,
        canCancel: canCancelBackendRun,
        canCancelBackendRun,
        canReply,
        canArchiveLocalRun: true,
        selectable: true,
        terminal: semantics.terminal,
        skillRunnerLifecycleState: run.status,
        submitPhase: run.submitPhase,
        backendStatus: run.backendStatus,
        observerState: run.observerState,
        applyState: run.apply.state,
        applyAttempt: run.apply.attempt || undefined,
        applyMaxAttempt: run.apply.maxAttempt,
        applyNextRetryAt: run.apply.nextRetryAt,
        applyError: run.apply.error,
        applyUpdatedAt: run.apply.updatedAt,
        resultJsonPath: run.result?.resultJsonPath,
        workspaceDir: run.result?.workspaceDir,
        error: run.error,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        raw: run,
      } satisfies HarnessSkillRunnerRunProjection;
    });
}
