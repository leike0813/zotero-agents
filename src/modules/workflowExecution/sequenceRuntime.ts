import { ACP_BACKEND_TYPE, ACP_SKILL_RUN_REQUEST_KIND } from "../../config/defaults";
import type { BackendInstance } from "../../backends/types";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
  SkillRunnerSequenceHandoffSpec,
  SkillRunnerSequenceRequestV1,
  SkillRunnerSequenceStepV1,
} from "../../providers/contracts";
import type { ProviderProgressEvent } from "../../providers/types";
import type { appendRuntimeLog } from "../runtimeLogManager";

type ExecuteWithProvider = (args: {
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  onProgress?: (event: ProviderProgressEvent) => void;
}) => Promise<ProviderExecutionResult>;

type StepOutput = {
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
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
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

function resolveStepOutput(result: ProviderExecutionResult) {
  if (typeof result.resultJson !== "undefined") {
    return result.resultJson;
  }
  if (isRecord(result.responseJson) && Object.prototype.hasOwnProperty.call(result.responseJson, "result")) {
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
  for (const [targetPath, sourcePath] of Object.entries(handoff?.parameter || {})) {
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

function buildStepRequest(args: {
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
  const declaredWorkspace = args.step.workspace || (args.stepIndex === 0 ? "new" : "reuse-workflow");
  const workspaceMode = declaredWorkspace === "reuse-workflow" ? "reuse" : "new";
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

export async function executeSkillRunnerSequence(args: {
  request: SkillRunnerSequenceRequestV1;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  workflowId: string;
  workflowRunId: string;
  jobId: string;
  executeWithProvider: ExecuteWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  if (String(args.backend.type || "").trim() !== ACP_BACKEND_TYPE) {
    throw new Error("skillrunner.sequence.v1 is only supported on ACP backends");
  }
  const outputsByStep = new Map<string, StepOutput>();
  let previousStepId = "";
  let finalResult: ProviderExecutionResult | null = null;
  for (let index = 0; index < args.request.steps.length; index++) {
    const step = args.request.steps[index];
    const stepRequest = buildStepRequest({
      sequence: args.request,
      step,
      stepIndex: index,
      workflowRunId: args.workflowRunId,
      previousStepId,
      outputsByStep,
    });
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.jobId,
      stage: "sequence-step-start",
      message: "skillrunner sequence step started",
      details: {
        stepId: step.id,
        skillId: step.skill_id,
        workspaceMode: stepRequest.runtime_options?.workflow_workspace?.mode,
      },
    });
    const stepResult = await args.executeWithProvider({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      request: stepRequest,
      backend: args.backend,
      providerOptions: args.providerOptions,
      onProgress: (event) => {
        args.onProgress?.({
          ...event,
          sequenceStepId: step.id,
          sequenceStepIndex: index,
        });
      },
    });
    if (stepResult.status === "deferred") {
      throw new Error(
        `skillrunner.sequence.v1 step '${step.id}' deferred; deferred sequence continuation is not supported yet`,
      );
    }
    const output = resolveStepOutput(stepResult);
    outputsByStep.set(step.id, {
      stepId: step.id,
      requestId: stepResult.requestId,
      output,
      result: stepResult,
    });
    previousStepId = step.id;
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.jobId,
      requestId: stepResult.requestId,
      stage: "sequence-step-finished",
      message: "skillrunner sequence step finished",
      details: {
        stepId: step.id,
        finalStep: step.id === args.request.final_step_id,
      },
    });
    if (step.id === args.request.final_step_id) {
      finalResult = stepResult;
      break;
    }
  }
  if (!finalResult) {
    throw new Error(
      `skillrunner.sequence.v1 final step '${args.request.final_step_id}' did not run`,
    );
  }
  return {
    ...finalResult,
    sequence: {
      workflow_run_id: args.workflowRunId,
      final_step_id: args.request.final_step_id,
      steps: Array.from(outputsByStep.values()).map((entry) => ({
        step_id: entry.stepId,
        request_id: entry.requestId,
        output: entry.output,
        result: entry.result,
      })),
    },
    responseJson: {
      ...(isRecord(finalResult.responseJson) ? finalResult.responseJson : {}),
      sequence: {
        workflow_run_id: args.workflowRunId,
        final_step_id: args.request.final_step_id,
        steps: Array.from(outputsByStep.values()).map((entry) => ({
          step_id: entry.stepId,
          request_id: entry.requestId,
        })),
      },
    },
  } satisfies ProviderExecutionResult;
}
