import type { BackendInstance } from "../../backends/types";
import type {
  ProviderExecutionResult,
  SkillRunnerSequenceRequestV1,
} from "../../providers/contracts";
import {
  PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE,
  listPluginTaskContextEntries,
  upsertPluginTaskContextEntry,
} from "../pluginStateStore";

export type SequenceRunStateStatus =
  | "running_step"
  | "waiting_recovery"
  | "continuing"
  | "completed"
  | "failed"
  | "canceled";

export type SequenceStepRunState = {
  stepId: string;
  skillId: string;
  index: number;
  requestId?: string;
  status?: "running" | ProviderExecutionResult["status"];
  output?: unknown;
  result?: ProviderExecutionResult;
  updatedAt: string;
};

export type SequenceRunState = {
  schemaVersion: "1.0.0";
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
  rootRequestId?: string;
  status: SequenceRunStateStatus;
  steps: SequenceStepRunState[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

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
      responseJson: raw.responseJson,
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
      responseJson: result.responseJson,
    } satisfies ProviderExecutionResult;
  }
  if (result.status === "deferred") {
    return {
      status: "deferred",
      requestId: result.requestId,
      fetchType: result.fetchType,
      backendStatus: result.backendStatus,
      responseJson: result.responseJson,
    } satisfies ProviderExecutionResult;
  }
  return {
    status: result.status,
    requestId: result.requestId,
    fetchType: result.fetchType,
    error: result.error,
    resultJson: result.resultJson,
    responseJson: result.responseJson,
  } satisfies ProviderExecutionResult;
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
    output: raw.output,
    result: parseProviderResult(raw.result),
    updatedAt: normalizeString(raw.updatedAt) || nowIso(),
  };
}

function parseState(raw: unknown): SequenceRunState | null {
  if (!isRecord(raw)) {
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
    schemaVersion: "1.0.0",
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
    rootRequestId: normalizeString(raw.rootRequestId) || undefined,
    status:
      status === "running_step" ||
      status === "waiting_recovery" ||
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

function persistState(state: SequenceRunState) {
  upsertPluginTaskContextEntry(PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE, {
    contextId: state.sequenceRunId,
    requestId: state.rootRequestId || "",
    backendId: state.backendId,
    state: state.status,
    updatedAt: state.updatedAt,
    payload: JSON.stringify(state),
  });
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

export function initializeSequenceRunState(args: {
  request: SkillRunnerSequenceRequestV1;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
}) {
  const now = nowIso();
  const state: SequenceRunState = {
    schemaVersion: "1.0.0",
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
  for (const entry of listPluginTaskContextEntries(
    PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE,
  )) {
    if (entry.contextId !== sequenceRunId) {
      continue;
    }
    try {
      return parseState(JSON.parse(entry.payload || "{}"));
    } catch {
      return null;
    }
  }
  return null;
}

export function getSequenceRunStateByStepRequest(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return null;
  }
  for (const entry of listPluginTaskContextEntries(
    PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE,
  )) {
    try {
      const state = parseState(JSON.parse(entry.payload || "{}"));
      if (
        state?.steps.some(
          (step) => normalizeString(step.requestId) === requestId,
        )
      ) {
        return state;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function recordSequenceStepStarted(args: {
  sequenceRunId: string;
  stepIndex: number;
}) {
  return updateState(args.sequenceRunId, (state) =>
    updateStep(
      {
        ...state,
        status: "running_step",
        error: undefined,
      },
      args.stepIndex,
      (step) => ({
        ...step,
        status: "running",
      }),
    ),
  );
}

export function recordSequenceStepRequestCreated(args: {
  sequenceRunId: string;
  stepIndex: number;
  requestId: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return getSequenceRunState(args.sequenceRunId);
  }
  return updateState(args.sequenceRunId, (state) => {
    const next = updateStep(state, args.stepIndex, (step) => ({
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

export function recordSequenceStepSucceeded(args: {
  sequenceRunId: string;
  stepIndex: number;
  requestId: string;
  output: unknown;
  result: ProviderExecutionResult;
}) {
  return updateState(args.sequenceRunId, (state) =>
    updateStep(state, args.stepIndex, (step) => ({
      ...step,
      requestId: normalizeString(args.requestId) || step.requestId,
      status: "succeeded",
      output: args.output,
      result: cloneProviderResult(args.result),
    })),
  );
}

export function recordSequenceStepDeferred(args: {
  sequenceRunId: string;
  stepIndex: number;
  requestId: string;
  result: ProviderExecutionResult;
}) {
  return updateState(args.sequenceRunId, (state) => {
    const next = updateStep(
      {
        ...state,
        status: "waiting_recovery",
      },
      args.stepIndex,
      (step) => ({
        ...step,
        requestId: normalizeString(args.requestId) || step.requestId,
        status: "deferred",
        result: cloneProviderResult(args.result),
      }),
    );
    return {
      ...next,
      rootRequestId: next.rootRequestId || normalizeString(args.requestId),
    };
  });
}

export function markSequenceRunContinuing(sequenceRunId: string) {
  return updateState(sequenceRunId, (state) => ({
    ...state,
    status: "continuing",
    error: undefined,
    updatedAt: nowIso(),
  }));
}

export function markSequenceRunTerminal(args: {
  sequenceRunId: string;
  status: "completed" | "failed" | "canceled";
  error?: string;
}) {
  return updateState(args.sequenceRunId, (state) => ({
    ...state,
    status: args.status,
    error: normalizeString(args.error) || undefined,
    updatedAt: nowIso(),
  }));
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
