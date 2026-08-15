import type { BackendInstance } from "../../backends/types";
import type {
  ProviderExecutionResult,
  SkillRunnerSequenceRequestV1,
} from "../../providers/contracts";
import {
  deletePluginRunStoreEntry,
  getPluginMetaValue,
  getWorkflowSequenceRunStoreEntry,
  listPluginRunStoreEntries,
  listWorkflowSequenceRunStoreEntries,
  setPluginMetaValue,
  upsertWorkflowSequenceRunStoreEntry,
  type PluginRunStoreEntry,
  type PluginRunStoreKind,
  type WorkflowSequenceRunStoreListOptions,
} from "../pluginStateStore";
import type { SkillRunnerSkillDisplayById } from "../skillRunnerSubmissionContext";
import { getDotPath, primitiveEquals } from "./valuePath";

export type SequenceRunStateStatus =
  | "running_step"
  | "waiting_interaction"
  | "continuing"
  | "completed"
  | "failed"
  | "canceled";

export type SequenceStepRunState = {
  stepId: string;
  skillId: string;
  skillName?: string;
  index: number;
  requestId?: string;
  status?: "running" | ProviderExecutionResult["status"];
  error?: string;
  output?: unknown;
  result?: ProviderExecutionResult;
  applyResult?: {
    status: "succeeded" | "failed" | "skipped";
    workflowId?: string;
    result?: unknown;
    error?: string;
    updatedAt: string;
  };
  lifecycleSettledAt?: string;
  updatedAt: string;
};

