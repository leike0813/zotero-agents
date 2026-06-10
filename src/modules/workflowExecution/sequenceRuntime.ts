import {
  ACP_BACKEND_TYPE,
  ACP_SKILL_RUN_REQUEST_KIND,
} from "../../config/defaults";
import type { BackendInstance } from "../../backends/types";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
  SkillRunnerSequenceHandoffSpec,
  SkillRunnerSequenceRequestV1,
  SkillRunnerSequenceStepV1,
} from "../../providers/contracts";
import type { ProviderProgressEvent } from "../../providers/types";
import type { ProviderOrchestrationContext } from "../../providers/types";
import type { appendRuntimeLog } from "../runtimeLogManager";
import {
  getSequenceRunState,
  initializeSequenceRunState,
  markSequenceRunContinuing,
  markSequenceRunTerminal,
  recordSequenceStepDeferred,
  recordSequenceStepRequestCreated,
  recordSequenceStepStarted,
  recordSequenceStepSucceeded,
  type SequenceRunState,
} from "./sequenceStateStore";

export type ExecuteWithProvider = (args: {
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  onProgress?: (event: ProviderProgressEvent) => void;
  orchestrationContext?: ProviderOrchestrationContext;
}) => Promise<ProviderExecutionResult>;

export type StepOutput = {
  stepId: string;
  requestId: string;
  output: unknown;
  result: ProviderExecutionResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneRecord(value: unknown) {
  return isRecord(value) ? { ...value } : {};
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function getPath(source: unknown, path: string) {
  const normalized = normalizeString(path);
  if (!normalized || normalized === "$") {
    return source;
  }
  let current = source as unknown;
  for (const part of normalized.split(".").filter(Boolean)) {
    if (
      !isRecord(current) ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const parts = normalizeString(path).split(".").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("handoff target path must be non-empty");
  }
  let current = target;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    const existing = current[part];
    if (!isRecord(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export function resolveStepOutput(result: ProviderExecutionResult) {
  if (typeof result.resultJson !== "undefined") {
    return result.resultJson;
  }
  if (
    isRecord(result.responseJson) &&
    Object.prototype.hasOwnProperty.call(result.responseJson, "result")
  ) {
    return result.responseJson.result;
  }
  return result.responseJson;
}

function resolveHandoffSource(args: {
  step: SkillRunnerSequenceStepV1;
  previousStepId: string;
  outputsByStep: Map<string, StepOutput>;
}) {
  const handoff = args.step.handoff;
  const fromStep = normalizeString(handoff?.from_step) || args.previousStepId;
  if (!fromStep) {
    return { fromStep, output: undefined };
  }
  return {
    fromStep,
    output: args.outputsByStep.get(fromStep)?.output,
  };
}

function applyHandoffMapping(args: {
  step: SkillRunnerSequenceStepV1;
  previousStepId: string;
  outputsByStep: Map<string, StepOutput>;
  input: Record<string, unknown>;
  parameter: Record<string, unknown>;
}) {
  const handoff = args.step.handoff;
  const { fromStep, output } = resolveHandoffSource({
    step: args.step,
    previousStepId: args.previousStepId,
    outputsByStep: args.outputsByStep,
  });
  if (!fromStep) {
    return;
  }
  const required = handoff?.required !== false;
  if (typeof output === "undefined") {
    if (required) {
      throw new Error(
        `sequence step '${args.step.id}' requires handoff from '${fromStep}', but no output is available`,
      );
    }
    return;
  }
  const hasExplicitMapping =
    Object.keys(handoff?.input || {}).length > 0 ||
    Object.keys(handoff?.parameter || {}).length > 0;
  const passThrough = handoff ? handoff.pass_through === true : true;
  if (!hasExplicitMapping || passThrough) {
    args.input.handoff = output;
  }
  for (const [targetPath, sourcePath] of Object.entries(handoff?.input || {})) {
    const value = getPath(output, sourcePath);
    if (typeof value === "undefined" && required) {
      throw new Error(
        `sequence step '${args.step.id}' missing handoff input source '${sourcePath}' from '${fromStep}'`,
      );
    }
    if (typeof value !== "undefined") {
      setPath(args.input, targetPath, value);
    }
  }
  for (const [targetPath, sourcePath] of Object.entries(
    handoff?.parameter || {},
  )) {
    const value = getPath(output, sourcePath);
    if (typeof value === "undefined" && required) {
      throw new Error(
        `sequence step '${args.step.id}' missing handoff parameter source '${sourcePath}' from '${fromStep}'`,
      );
    }
    if (typeof value !== "undefined") {
      setPath(args.parameter, targetPath, value);
    }
  }
}

function mergeHandoffDefaults(args: {
  handoff: SkillRunnerSequenceHandoffSpec | undefined;
  input: Record<string, unknown>;
  parameter: Record<string, unknown>;
}) {
  if (isRecord(args.handoff?.defaults?.input)) {
    Object.assign(args.input, {
      ...args.handoff!.defaults!.input,
      ...args.input,
    });
  }
  if (isRecord(args.handoff?.defaults?.parameter)) {
    Object.assign(args.parameter, {
      ...args.handoff!.defaults!.parameter,
      ...args.parameter,
    });
  }
}

export function buildStepRequest(args: {
  sequence: SkillRunnerSequenceRequestV1;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  workflowRunId: string;
  previousStepId: string;
  outputsByStep: Map<string, StepOutput>;
}): AcpSkillRunRequestV1 {
  const input = cloneRecord(args.step.input);
  const parameter = {
    ...cloneRecord(args.sequence.parameter),
    ...cloneRecord(args.step.parameter),
  };
  mergeHandoffDefaults({
    handoff: args.step.handoff,
    input,
    parameter,
  });
  if (args.stepIndex > 0) {
    applyHandoffMapping({
      step: args.step,
      previousStepId: args.previousStepId,
      outputsByStep: args.outputsByStep,
      input,
      parameter,
    });
  }
  const declaredWorkspace =
    args.step.workspace || (args.stepIndex === 0 ? "new" : "reuse-workflow");
  const workspaceMode =
    declaredWorkspace === "reuse-workflow" ? "reuse" : "new";
  const runtimeOptions = cloneRecord(args.sequence.runtime_options);
  runtimeOptions.workflow_workspace = {
    mode: workspaceMode,
    workflow_run_id: args.workflowRunId,
  };
  return {
    kind: ACP_SKILL_RUN_REQUEST_KIND,
    skill_id: args.step.skill_id,
    ...(args.sequence.taskName
      ? { taskName: `${args.sequence.taskName} / ${args.step.id}` }
      : {}),
    ...(Array.isArray(args.sequence.sourceAttachmentPaths)
      ? { sourceAttachmentPaths: [...args.sequence.sourceAttachmentPaths] }
      : {}),
    ...(typeof args.sequence.targetParentID !== "undefined"
      ? { targetParentID: args.sequence.targetParentID }
      : {}),
    ...(Object.keys(input).length > 0 ? { input } : {}),
    ...(Object.keys(parameter).length > 0 ? { parameter } : {}),
    runtime_options: runtimeOptions,
    ...(args.sequence.poll ? { poll: { ...args.sequence.poll } } : {}),
    fetch_type: args.step.fetch_type || "result",
  };
}

function outputsByStepFromState(state: SequenceRunState) {
  const outputsByStep = new Map<string, StepOutput>();
  for (const step of state.steps) {
    if (
      step.status === "succeeded" &&
      step.requestId &&
      step.result &&
      typeof step.output !== "undefined"
    ) {
      outputsByStep.set(step.stepId, {
        stepId: step.stepId,
        requestId: step.requestId,
        output: step.output,
        result: step.result,
      });
    }
  }
  return outputsByStep;
}

function findPreviousStepId(args: {
  state: SequenceRunState;
  startIndex: number;
  outputsByStep: Map<string, StepOutput>;
}) {
  for (let index = args.startIndex - 1; index >= 0; index--) {
    const step = args.state.steps[index];
    if (step && args.outputsByStep.has(step.stepId)) {
      return step.stepId;
    }
  }
  return "";
}

function buildSequenceResult(args: {
  finalResult: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  workflowRunId: string;
  finalStepId: string;
  outputsByStep: Map<string, StepOutput>;
}) {
  return {
    ...args.finalResult,
    sequence: {
      workflow_run_id: args.workflowRunId,
      final_step_id: args.finalStepId,
      steps: Array.from(args.outputsByStep.values()).map((entry) => ({
        step_id: entry.stepId,
        request_id: entry.requestId,
        output: entry.output,
        result: entry.result,
      })),
    },
    responseJson: {
      ...(isRecord(args.finalResult.responseJson)
        ? args.finalResult.responseJson
        : {}),
      sequence: {
        workflow_run_id: args.workflowRunId,
        final_step_id: args.finalStepId,
        steps: Array.from(args.outputsByStep.values()).map((entry) => ({
          step_id: entry.stepId,
          request_id: entry.requestId,
        })),
      },
    },
  } satisfies ProviderExecutionResult;
}

async function executeSequenceFromState(args: {
  state: SequenceRunState;
  startIndex: number;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  executeWithProvider: ExecuteWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  const outputsByStep = outputsByStepFromState(args.state);
  let previousStepId = findPreviousStepId({
    state: args.state,
    startIndex: args.startIndex,
    outputsByStep,
  });
  let finalResult: Extract<
    ProviderExecutionResult,
    { status: "succeeded" }
  > | null = null;
  for (
    let index = args.startIndex;
    index < args.state.request.steps.length;
    index++
  ) {
    const step = args.state.request.steps[index];
    recordSequenceStepStarted({
      sequenceRunId: args.state.sequenceRunId,
      stepIndex: index,
    });
    const stepRequest = buildStepRequest({
      sequence: args.state.request,
      step,
      stepIndex: index,
      workflowRunId: args.state.workflowRunId,
      previousStepId,
      outputsByStep,
    });
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.state.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.state.jobId,
      stage: "sequence-step-start",
      message: "skillrunner sequence step started",
      details: {
        stepId: step.id,
        skillId: step.skill_id,
        workspaceMode: stepRequest.runtime_options?.workflow_workspace?.mode,
      },
    });
    let progressRequestId = "";
    const stepResult = await args.executeWithProvider({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      request: stepRequest,
      backend: args.backend,
      providerOptions: args.providerOptions,
      orchestrationContext: {
        workflowId: args.state.workflowId,
        workflowLabel: args.state.workflowLabel,
        workflowRunId: args.state.workflowRunId,
        jobId: args.state.jobId,
        sequenceStepId: step.id,
        finalStepId: args.state.request.final_step_id,
      },
      onProgress: (event) => {
        if (event.type === "request-created") {
          progressRequestId = normalizeString(event.requestId);
          recordSequenceStepRequestCreated({
            sequenceRunId: args.state.sequenceRunId,
            stepIndex: index,
            requestId: progressRequestId,
          });
        }
        args.onProgress?.({
          ...event,
          sequenceStepId: step.id,
          sequenceStepIndex: index,
        });
      },
    });
    const resultRequestId =
      normalizeString(stepResult.requestId) || progressRequestId;
    if (stepResult.status === "deferred") {
      recordSequenceStepDeferred({
        sequenceRunId: args.state.sequenceRunId,
        stepIndex: index,
        requestId: resultRequestId,
        result: stepResult,
      });
      return stepResult;
    }
    if (stepResult.status !== "succeeded") {
      markSequenceRunTerminal({
        sequenceRunId: args.state.sequenceRunId,
        status: stepResult.status === "canceled" ? "canceled" : "failed",
        error:
          stepResult.status === "failed"
            ? stepResult.error || `sequence step '${step.id}' failed`
            : `sequence step '${step.id}' canceled`,
      });
      throw new Error(
        `skillrunner.sequence.v1 step '${step.id}' did not succeed; status=${String(stepResult.status || "unknown")}`,
      );
    }
    const output = resolveStepOutput(stepResult);
    outputsByStep.set(step.id, {
      stepId: step.id,
      requestId: stepResult.requestId,
      output,
      result: stepResult,
    });
    recordSequenceStepSucceeded({
      sequenceRunId: args.state.sequenceRunId,
      stepIndex: index,
      requestId: stepResult.requestId,
      output,
      result: stepResult,
    });
    previousStepId = step.id;
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.state.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.state.jobId,
      requestId: stepResult.requestId,
      stage: "sequence-step-finished",
      message: "skillrunner sequence step finished",
      details: {
        stepId: step.id,
        finalStep: step.id === args.state.request.final_step_id,
      },
    });
    if (step.id === args.state.request.final_step_id) {
      finalResult = stepResult;
      break;
    }
  }
  if (!finalResult) {
    markSequenceRunTerminal({
      sequenceRunId: args.state.sequenceRunId,
      status: "failed",
      error: `skillrunner.sequence.v1 final step '${args.state.request.final_step_id}' did not run`,
    });
    throw new Error(
      `skillrunner.sequence.v1 final step '${args.state.request.final_step_id}' did not run`,
    );
  }
  markSequenceRunTerminal({
    sequenceRunId: args.state.sequenceRunId,
    status: "completed",
  });
  return buildSequenceResult({
    finalResult,
    workflowRunId: args.state.workflowRunId,
    finalStepId: args.state.request.final_step_id,
    outputsByStep,
  });
}

export async function executeSkillRunnerSequence(args: {
  request: SkillRunnerSequenceRequestV1;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
  executeWithProvider: ExecuteWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  if (String(args.backend.type || "").trim() !== ACP_BACKEND_TYPE) {
    throw new Error(
      "skillrunner.sequence.v1 is only supported on ACP backends",
    );
  }
  const state = initializeSequenceRunState({
    request: args.request,
    backend: args.backend,
    providerOptions: args.providerOptions,
    workflowId: args.workflowId,
    workflowLabel: args.workflowLabel,
    workflowRunId: args.workflowRunId,
    jobId: args.jobId,
  });
  return executeSequenceFromState({
    state,
    startIndex: 0,
    backend: args.backend,
    providerOptions: args.providerOptions,
    executeWithProvider: args.executeWithProvider,
    appendRuntimeLog: args.appendRuntimeLog,
    onProgress: args.onProgress,
  });
}

export async function continueSkillRunnerSequence(args: {
  sequenceRunId: string;
  startIndex: number;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  executeWithProvider: ExecuteWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  if (String(args.backend.type || "").trim() !== ACP_BACKEND_TYPE) {
    throw new Error(
      "skillrunner.sequence.v1 is only supported on ACP backends",
    );
  }
  markSequenceRunContinuing(args.sequenceRunId);
  const state = getSequenceRunState(args.sequenceRunId);
  if (!state) {
    throw new Error(`sequence run state not found: ${args.sequenceRunId}`);
  }
  return executeSequenceFromState({
    state,
    startIndex: args.startIndex,
    backend: args.backend,
    providerOptions: args.providerOptions || state.providerOptions,
    executeWithProvider: args.executeWithProvider,
    appendRuntimeLog: args.appendRuntimeLog,
    onProgress: args.onProgress,
  });
}
