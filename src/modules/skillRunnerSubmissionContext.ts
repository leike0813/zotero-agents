import type { BackendInstance } from "../backends/types";
import type { JobRecord, JobRecordMeta } from "../jobQueue/manager";
import {
  mapSkillRunnerProgressLifecycle,
  mapSkillRunnerSequenceStepProgressState,
  mapSkillRunnerSubmitPhase,
} from "./skillRunnerProgressMapping";
import { resolveSkillRunnerExecutionModeFromRequest } from "./skillRunnerExecutionMode";
import { buildSkillRunnerSequenceStepLocalRunId } from "./skillRunnerRunIdentity";

export type SkillRunnerSkillDisplayById = Record<
  string,
  {
    skillId: string;
    skillName?: string;
    skillLabel?: string;
  }
>;

export function normalizeSkillRunnerSubmissionText(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneRecord(value: unknown) {
  return isRecord(value) ? { ...value } : undefined;
}

export function resolveSkillRunnerSkillDisplay(args: {
  skillDisplayById?: SkillRunnerSkillDisplayById;
  skillId?: string;
}) {
  const skillId = normalizeSkillRunnerSubmissionText(args.skillId);
  if (!skillId) {
    return { skillId: "", skillName: "", skillLabel: "" };
  }
  const display = args.skillDisplayById?.[skillId];
  return {
    skillId,
    skillName: normalizeSkillRunnerSubmissionText(display?.skillName),
    skillLabel: normalizeSkillRunnerSubmissionText(display?.skillLabel),
  };
}

export function buildSkillRunnerSequenceStepJobRecord(args: {
  baseJob?: JobRecord;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId?: string;
  runId?: string;
  sequenceJobId?: string;
  backend: BackendInstance;
  event: Record<string, unknown>;
  fallbackRequest: unknown;
  baseMeta?: JobRecordMeta;
  createdAt?: string;
  skillDisplayById?: SkillRunnerSkillDisplayById;
  targetParentID?: number;
  providerId?: string;
  providerOptions?: Record<string, unknown>;
}) {
  const stepId = normalizeSkillRunnerSubmissionText(args.event.sequenceStepId);
  if (!stepId) {
    return null;
  }
  const baseMeta = args.baseMeta || args.baseJob?.meta || {};
  const requestId = normalizeSkillRunnerSubmissionText(args.event.requestId);
  const workflowRunId =
    normalizeSkillRunnerSubmissionText(args.event.workflowRunId) ||
    normalizeSkillRunnerSubmissionText(args.workflowRunId) ||
    normalizeSkillRunnerSubmissionText(baseMeta.workflowRunId) ||
    normalizeSkillRunnerSubmissionText(baseMeta.runId);
  const sequenceJobId =
    normalizeSkillRunnerSubmissionText(args.event.sequenceJobId) ||
    normalizeSkillRunnerSubmissionText(args.sequenceJobId) ||
    normalizeSkillRunnerSubmissionText(args.baseJob?.id);
  const localRunId = buildSkillRunnerSequenceStepLocalRunId({
    workflowRunId,
    sequenceJobId,
    stepId,
  });
  if (!localRunId || !sequenceJobId) {
    return null;
  }
  const sequenceStepIndex = normalizeSequenceStepIndex(
    args.event.sequenceStepIndex,
  );
  const skillId = normalizeSkillRunnerSubmissionText(
    args.event.sequenceStepSkillId,
  );
  const eventSkillName = normalizeSkillRunnerSubmissionText(
    args.event.sequenceStepSkillName,
  );
  const display = resolveSkillRunnerSkillDisplay({
    skillDisplayById: args.skillDisplayById,
    skillId,
  });
  const skillName = eventSkillName || display.skillName;
  const skillLabel = display.skillLabel;
  const stepRequest = args.event.sequenceStepRequest || args.fallbackRequest;
  const providerOptions =
    cloneRecord(args.providerOptions) || cloneRecord(baseMeta.providerOptions);
  const engine =
    normalizeSkillRunnerSubmissionText(providerOptions?.engine) ||
    normalizeSkillRunnerSubmissionText(baseMeta.engine);
  const executionMode =
    resolveSkillRunnerExecutionModeFromRequest(stepRequest, "auto") ||
    normalizeSkillRunnerSubmissionText(baseMeta.executionMode);
  const taskName =
    normalizeSkillRunnerSubmissionText(args.event.sequenceStepTaskName) ||
    normalizeSkillRunnerSubmissionText(baseMeta.taskName) ||
    `${args.workflowLabel || args.workflowId} / ${stepId}`;
  const now = new Date().toISOString();
  const createdAt =
    normalizeSkillRunnerSubmissionText(args.createdAt) ||
    normalizeSkillRunnerSubmissionText(args.baseJob?.createdAt) ||
    now;
  const lifecycle = mapSkillRunnerProgressLifecycle(args.event);
  const submitPhase = mapSkillRunnerSubmitPhase(args.event);
  const jobId = `${sequenceJobId}:${stepId}`;
  const meta: JobRecordMeta = {
    ...baseMeta,
    runId:
      normalizeSkillRunnerSubmissionText(args.runId) ||
      workflowRunId ||
      normalizeSkillRunnerSubmissionText(baseMeta.runId),
    workflowRunId: workflowRunId || undefined,
    workflowLabel:
      normalizeSkillRunnerSubmissionText(args.workflowLabel) ||
      normalizeSkillRunnerSubmissionText(baseMeta.workflowLabel) ||
      undefined,
    jobId,
    localRunId,
    requestId: requestId || undefined,
    requestKind: "skillrunner.job.v1",
    backendId: args.backend.id,
    backendType: args.backend.type,
    backendBaseUrl: args.backend.baseUrl,
    providerId:
      normalizeSkillRunnerSubmissionText(args.providerId) ||
      normalizeSkillRunnerSubmissionText(baseMeta.providerId) ||
      undefined,
    providerOptions,
    engine: engine || undefined,
    executionMode: executionMode || undefined,
    taskName,
    inputUnitIdentity:
      normalizeSkillRunnerSubmissionText(baseMeta.inputUnitIdentity) ||
      undefined,
    inputUnitLabel: taskName,
    targetParentID:
      typeof args.targetParentID === "number" &&
      Number.isFinite(args.targetParentID)
        ? Math.floor(args.targetParentID)
        : baseMeta.targetParentID,
    skillId: skillId || undefined,
    skillName: skillName || undefined,
    skillLabel: skillLabel || undefined,
    sequenceStepId: stepId,
    sequenceStepIndex,
    sequenceStepSkillId: skillId || undefined,
    sequenceStepSkillName: skillName || undefined,
    sequenceJobId,
    skillRunnerRequestReady:
      args.event.type === "request-ready" ||
      args.event.type === "sequence-step-deferred" ||
      args.event.type === "sequence-step-succeeded",
    skillRunnerLifecycleState: lifecycle || undefined,
    skillRunnerSubmitPhase: submitPhase || undefined,
    skillRunnerSubmitStartedAt: submitPhase
      ? normalizeSkillRunnerSubmissionText(baseMeta.skillRunnerSubmitStartedAt) ||
        createdAt
      : normalizeSkillRunnerSubmissionText(baseMeta.skillRunnerSubmitStartedAt) ||
        undefined,
  };
  return {
    ...(args.baseJob || {
      workflowId: args.workflowId,
      createdAt,
    }),
    id: jobId,
    workflowId: args.workflowId,
    request: stepRequest,
    meta,
    state: mapSkillRunnerSequenceStepProgressState(args.event),
    error: normalizeSkillRunnerSubmissionText(args.event.error) || undefined,
    createdAt,
    updatedAt: now,
  } satisfies JobRecord;
}

function normalizeSequenceStepIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}