export type SequenceRunState = {
  schemaVersion: "2.0.0";
  sequenceRunId: string;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
  backendId: string;
  backendType: string;
  providerOptions?: Record<string, unknown>;
  request: SkillRunnerSequenceRequestV1;
  currentStepIndex: number;
  finalStepId: string;
  terminalStepId?: string;
  rootRequestId?: string;
  status: SequenceRunStateStatus;
  steps: SequenceStepRunState[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type SequenceRunStateListener = (sequenceRunId: string) => void;

export type SequenceRunEvent =
  | {
      type: "sequence.step.started";
      sequenceRunId: string;
      stepIndex: number;
    }
  | {
      type: "sequence.step.request_created";
      sequenceRunId: string;
      stepIndex: number;
      requestId: string;
    }
  | {
      type: "sequence.step.succeeded";
      sequenceRunId: string;
      stepIndex: number;
      requestId: string;
      output: unknown;
      result: ProviderExecutionResult;
    }
  | {
      type: "sequence.step.waiting";
      sequenceRunId: string;
      stepIndex: number;
      requestId: string;
      result: ProviderExecutionResult;
    }
  | {
      type: "sequence.step.terminal";
      sequenceRunId: string;
      stepIndex: number;
      requestId?: string;
      status: "failed" | "canceled";
      error?: string;
    }
  | {
      type: "sequence.step.apply_result";
      sequenceRunId: string;
      stepIndex: number;
      workflowId?: string;
      status: "succeeded" | "failed" | "skipped";
      result?: unknown;
      error?: string;
    }
  | {
      type: "sequence.step.lifecycle_settled";
      sequenceRunId: string;
      stepIndex: number;
    }
  | {
      type: "sequence.run.continuing";
      sequenceRunId: string;
    }
  | {
      type: "sequence.run.waiting_interaction";
      sequenceRunId: string;
    }
  | {
      type: "sequence.run.terminal";
      sequenceRunId: string;
      status: "failed" | "canceled";
      error?: string;
      terminalStepId?: string;
    };

const sequenceRunStateListeners = new Set<SequenceRunStateListener>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseProviderResult(
  raw: unknown,
): ProviderExecutionResult | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const status = normalizeString(raw.status);
  const requestId = normalizeString(raw.requestId);
  const fetchType =
    normalizeString(raw.fetchType) === "bundle" ? "bundle" : "result";
  if (!requestId) {
    return undefined;
  }
  if (status === "succeeded") {
    return {
      status,
      requestId,
      fetchType,
      resultJson: raw.resultJson,
      resultJsonPath: normalizeString(raw.resultJsonPath) || undefined,
      workspaceDir: normalizeString(raw.workspaceDir) || undefined,
      resultArtifactBasePath:
        normalizeString(raw.resultArtifactBasePath) || undefined,
      responseJson: raw.responseJson,
      sequence: isRecord(raw.sequence) ? (raw.sequence as any) : undefined,
    };
  }
  if (status === "deferred") {
    const backendStatus = normalizeString(raw.backendStatus);
    return {
      status,
      requestId,
      fetchType,
      backendStatus:
        backendStatus === "queued" ||
        backendStatus === "waiting_user" ||
        backendStatus === "waiting_auth"
          ? backendStatus
          : "running",
      detachReason:
        normalizeString(raw.detachReason) === "waiting"
          ? "waiting"
          : normalizeString(raw.detachReason) === "observer_failure"
            ? "observer_failure"
            : undefined,
      continuationOwner:
        normalizeString(raw.continuationOwner) === "foreground"
          ? "foreground"
          : normalizeString(raw.continuationOwner) === "recovery"
            ? "recovery"
            : undefined,
      responseJson: raw.responseJson,
    };
  }
  if (status === "failed" || status === "canceled") {
    return {
      status,
      requestId,
      fetchType,
      error: normalizeString(raw.error) || undefined,
      resultJson: raw.resultJson,
      resultJsonPath: normalizeString(raw.resultJsonPath) || undefined,
      workspaceDir: normalizeString(raw.workspaceDir) || undefined,
      resultArtifactBasePath:
        normalizeString(raw.resultArtifactBasePath) || undefined,
      responseJson: raw.responseJson,
    };
  }
  return undefined;
}

function cloneProviderResult(result: ProviderExecutionResult) {
  if (result.status === "succeeded") {
    return {
      status: "succeeded",
      requestId: result.requestId,
      fetchType: result.fetchType,
      resultJson: result.resultJson,
      resultJsonPath: result.resultJsonPath,
      workspaceDir: result.workspaceDir,
      resultArtifactBasePath: result.resultArtifactBasePath,
      responseJson: result.responseJson,
      sequence: result.sequence,
    } satisfies ProviderExecutionResult;
  }
  if (result.status === "deferred") {
    return {
      status: "deferred",
      requestId: result.requestId,
      fetchType: result.fetchType,
      backendStatus: result.backendStatus,
      detachReason: result.detachReason,
      continuationOwner: result.continuationOwner,
      responseJson: result.responseJson,
    } satisfies ProviderExecutionResult;
  }
  return {
    status: result.status,
    requestId: result.requestId,
    fetchType: result.fetchType,
    error: result.error,
    resultJson: result.resultJson,
    resultJsonPath: result.resultJsonPath,
    workspaceDir: result.workspaceDir,
    resultArtifactBasePath: result.resultArtifactBasePath,
    responseJson: result.responseJson,
  } satisfies ProviderExecutionResult;
}

function parseStepApplyResult(
  raw: unknown,
): SequenceStepRunState["applyResult"] {
  if (!isRecord(raw)) {
    return undefined;
  }
  const status = normalizeString(raw.status);
  if (status !== "succeeded" && status !== "failed" && status !== "skipped") {
    return undefined;
  }
  return {
    status,
    workflowId: normalizeString(raw.workflowId) || undefined,
    result: raw.result,
    error: normalizeString(raw.error) || undefined,
    updatedAt: normalizeString(raw.updatedAt) || nowIso(),
  };
}

function parseStep(raw: unknown): SequenceStepRunState | null {
  if (!isRecord(raw)) {
    return null;
  }
  const stepId = normalizeString(raw.stepId);
  const skillId = normalizeString(raw.skillId);
  const index = Math.floor(Number(raw.index));
  if (!stepId || !skillId || !Number.isFinite(index) || index < 0) {
    return null;
  }
  const status = normalizeString(raw.status);
  return {
    stepId,
    skillId,
    skillName: normalizeString(raw.skillName) || undefined,
    index,
    requestId: normalizeString(raw.requestId) || undefined,
    status:
      status === "running" ||
      status === "succeeded" ||
      status === "deferred" ||
      status === "failed" ||
      status === "canceled"
        ? status
        : undefined,
    error: normalizeString(raw.error) || undefined,
    output: raw.output,
    result: parseProviderResult(raw.result),
    applyResult: parseStepApplyResult(raw.applyResult),
    lifecycleSettledAt: normalizeString(raw.lifecycleSettledAt) || undefined,
    updatedAt: normalizeString(raw.updatedAt) || nowIso(),
  };
}

function parseState(raw: unknown): SequenceRunState | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (normalizeString(raw.schemaVersion) !== "2.0.0") {
    return null;
  }
  const sequenceRunId = normalizeString(raw.sequenceRunId);
  const workflowId = normalizeString(raw.workflowId);
  const workflowRunId = normalizeString(raw.workflowRunId) || sequenceRunId;
  const jobId = normalizeString(raw.jobId);
  const request = isRecord(raw.request)
    ? (raw.request as SkillRunnerSequenceRequestV1)
    : null;
  if (!sequenceRunId || !workflowId || !workflowRunId || !jobId || !request) {
    return null;
  }
  const status = normalizeString(raw.status);
  const updatedAt = normalizeString(raw.updatedAt) || nowIso();
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map(parseStep)
        .filter((entry): entry is SequenceStepRunState => !!entry)
    : [];
  return {
    schemaVersion: "2.0.0",
    sequenceRunId,
    workflowId,
    workflowLabel: normalizeString(raw.workflowLabel) || undefined,
    workflowRunId,
    jobId,
    backendId: normalizeString(raw.backendId),
    backendType: normalizeString(raw.backendType) || "acp",
    providerOptions: isRecord(raw.providerOptions)
      ? { ...raw.providerOptions }
      : undefined,
    request,
    currentStepIndex: Math.max(
      0,
      Math.floor(Number(raw.currentStepIndex || 0) || 0),
    ),
    finalStepId: normalizeString(raw.finalStepId),
    terminalStepId: normalizeString(raw.terminalStepId) || undefined,
    rootRequestId: normalizeString(raw.rootRequestId) || undefined,
    status:
      status === "running_step" ||
      status === "waiting_interaction" ||
      status === "continuing" ||
      status === "completed" ||
      status === "failed" ||
      status === "canceled"
        ? status
        : "running_step",
    steps,
    error: normalizeString(raw.error) || undefined,
    createdAt: normalizeString(raw.createdAt) || updatedAt,
    updatedAt,
  };
}

const SEQUENCE_STATE_SCHEMA = "workflow.sequence.state.v2";
const SEQUENCE_STATE_MIGRATION_META_KEY =
  "workflow_sequence_run_store_migration_v1";

function parseStoredSequencePayload(payload: string) {
  try {
    const raw = JSON.parse(payload || "{}");
    const envelope =
      isRecord(raw) && isRecord(raw.sequenceState) ? raw.sequenceState : raw;
    return parseState(envelope);
  } catch {
    return null;
  }
}

function isSequenceStatePayload(payload: string) {
  try {
    const raw = JSON.parse(payload || "{}");
    return (
      isRecord(raw) &&
      (normalizeString(raw.schema) === SEQUENCE_STATE_SCHEMA ||
        isRecord(raw.sequenceState))
    );
  } catch {
    return false;
  }
}

function serializeSequenceState(state: SequenceRunState) {
  return JSON.stringify({
    schema: SEQUENCE_STATE_SCHEMA,
    sequenceState: state,
  });
}

function upsertSequenceStateEntry(state: SequenceRunState) {
  upsertWorkflowSequenceRunStoreEntry({
    sequenceRunId: state.sequenceRunId,
    workflowRunId: state.workflowRunId,
    workflowId: state.workflowId,
    backendId: state.backendId,
    backendType: state.backendType,
    state: state.status,
    updatedAt: state.updatedAt,
    payload: serializeSequenceState(state),
  });
}

function migrateLegacySequenceEntry(
  kind: PluginRunStoreKind,
  entry: PluginRunStoreEntry,
) {
  const runKey = normalizeString(entry.runKey);
  if (
    !runKey.startsWith("sequence:") &&
    !isSequenceStatePayload(entry.payload)
  ) {
    return false;
  }
  const state = parseStoredSequencePayload(entry.payload);
  if (!state) {
    return false;
  }
  upsertSequenceStateEntry(state);
  deletePluginRunStoreEntry(kind, runKey);
  return true;
}

function migrateLegacySequenceRunStoreEntries() {
  if (getPluginMetaValue(SEQUENCE_STATE_MIGRATION_META_KEY) === "done") {
    return 0;
  }
  let migrated = 0;
  for (const kind of ["skillrunner", "acp"] as const) {
    for (const entry of listPluginRunStoreEntries(kind)) {
      if (migrateLegacySequenceEntry(kind, entry)) {
        migrated += 1;
      }
    }
  }
  setPluginMetaValue(SEQUENCE_STATE_MIGRATION_META_KEY, "done");
  return migrated;
}

function persistState(state: SequenceRunState) {
  upsertSequenceStateEntry(state);
  for (const listener of [...sequenceRunStateListeners]) {
    try {
      listener(state.sequenceRunId);
    } catch {
      // One observer must not interrupt sequence state persistence.
    }
  }
}

function listSequenceStateEntries(
  options: WorkflowSequenceRunStoreListOptions = {},
) {
  migrateLegacySequenceRunStoreEntries();
  return listWorkflowSequenceRunStoreEntries(options);
}

function updateState(
  sequenceRunId: string,
  updater: (state: SequenceRunState) => SequenceRunState,
) {
  const existing = getSequenceRunState(sequenceRunId);
  if (!existing) {
    throw new Error(`sequence run state not found: ${sequenceRunId}`);
  }
  const next = updater(existing);
  persistState(next);
  return next;
}

function updateStep(
  state: SequenceRunState,
  index: number,
  updater: (step: SequenceStepRunState) => SequenceStepRunState,
) {
  const now = nowIso();
  const steps = state.steps.map((step) =>
    step.index === index ? updater({ ...step, updatedAt: now }) : step,
  );
  return {
    ...state,
    currentStepIndex: index,
    steps,
    updatedAt: now,
  };
}

export function resolveStepApplyFailureMode(
  step: SkillRunnerSequenceRequestV1["steps"][number],
) {
  return step.apply_result?.on_failure === "fail_sequence"
    ? "fail_sequence"
    : "continue";
}

function matchesShortCircuitRule(args: {
  step: SkillRunnerSequenceRequestV1["steps"][number];
  output: unknown;
}) {
  const spec = args.step.short_circuit;
  if (!spec || spec.result !== "step_output") {
    return false;
  }
  const path = normalizeString(spec.when?.path);
  if (!path) {
    return false;
  }
  return primitiveEquals(getDotPath(args.output, path), spec.when.equals);
}

function isTerminalSequenceRunStatus(status: SequenceRunStateStatus) {
  return status === "completed" || status === "failed" || status === "canceled";
}

function stepSucceededCompletesRun(args: {
  state: SequenceRunState;
  stepIndex: number;
  output: unknown;
}) {
  const step = args.state.request.steps[args.stepIndex];
  if (!step) {
    return false;
  }
  return (
    step.id === args.state.finalStepId ||
    matchesShortCircuitRule({ step, output: args.output })
  );
}

function requestIdentityConflict(args: {
  state: SequenceRunState;
  stepIndex: number;
  requestId: string;
}) {
  const existingRequestId = normalizeString(
    args.state.steps[args.stepIndex]?.requestId,
  );
  const requestId = normalizeString(args.requestId);
  return !!existingRequestId && !!requestId && existingRequestId !== requestId;
}

function throwRequestIdentityConflict(args: {
  sequenceRunId: string;
  stepIndex: number;
  existingRequestId: string;
  requestId: string;
}) {
  throw new Error(
    `sequence step request identity conflict: sequenceRunId=${args.sequenceRunId}; stepIndex=${args.stepIndex}; existingRequestId=${args.existingRequestId}; requestId=${args.requestId}`,
  );
}

export function applySequenceRunEvent(
  event: SequenceRunEvent,
): SequenceRunState {
  switch (event.type) {
    case "sequence.step.started":
      return updateState(event.sequenceRunId, (state) =>
        updateStep(
          {
            ...state,
            status: "running_step",
            error: undefined,
          },
          event.stepIndex,
          (step) => ({
            ...step,
            status: "running",
          }),
        ),
      );
    case "sequence.step.request_created": {
      const requestId = normalizeString(event.requestId);
      if (!requestId) {
        const existing = getSequenceRunState(event.sequenceRunId);
        if (!existing) {
          throw new Error(
            `sequence run state not found: ${event.sequenceRunId}`,
          );
        }
        return existing;
      }
      return updateState(event.sequenceRunId, (state) => {
        const existingRequestId = normalizeString(
          state.steps[event.stepIndex]?.requestId,
        );
        if (
          requestIdentityConflict({
            state,
            stepIndex: event.stepIndex,
            requestId,
          })
        ) {
          throwRequestIdentityConflict({
            sequenceRunId: state.sequenceRunId,
            stepIndex: event.stepIndex,
            existingRequestId,
            requestId,
          });
        }
        const next = updateStep(state, event.stepIndex, (step) => ({
          ...step,
          requestId,
          status: step.status || "running",
        }));
        return {
          ...next,
          rootRequestId: next.rootRequestId || requestId,
        };
      });
    }
    case "sequence.step.succeeded":
      return updateState(event.sequenceRunId, (state) => {
        const requestId = normalizeString(event.requestId);
        const existingRequestId = normalizeString(
          state.steps[event.stepIndex]?.requestId,
        );
        if (
          requestIdentityConflict({
            state,
            stepIndex: event.stepIndex,
            requestId,
          })
        ) {
          throwRequestIdentityConflict({
            sequenceRunId: state.sequenceRunId,
            stepIndex: event.stepIndex,
            existingRequestId,
            requestId,
          });
        }
        const next = updateStep(state, event.stepIndex, (step) => ({
          ...step,
          requestId: requestId || step.requestId,
          status: "succeeded",
          output: event.output,
          result: cloneProviderResult(event.result),
        }));
        if (
          stepSucceededCompletesRun({
            state: next,
            stepIndex: event.stepIndex,
            output: event.output,
          })
        ) {
          const step = next.request.steps[event.stepIndex];
          return {
            ...next,
            status: "completed",
            terminalStepId: step.id,
            error: undefined,
          };
        }
        return next;
      });
    case "sequence.step.waiting":
      return updateState(event.sequenceRunId, (state) => {
        const next = updateStep(
          {
            ...state,
            status: "waiting_interaction",
          },
          event.stepIndex,
          (step) => ({
            ...step,
            requestId: normalizeString(event.requestId) || step.requestId,
            status: "deferred",
            result: cloneProviderResult(event.result),
          }),
        );
        return {
          ...next,
          rootRequestId: next.rootRequestId || normalizeString(event.requestId),
        };
      });
    case "sequence.step.terminal":
      return updateState(event.sequenceRunId, (state) =>
        updateStep(
          {
            ...state,
            status: event.status,
            error: normalizeString(event.error) || undefined,
          },
          event.stepIndex,
          (step) => ({
            ...step,
            requestId: normalizeString(event.requestId) || step.requestId,
            status: event.status,
            error: normalizeString(event.error) || undefined,
          }),
        ),
      );
    case "sequence.step.apply_result":
      return updateState(event.sequenceRunId, (state) => {
        const next = updateStep(state, event.stepIndex, (step) => ({
          ...step,
          applyResult: {
            status: event.status,
            workflowId: normalizeString(event.workflowId) || undefined,
            result: event.result,
            error: normalizeString(event.error) || undefined,
            updatedAt: nowIso(),
          },
        }));
        const step = next.request.steps[event.stepIndex];
        if (
          event.status === "failed" &&
          step &&
          resolveStepApplyFailureMode(step) === "fail_sequence" &&
          next.status !== "failed" &&
          next.status !== "canceled"
        ) {
          return {
            ...next,
            status: "failed",
            error: normalizeString(event.error) || undefined,
          };
        }
        return next;
      });
    case "sequence.step.lifecycle_settled":
      return updateState(event.sequenceRunId, (state) =>
        updateStep(state, event.stepIndex, (step) => ({
          ...step,
          lifecycleSettledAt: step.lifecycleSettledAt || nowIso(),
        })),
      );
    case "sequence.run.continuing":
      return updateState(event.sequenceRunId, (state) =>
        isTerminalSequenceRunStatus(state.status)
          ? state
          : {
              ...state,
              status: "continuing",
              error: undefined,
              updatedAt: nowIso(),
            },
      );
    case "sequence.run.waiting_interaction":
      return updateState(event.sequenceRunId, (state) => ({
        ...state,
        status: "waiting_interaction",
        error: undefined,
        updatedAt: nowIso(),
      }));
    case "sequence.run.terminal":
      return updateState(event.sequenceRunId, (state) =>
        isTerminalSequenceRunStatus(state.status)
          ? state
          : {
              ...state,
              status: event.status,
              terminalStepId:
                normalizeString(event.terminalStepId) || state.terminalStepId,
              error: normalizeString(event.error) || undefined,
              updatedAt: nowIso(),
            },
      );
  }
}

export function initializeSequenceRunState(args: {
  request: SkillRunnerSequenceRequestV1;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
  skillDisplayById?: SkillRunnerSkillDisplayById;
}) {
  const now = nowIso();
  const state: SequenceRunState = {
    schemaVersion: "2.0.0",
    sequenceRunId: args.workflowRunId,
    workflowId: args.workflowId,
    workflowLabel: args.workflowLabel,
    workflowRunId: args.workflowRunId,
    jobId: args.jobId,
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerOptions: args.providerOptions
      ? { ...args.providerOptions }
      : undefined,
    request: args.request,
    currentStepIndex: 0,
    finalStepId: args.request.final_step_id,
    status: "running_step",
    steps: args.request.steps.map((step, index) => ({
      stepId: step.id,
      skillId: step.skill_id,
      skillName:
        normalizeString(args.skillDisplayById?.[step.skill_id]?.skillName) ||
        undefined,
      index,
      updatedAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  };
  persistState(state);
  return state;
}

export function getSequenceRunState(sequenceRunIdRaw: string) {
  const sequenceRunId = normalizeString(sequenceRunIdRaw);
  if (!sequenceRunId) {
    return null;
  }
  migrateLegacySequenceRunStoreEntries();
  const entry = getWorkflowSequenceRunStoreEntry(sequenceRunId);
  return entry ? parseStoredSequencePayload(entry.payload) : null;
}

export function subscribeSequenceRunStateStore(
  listener: SequenceRunStateListener,
) {
  sequenceRunStateListeners.add(listener);
  return () => {
    sequenceRunStateListeners.delete(listener);
  };
}

export function listSequenceRunStates(
  options: WorkflowSequenceRunStoreListOptions = {},
) {
  return listSequenceStateEntries(options)
    .map((entry) => parseStoredSequencePayload(entry.payload))
    .filter((state): state is SequenceRunState => !!state);
}

export function getSequenceRunStateByStepRequest(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return null;
  }
  for (const state of listSequenceRunStates()) {
    if (
      state?.steps.some((step) => normalizeString(step.requestId) === requestId)
    ) {
      return state;
    }
  }
  return null;
}

export function getSequenceStepIndexByRequestId(
  state: SequenceRunState,
  requestIdRaw: string,
) {
  const requestId = normalizeString(requestIdRaw);
  return state.steps.findIndex(
    (step) => normalizeString(step.requestId) === requestId,
  );
}
