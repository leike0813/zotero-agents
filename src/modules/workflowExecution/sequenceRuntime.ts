import {
  ACP_BACKEND_TYPE,
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_BACKEND_TYPE,
} from "../../config/defaults";
import { getBaseName, normalizeNativeLocalPath } from "../../utils/path";
import type { BackendInstance } from "../../backends/types";
import type {
  AcpSkillRunRequestV1,
  ProviderExecutionResult,
  SkillRunnerJobRequestV1,
  SkillRunnerSequenceRequestV1,
  SkillRunnerSequenceStepV1,
} from "../../providers/contracts";
import type { ProviderProgressEvent } from "../../providers/types";
import type { ProviderOrchestrationContext } from "../../providers/types";
import type { appendRuntimeLog } from "../runtimeLogManager";
import type { SkillRunnerSkillDisplayById } from "../skillRunnerSubmissionContext";
import {
  getSequenceRunState,
  initializeSequenceRunState,
  markSequenceRunContinuing,
  markSequenceRunTerminal,
  recordSequenceStepApplyResult,
  recordSequenceStepWaiting,
  recordSequenceStepRequestCreated,
  recordSequenceStepStarted,
  recordSequenceStepSucceeded,
  recordSequenceStepTerminal,
  type SequenceRunState,
} from "./sequenceStateStore";
import { updateSkillRunnerRunApplyState } from "../skillRunnerRunStore";
import { isNonRecoverableSkillRunnerFailure } from "../skillRunnerRecoverableState";

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
  applyResult?: {
    status: "succeeded" | "failed" | "skipped";
    workflowId?: string;
    result?: unknown;
    error?: string;
    updatedAt?: string;
  };
};

export type ApplySequenceStepResult = (args: {
  sequenceRequest: SkillRunnerSequenceRequestV1;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  stepRequest: AcpSkillRunRequestV1 | SkillRunnerJobRequestV1;
  stepResult: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  output: unknown;
  applyWorkflowId: string;
  finalStep: boolean;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
  sequenceSteps: Array<{
    step_id: string;
    request_id: string;
    output?: unknown;
    result?: ProviderExecutionResult;
  }>;
}) => Promise<unknown>;

type SequenceStepRequest = AcpSkillRunRequestV1 | SkillRunnerJobRequestV1;

type SkillRunnerWorkspaceFileBinding = {
  input_key: string;
  source_request_id: string;
  source_path: string;
  target_path: string;
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

function buildSequenceStepProgressContext(args: {
  state: SequenceRunState;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  stepRequest: SequenceStepRequest;
}) {
  const stepState = args.state.steps[args.stepIndex];
  return {
    sequenceStepId: args.step.id,
    sequenceStepIndex: args.stepIndex,
    sequenceStepSkillId: args.step.skill_id,
    sequenceStepSkillName: normalizeString(stepState?.skillName) || undefined,
    sequenceStepRequest: args.stepRequest,
    sequenceStepTaskName:
      normalizeString((args.stepRequest as { taskName?: unknown }).taskName) ||
      `${args.state.workflowLabel || args.state.workflowId} / ${args.step.id}`,
    workflowRunId: args.state.workflowRunId,
    sequenceJobId: args.state.jobId,
  };
}

function normalizeStepExecutionMode(value: unknown) {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "auto" || normalized === "interactive") {
    return normalized;
  }
  return "";
}

function nowIso() {
  return new Date().toISOString();
}

function primitiveEquals(left: unknown, right: unknown) {
  if (
    left === null ||
    typeof left === "string" ||
    typeof left === "number" ||
    typeof left === "boolean"
  ) {
    return left === right;
  }
  return false;
}

function getDotPath(source: unknown, path: string) {
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

function parseJsonPointer(pointer: string) {
  const normalized = normalizeString(pointer);
  if (!normalized || !normalized.startsWith("/")) {
    throw new Error("handoff target must be a JSON Pointer");
  }
  return normalized
    .split("/")
    .slice(1)
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .filter((part) => part.length > 0);
}

function getJsonPointer(source: unknown, pointer: string) {
  const normalized = normalizeString(pointer);
  if (!normalized || normalized === "/") {
    return source;
  }
  let current = source as unknown;
  for (const part of parseJsonPointer(pointer)) {
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

function getHandoffSourceValue(source: unknown, path: string) {
  const normalized = normalizeString(path);
  if (!normalized || normalized === "$") {
    return source;
  }
  if (normalized.startsWith("/")) {
    return getJsonPointer(source, normalized);
  }
  return getDotPath(source, normalized);
}

function setNestedPath(
  target: Record<string, unknown>,
  parts: string[],
  value: unknown,
) {
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

function resolveHandoffTarget(target: string) {
  const parts = parseJsonPointer(target);
  const scope = parts[0];
  const path = parts.slice(1);
  if ((scope !== "input" && scope !== "parameter") || path.length === 0) {
    throw new Error(
      "handoff target must point under /input/<key> or /parameter/<key>",
    );
  }
  return {
    scope: scope as "input" | "parameter",
    path,
  };
}

export function resolveStepOutput(result: ProviderExecutionResult) {
  if (typeof result.resultJson !== "undefined") {
    return result.resultJson;
  }
  if (result.status === "succeeded") {
    throw new Error(
      `skillrunner.sequence.v1 step '${result.requestId}' did not expose resultJson`,
    );
  }
  return result.responseJson;
}

function applyHandoffBindings(args: {
  step: SkillRunnerSequenceStepV1;
  previousStepId: string;
  outputsByStep: Map<string, StepOutput>;
  input: Record<string, unknown>;
  parameter: Record<string, unknown>;
  backendType?: string;
  workspaceMode: "new" | "reuse";
}) {
  const fileBindings: SkillRunnerWorkspaceFileBinding[] = [];
  const handoff = args.step.handoff;
  if (!handoff || !Array.isArray(handoff.bindings)) {
    return fileBindings;
  }
  for (let index = 0; index < handoff.bindings.length; index++) {
    const binding = handoff.bindings[index];
    const required = binding.required !== false;
    const target = resolveHandoffTarget(binding.target);
    if (
      binding.kind === "file" &&
      (target.scope !== "input" || target.path.length !== 1)
    ) {
      throw new Error(
        `sequence step '${args.step.id}' file handoff binding ${index} must target /input/<key>`,
      );
    }
    let value: unknown;
    let sourceOutput: StepOutput | undefined;
    let sourceStep = "";
    if (Object.prototype.hasOwnProperty.call(binding, "value")) {
      value = binding.value;
    } else {
      sourceStep = normalizeString(binding.step) || args.previousStepId;
      if (!sourceStep) {
        if (required) {
          throw new Error(
            `sequence step '${args.step.id}' handoff binding ${index} has no source step`,
          );
        }
        continue;
      }
      sourceOutput = args.outputsByStep.get(sourceStep);
      if (typeof sourceOutput?.output === "undefined") {
        if (required) {
          throw new Error(
            `sequence step '${args.step.id}' requires handoff from '${sourceStep}', but no output is available`,
          );
        }
        continue;
      }
      value = getHandoffSourceValue(sourceOutput.output, binding.source || "$");
    }
    if (typeof value === "undefined" && required) {
      throw new Error(
        `sequence step '${args.step.id}' missing handoff source '${binding.source || "$"}' for target '${binding.target}'`,
      );
    }
    if (typeof value === "undefined") {
      continue;
    }
    if (binding.kind === "file") {
      const filePath = normalizeString(value);
      if (!filePath && required) {
        throw new Error(
          `sequence step '${args.step.id}' file handoff target '${binding.target}' must resolve to a non-empty local path`,
        );
      }
      const inputKey = target.path[0];
      const isSkillRunner =
        normalizeString(args.backendType) === DEFAULT_BACKEND_TYPE;
      if (
        isSkillRunner &&
        args.workspaceMode === "reuse" &&
        sourceOutput?.requestId
      ) {
        const sourcePath = normalizeSkillRunnerWorkspaceSourcePath({
          value: filePath,
          result: sourceOutput.result,
          stepId: sourceStep,
          target: binding.target,
        });
        const targetPath = buildUploadRelativePath(inputKey, sourcePath);
        value = targetPath;
        fileBindings.push({
          input_key: inputKey,
          source_request_id: sourceOutput.requestId,
          source_path: sourcePath,
          target_path: targetPath,
        });
      } else {
        value = normalizeNativeLocalPath(filePath);
      }
    }
    if (target.scope === "input") {
      setNestedPath(args.input, target.path, value);
    } else {
      setNestedPath(args.parameter, target.path, value);
    }
  }
  return fileBindings;
}

export function buildStepRequest(args: {
  sequence: SkillRunnerSequenceRequestV1;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  workflowRunId: string;
  previousStepId: string;
  outputsByStep: Map<string, StepOutput>;
  backendType?: string;
  workspaceRequestId?: string;
}): SequenceStepRequest {
  const input = cloneRecord(args.step.input);
  const parameter = {
    ...cloneRecord(args.sequence.parameter),
    ...cloneRecord(args.step.parameter),
  };
  const declaredWorkspace =
    args.step.workspace || (args.stepIndex === 0 ? "new" : "reuse-workflow");
  const workspaceMode =
    declaredWorkspace === "reuse-workflow" ? "reuse" : "new";
  let skillRunnerFileBindings: SkillRunnerWorkspaceFileBinding[] = [];
  if (args.stepIndex > 0) {
    skillRunnerFileBindings = applyHandoffBindings({
      step: args.step,
      previousStepId: args.previousStepId,
      outputsByStep: args.outputsByStep,
      input,
      parameter,
      backendType: args.backendType,
      workspaceMode,
    });
  }
  const runtimeOptions = cloneRecord(args.sequence.runtime_options);
  delete runtimeOptions.workflow_workspace;
  const stepMode = normalizeStepExecutionMode(args.step.mode);
  if (!stepMode) {
    throw new Error(`sequence step '${args.step.id}' requires mode`);
  }
  runtimeOptions.execution_mode = stepMode;
  const sharedMeta = {
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
  if (normalizeString(args.backendType) === DEFAULT_BACKEND_TYPE) {
    if (workspaceMode === "reuse") {
      const requestId = normalizeString(args.workspaceRequestId);
      if (!requestId) {
        throw new Error(
          `sequence step '${args.step.id}' requires a reusable SkillRunner request_id`,
        );
      }
      runtimeOptions.workspace = {
        mode: "reuse",
        request_id: requestId,
        ...(skillRunnerFileBindings.length > 0
          ? { file_bindings: skillRunnerFileBindings }
          : {}),
      };
    } else {
      delete runtimeOptions.workspace;
    }
    const uploadMapping = buildSkillRunnerUploadMapping(input);
    return {
      kind: "skillrunner.job.v1",
      skill_id: args.step.skill_id,
      ...sharedMeta,
      ...(uploadMapping.upload_files.length > 0
        ? { upload_files: uploadMapping.upload_files }
        : {}),
      input: uploadMapping.input,
    } satisfies SkillRunnerJobRequestV1;
  }
  runtimeOptions.workspace = {
    mode: workspaceMode,
    workflow_run_id: args.workflowRunId,
  };
  return {
    kind: ACP_SKILL_RUN_REQUEST_KIND,
    skill_id: args.step.skill_id,
    ...sharedMeta,
  };
}

function isAbsoluteLocalPath(value: string) {
  const text = normalizeString(value).replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(text) || text.startsWith("/");
}

function sanitizeUploadPathSegment(value: string) {
  const normalized = normalizeString(value).replace(/[^A-Za-z0-9._-]+/g, "-");
  return normalized || "file";
}

function normalizeUploadRelativePath(value: string) {
  return normalizeString(value)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function buildUploadRelativePath(fileKey: string, localPath: string) {
  const fileName = getBaseName(localPath) || "upload.bin";
  return normalizeUploadRelativePath(
    `inputs/${sanitizeUploadPathSegment(fileKey)}/${fileName}`,
  );
}

function normalizePathForPrefix(value: string) {
  return normalizeString(value)
    .replace(/^file:\/\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");
}

function getNestedString(source: unknown, path: string[]) {
  let current = source;
  for (const segment of path) {
    if (!isRecord(current)) {
      return "";
    }
    current = current[segment];
  }
  return normalizeString(current);
}

function resolveResultWorkspaceDir(result: ProviderExecutionResult) {
  const direct = "workspaceDir" in result ? result.workspaceDir : undefined;
  return (
    normalizeString(direct) ||
    getNestedString(result.responseJson, ["workspaceDir"]) ||
    getNestedString(result.responseJson, ["workspace_dir"])
  );
}

function normalizeWorkspaceRelativePath(value: string) {
  const normalized = normalizeString(value)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    return "";
  }
  return segments.join("/");
}

function normalizeSkillRunnerWorkspaceSourcePath(args: {
  value: string;
  result: ProviderExecutionResult;
  stepId: string;
  target: string;
}) {
  const raw = normalizeString(args.value);
  if (!raw) {
    return "";
  }
  const normalizedRaw = normalizePathForPrefix(raw);
  const workspaceDir = normalizePathForPrefix(
    resolveResultWorkspaceDir(args.result),
  );
  if (isAbsoluteLocalPath(raw)) {
    if (workspaceDir && normalizedRaw.startsWith(`${workspaceDir}/`)) {
      const relative = normalizeWorkspaceRelativePath(
        normalizedRaw.slice(workspaceDir.length + 1),
      );
      if (relative) {
        return relative;
      }
    }
    throw new Error(
      `sequence step '${args.stepId}' file handoff source for '${args.target}' must be workspace-relative for SkillRunner reuse`,
    );
  }
  const relative = normalizeWorkspaceRelativePath(raw);
  if (!relative) {
    throw new Error(
      `sequence step '${args.stepId}' file handoff source for '${args.target}' contains invalid path segments`,
    );
  }
  return relative;
}

function buildSkillRunnerUploadMapping(input: Record<string, unknown>) {
  const mappedInput = { ...input };
  const upload_files: Array<{ key: string; path: string }> = [];
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string" || !isAbsoluteLocalPath(value)) {
      continue;
    }
    const localPath = normalizeNativeLocalPath(value);
    mappedInput[key] = buildUploadRelativePath(key, localPath);
    upload_files.push({ key, path: localPath });
  }
  return {
    input: mappedInput,
    upload_files,
  };
}

export function outputsByStepFromState(state: SequenceRunState) {
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
        applyResult: step.applyResult
          ? {
              status: step.applyResult.status,
              workflowId: step.applyResult.workflowId,
              result: step.applyResult.result,
              error: step.applyResult.error,
              updatedAt: step.applyResult.updatedAt,
            }
          : undefined,
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

function findReusableSkillRunnerRequestId(args: {
  state: SequenceRunState;
  startIndex: number;
  outputsByStep: Map<string, StepOutput>;
}) {
  for (let index = args.startIndex - 1; index >= 0; index--) {
    const step = args.state.steps[index];
    if (!step || !args.outputsByStep.has(step.stepId)) {
      continue;
    }
    const requestId = normalizeString(step.requestId);
    if (requestId) {
      return requestId;
    }
  }
  return "";
}

function resolveStepRequestKind(backendType: string) {
  return backendType === DEFAULT_BACKEND_TYPE
    ? "skillrunner.job.v1"
    : ACP_SKILL_RUN_REQUEST_KIND;
}

function resolveStepWorkspaceMode(request: SequenceStepRequest) {
  const workspace =
    request.runtime_options && isRecord(request.runtime_options.workspace)
      ? request.runtime_options.workspace
      : null;
  return normalizeString(workspace?.mode);
}

export function matchesShortCircuitRule(args: {
  step: SkillRunnerSequenceStepV1;
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

function findRecoveredShortCircuit(args: {
  state: SequenceRunState;
  startIndex: number;
  outputsByStep: Map<string, StepOutput>;
}) {
  const previous = args.state.steps[args.startIndex - 1];
  if (!previous || previous.status !== "succeeded") {
    return null;
  }
  const step = args.state.request.steps[previous.index];
  const output = args.outputsByStep.get(previous.stepId);
  if (
    !step ||
    !output ||
    output.result.status !== "succeeded" ||
    !matchesShortCircuitRule({ step, output: output.output })
  ) {
    return null;
  }
  return {
    step,
    output,
    result: output.result,
  };
}

function sequenceStepsMetadata(outputsByStep: Map<string, StepOutput>) {
  return Array.from(outputsByStep.values()).map((entry) => ({
    step_id: entry.stepId,
    request_id: entry.requestId,
  }));
}

function buildSequenceDeferredResult(args: {
  state: SequenceRunState;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  requestId: string;
  stepResult: Extract<ProviderExecutionResult, { status: "deferred" }>;
  outputsByStep: Map<string, StepOutput>;
}) {
  const responseJson = cloneRecord(args.stepResult.responseJson);
  const existingSequence = cloneRecord(responseJson.sequence);
  return {
    ...args.stepResult,
    requestId: args.requestId || args.stepResult.requestId,
    responseJson: {
      ...responseJson,
      sequence: {
        ...existingSequence,
        workflow_run_id: args.state.workflowRunId,
        final_step_id: args.state.request.final_step_id,
        steps: sequenceStepsMetadata(args.outputsByStep),
        pending_step_id: args.step.id,
        pending_step_index: args.stepIndex,
        pending_step_job_id: `${args.state.jobId}:${args.step.id}`,
      },
    },
  } satisfies Extract<ProviderExecutionResult, { status: "deferred" }>;
}

function sequenceStepsWithOutputs(outputsByStep: Map<string, StepOutput>) {
  return Array.from(outputsByStep.values()).map((entry) => ({
    step_id: entry.stepId,
    request_id: entry.requestId,
    output: entry.output,
    result: entry.result,
    ...(entry.applyResult
      ? {
          apply_result: {
            status: entry.applyResult.status,
            workflow_id: entry.applyResult.workflowId,
            error: entry.applyResult.error,
            result: entry.applyResult.result,
            updated_at: entry.applyResult.updatedAt,
          },
        }
      : {}),
  }));
}

export function resolveStepApplyWorkflowId(step: SkillRunnerSequenceStepV1) {
  if (!step.apply_result) {
    return "";
  }
  return normalizeString(step.apply_result.workflow_id) || step.skill_id;
}

export function resolveStepApplyFailureMode(step: SkillRunnerSequenceStepV1) {
  return step.apply_result?.on_failure === "fail_sequence"
    ? "fail_sequence"
    : "continue";
}

function stringifyUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name || "unknown error";
  }
  if (!error || typeof error !== "object") {
    return String(error || "unknown error");
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown object error";
  }
}

function sequenceStepApplyEventType(
  state: "running" | "succeeded" | "failed" | "skipped",
) {
  if (state === "running") {
    return "apply.started";
  }
  if (state === "succeeded") {
    return "apply.succeeded";
  }
  if (state === "failed") {
    return "apply.failed";
  }
  return "apply.skipped";
}

function syncSkillRunnerSequenceStepApplyState(args: {
  state: SequenceRunState;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  backend: BackendInstance;
  requestId: string;
  applyState: "running" | "succeeded" | "failed" | "skipped";
  applyWorkflowId?: string;
  error?: string;
  source: string;
  reason?: string;
}) {
  if (normalizeString(args.backend.type) !== DEFAULT_BACKEND_TYPE) {
    return;
  }
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  updateSkillRunnerRunApplyState({
    backendId: args.backend.id,
    requestId,
    state: args.applyState,
    error: args.error,
    updatedAt: nowIso(),
    eventType: sequenceStepApplyEventType(args.applyState),
    eventPayload: {
      source: args.source,
      sequenceRunId: args.state.sequenceRunId,
      workflowRunId: args.state.workflowRunId,
      stepId: args.step.id,
      stepIndex: args.stepIndex,
      applyWorkflowId: normalizeString(args.applyWorkflowId) || undefined,
      reason: normalizeString(args.reason) || undefined,
    },
  });
}

async function applySequenceStepIfNeeded(args: {
  state: SequenceRunState;
  step: SkillRunnerSequenceStepV1;
  stepIndex: number;
  stepRequest: SequenceStepRequest;
  stepResult: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  output: unknown;
  outputsByStep: Map<string, StepOutput>;
  backend: BackendInstance;
  appendRuntimeLog: typeof appendRuntimeLog;
  applySequenceStepResult?: ApplySequenceStepResult;
  syncSkillRunnerRunApplyState?: boolean;
}) {
  const applyWorkflowId = resolveStepApplyWorkflowId(args.step);
  const shouldSyncRunApplyState = args.syncSkillRunnerRunApplyState !== false;
  if (!applyWorkflowId) {
    if (shouldSyncRunApplyState) {
      syncSkillRunnerSequenceStepApplyState({
        state: args.state,
        step: args.step,
        stepIndex: args.stepIndex,
        backend: args.backend,
        requestId: args.stepResult.requestId,
        applyState: "skipped",
        source: "workflowExecution.sequenceRuntime.stepApplySkipped",
        reason: "no-apply-result",
      });
    }
    return;
  }
  const existing = args.state.steps[args.stepIndex]?.applyResult;
  if (existing?.status === "succeeded") {
    const current = args.outputsByStep.get(args.step.id);
    if (current) {
      args.outputsByStep.set(args.step.id, {
        ...current,
        applyResult: existing,
      });
    }
    if (shouldSyncRunApplyState) {
      syncSkillRunnerSequenceStepApplyState({
        state: args.state,
        step: args.step,
        stepIndex: args.stepIndex,
        backend: args.backend,
        requestId: args.stepResult.requestId,
        applyState: "succeeded",
        applyWorkflowId: existing.workflowId || applyWorkflowId,
        source: "workflowExecution.sequenceRuntime.stepApplyExisting",
      });
    }
    return;
  }
  if (!args.applySequenceStepResult) {
    const updated = recordSequenceStepApplyResult({
      sequenceRunId: args.state.sequenceRunId,
      stepIndex: args.stepIndex,
      workflowId: applyWorkflowId,
      status: "skipped",
      error: "sequence step apply callback unavailable",
    });
    const applyResult = updated?.steps[args.stepIndex]?.applyResult;
    const current = args.outputsByStep.get(args.step.id);
    if (current && applyResult) {
      args.outputsByStep.set(args.step.id, { ...current, applyResult });
    }
    if (shouldSyncRunApplyState) {
      syncSkillRunnerSequenceStepApplyState({
        state: args.state,
        step: args.step,
        stepIndex: args.stepIndex,
        backend: args.backend,
        requestId: args.stepResult.requestId,
        applyState: "skipped",
        applyWorkflowId,
        error: applyResult?.error || "sequence step apply callback unavailable",
        source: "workflowExecution.sequenceRuntime.stepApplyUnavailable",
      });
    }
    return;
  }
  args.appendRuntimeLog({
    level: "info",
    scope: "job",
    workflowId: args.state.workflowId,
    backendId: args.backend.id,
    backendType: args.backend.type,
    jobId: args.state.jobId,
    requestId: args.stepResult.requestId,
    stage: "sequence-step-apply-start",
    message: "skillrunner sequence step applyResult started",
    details: {
      stepId: args.step.id,
      skillId: args.step.skill_id,
      applyWorkflowId,
    },
  });
  if (shouldSyncRunApplyState) {
    syncSkillRunnerSequenceStepApplyState({
      state: args.state,
      step: args.step,
      stepIndex: args.stepIndex,
      backend: args.backend,
      requestId: args.stepResult.requestId,
      applyState: "running",
      applyWorkflowId,
      source: "workflowExecution.sequenceRuntime.stepApply",
    });
  }
  try {
    const result = await args.applySequenceStepResult({
      sequenceRequest: args.state.request,
      step: args.step,
      stepIndex: args.stepIndex,
      stepRequest: args.stepRequest,
      stepResult: args.stepResult,
      output: args.output,
      applyWorkflowId,
      finalStep: args.step.id === args.state.request.final_step_id,
      workflowId: args.state.workflowId,
      workflowLabel: args.state.workflowLabel,
      workflowRunId: args.state.workflowRunId,
      jobId: args.state.jobId,
      sequenceSteps: sequenceStepsWithOutputs(args.outputsByStep),
    });
    const updated = recordSequenceStepApplyResult({
      sequenceRunId: args.state.sequenceRunId,
      stepIndex: args.stepIndex,
      workflowId: applyWorkflowId,
      status: "succeeded",
      result,
    });
    const applyResult = updated?.steps[args.stepIndex]?.applyResult;
    const current = args.outputsByStep.get(args.step.id);
    if (current && applyResult) {
      args.outputsByStep.set(args.step.id, { ...current, applyResult });
    }
    if (shouldSyncRunApplyState) {
      syncSkillRunnerSequenceStepApplyState({
        state: args.state,
        step: args.step,
        stepIndex: args.stepIndex,
        backend: args.backend,
        requestId: args.stepResult.requestId,
        applyState: "succeeded",
        applyWorkflowId,
        source: "workflowExecution.sequenceRuntime.stepApply",
      });
    }
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.state.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.state.jobId,
      requestId: args.stepResult.requestId,
      stage: "sequence-step-apply-succeeded",
      message: "skillrunner sequence step applyResult succeeded",
      details: {
        stepId: args.step.id,
        applyWorkflowId,
      },
    });
  } catch (error) {
    const message = stringifyUnknownError(error);
    const updated = recordSequenceStepApplyResult({
      sequenceRunId: args.state.sequenceRunId,
      stepIndex: args.stepIndex,
      workflowId: applyWorkflowId,
      status: "failed",
      error: message,
    });
    const applyResult = updated?.steps[args.stepIndex]?.applyResult;
    const current = args.outputsByStep.get(args.step.id);
    if (current && applyResult) {
      args.outputsByStep.set(args.step.id, { ...current, applyResult });
    }
    if (shouldSyncRunApplyState) {
      syncSkillRunnerSequenceStepApplyState({
        state: args.state,
        step: args.step,
        stepIndex: args.stepIndex,
        backend: args.backend,
        requestId: args.stepResult.requestId,
        applyState: "failed",
        applyWorkflowId,
        error: message,
        source: "workflowExecution.sequenceRuntime.stepApply",
      });
    }
    args.appendRuntimeLog({
      level: "error",
      scope: "job",
      workflowId: args.state.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.state.jobId,
      requestId: args.stepResult.requestId,
      stage: "sequence-step-apply-failed",
      message: "skillrunner sequence step applyResult failed",
      details: {
        stepId: args.step.id,
        applyWorkflowId,
        reason: message,
      },
    });
    if (resolveStepApplyFailureMode(args.step) === "fail_sequence") {
      markSequenceRunTerminal({
        sequenceRunId: args.state.sequenceRunId,
        status: "failed",
        error: message,
      });
      throw error;
    }
  }
}

export async function applySequenceStepResultIfNeeded(args: {
  state: SequenceRunState;
  stepIndex: number;
  stepRequest: SequenceStepRequest;
  stepResult: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  output: unknown;
  backend: BackendInstance;
  appendRuntimeLog: typeof appendRuntimeLog;
  applySequenceStepResult: ApplySequenceStepResult;
  syncSkillRunnerRunApplyState?: boolean;
}) {
  const step = args.state.request.steps[args.stepIndex];
  if (!step) {
    return false;
  }
  const outputsByStep = outputsByStepFromState(args.state);
  if (!outputsByStep.has(step.id)) {
    outputsByStep.set(step.id, {
      stepId: step.id,
      requestId: args.stepResult.requestId,
      output: args.output,
      result: args.stepResult,
    });
  }
  await applySequenceStepIfNeeded({
    state: args.state,
    step,
    stepIndex: args.stepIndex,
    stepRequest: args.stepRequest,
    stepResult: args.stepResult,
    output: args.output,
    outputsByStep,
    backend: args.backend,
    appendRuntimeLog: args.appendRuntimeLog,
    applySequenceStepResult: args.applySequenceStepResult,
    syncSkillRunnerRunApplyState: args.syncSkillRunnerRunApplyState,
  });
  return true;
}

async function applyPendingSucceededStepsBeforeStart(args: {
  state: SequenceRunState;
  startIndex: number;
  outputsByStep: Map<string, StepOutput>;
  backend: BackendInstance;
  appendRuntimeLog: typeof appendRuntimeLog;
  applySequenceStepResult?: ApplySequenceStepResult;
}) {
  for (let index = 0; index < args.startIndex; index++) {
    const stepState = args.state.steps[index];
    const step = args.state.request.steps[index];
    if (
      !step ||
      !stepState ||
      stepState.status !== "succeeded" ||
      stepState.result?.status !== "succeeded" ||
      typeof stepState.output === "undefined" ||
      stepState.applyResult?.status === "succeeded"
    ) {
      continue;
    }
    const previousStepId = findPreviousStepId({
      state: args.state,
      startIndex: index,
      outputsByStep: args.outputsByStep,
    });
    const stepRequest = buildStepRequest({
      sequence: args.state.request,
      step,
      stepIndex: index,
      workflowRunId: args.state.workflowRunId,
      previousStepId,
      outputsByStep: args.outputsByStep,
      backendType: normalizeString(args.backend.type),
      workspaceRequestId: findReusableSkillRunnerRequestId({
        state: args.state,
        startIndex: index,
        outputsByStep: args.outputsByStep,
      }),
    });
    await applySequenceStepIfNeeded({
      state: args.state,
      step,
      stepIndex: index,
      stepRequest,
      stepResult: stepState.result,
      output: stepState.output,
      outputsByStep: args.outputsByStep,
      backend: args.backend,
      appendRuntimeLog: args.appendRuntimeLog,
      applySequenceStepResult: args.applySequenceStepResult,
    });
  }
}

export function buildSequenceResult(args: {
  finalResult: Extract<ProviderExecutionResult, { status: "succeeded" }>;
  workflowRunId: string;
  finalStepId: string;
  outputsByStep: Map<string, StepOutput>;
  shortCircuitStepId?: string;
}) {
  const shortCircuitStepId = normalizeString(args.shortCircuitStepId);
  const sequenceMetadata = {
    workflow_run_id: args.workflowRunId,
    final_step_id: args.finalStepId,
    ...(shortCircuitStepId
      ? {
          short_circuited: true,
          short_circuit_step_id: shortCircuitStepId,
          declared_final_step_id: args.finalStepId,
        }
      : {}),
  };
  return {
    ...args.finalResult,
    sequence: {
      ...sequenceMetadata,
      steps: sequenceStepsWithOutputs(args.outputsByStep),
    },
    responseJson: {
      ...(isRecord(args.finalResult.responseJson)
        ? args.finalResult.responseJson
        : {}),
      sequence: {
        ...sequenceMetadata,
        steps: sequenceStepsMetadata(args.outputsByStep),
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
  applySequenceStepResult?: ApplySequenceStepResult;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  const backendType = normalizeString(args.backend.type);
  if (
    backendType !== ACP_BACKEND_TYPE &&
    backendType !== DEFAULT_BACKEND_TYPE
  ) {
    throw new Error(
      `skillrunner.sequence.v1 is only supported on ACP or SkillRunner backends; got ${backendType || "unknown"}`,
    );
  }
  const foregroundStepApply = true;
  const stepRequestKind = resolveStepRequestKind(backendType);
  const outputsByStep = outputsByStepFromState(args.state);
  if (foregroundStepApply) {
    await applyPendingSucceededStepsBeforeStart({
      state: args.state,
      startIndex: args.startIndex,
      outputsByStep,
      backend: args.backend,
      appendRuntimeLog: args.appendRuntimeLog,
      applySequenceStepResult: args.applySequenceStepResult,
    });
  }
  const recoveredShortCircuit = findRecoveredShortCircuit({
    state: args.state,
    startIndex: args.startIndex,
    outputsByStep,
  });
  if (recoveredShortCircuit) {
    markSequenceRunTerminal({
      sequenceRunId: args.state.sequenceRunId,
      status: "completed",
    });
    args.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.state.workflowId,
      backendId: args.backend.id,
      backendType: args.backend.type,
      jobId: args.state.jobId,
      requestId: recoveredShortCircuit.result.requestId,
      stage: "sequence-short-circuit",
      message: "skillrunner sequence short-circuited",
      details: {
        stepId: recoveredShortCircuit.step.id,
        declaredFinalStepId: args.state.request.final_step_id,
        recovered: true,
      },
    });
    return buildSequenceResult({
      finalResult: {
        ...recoveredShortCircuit.result,
        resultJson: recoveredShortCircuit.output.output,
      },
      workflowRunId: args.state.workflowRunId,
      finalStepId: args.state.request.final_step_id,
      outputsByStep,
      shortCircuitStepId: recoveredShortCircuit.step.id,
    });
  }
  let previousStepId = findPreviousStepId({
    state: args.state,
    startIndex: args.startIndex,
    outputsByStep,
  });
  let workspaceRequestId = findReusableSkillRunnerRequestId({
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
      backendType,
      workspaceRequestId,
    });
    const stepProgressContext = buildSequenceStepProgressContext({
      state: args.state,
      step,
      stepIndex: index,
      stepRequest,
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
        workspaceMode: resolveStepWorkspaceMode(stepRequest),
      },
    });
    args.onProgress?.({
      type: "sequence-step-started",
      ...stepProgressContext,
    });
    let progressRequestId = "";
    let stepResult: ProviderExecutionResult;
    try {
      stepResult = await args.executeWithProvider({
        requestKind: stepRequestKind,
        request: stepRequest,
        backend: args.backend,
        providerOptions: args.providerOptions,
        orchestrationContext: {
          workflowId: args.state.workflowId,
          workflowLabel: args.state.workflowLabel,
          workflowRunId: args.state.workflowRunId,
          jobId: `${args.state.jobId}:${step.id}`,
          sequenceStepId: step.id,
          sequenceStepIndex: index,
          skillId: step.skill_id,
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
            ...stepProgressContext,
          });
        },
      });
    } catch (error) {
      const message = stringifyUnknownError(error);
      if (progressRequestId && !isNonRecoverableSkillRunnerFailure(error)) {
        const observerFailureResult = buildSequenceDeferredResult({
          state: args.state,
          step,
          stepIndex: index,
          requestId: progressRequestId,
          stepResult: {
            status: "deferred",
            requestId: progressRequestId,
            fetchType: "bundle",
            backendStatus: "running",
            detachReason: "observer_failure",
            continuationOwner: "recovery",
          },
          outputsByStep,
        });
        recordSequenceStepWaiting({
          sequenceRunId: args.state.sequenceRunId,
          stepIndex: index,
          requestId: progressRequestId,
          result: observerFailureResult,
        });
        args.onProgress?.({
          type: "sequence-step-deferred",
          requestId: progressRequestId,
          backendStatus: "running",
          detachReason: "observer_failure",
          error: message,
          ...stepProgressContext,
        });
        return observerFailureResult;
      }
      recordSequenceStepTerminal({
        sequenceRunId: args.state.sequenceRunId,
        stepIndex: index,
        requestId: progressRequestId,
        status: "failed",
        error: message,
      });
      args.onProgress?.({
        type: "sequence-step-failed",
        requestId: progressRequestId,
        error: message,
        ...stepProgressContext,
      });
      throw error;
    }
    const resultRequestId =
      normalizeString(stepResult.requestId) || progressRequestId;
    if (stepResult.status === "deferred") {
      const sequenceDeferredResult = buildSequenceDeferredResult({
        state: args.state,
        step,
        stepIndex: index,
        requestId: resultRequestId,
        stepResult,
        outputsByStep,
      });
      recordSequenceStepWaiting({
        sequenceRunId: args.state.sequenceRunId,
        stepIndex: index,
        requestId: resultRequestId,
        result: sequenceDeferredResult,
      });
      args.onProgress?.({
        type: "sequence-step-deferred",
        requestId: resultRequestId,
        backendStatus: stepResult.backendStatus,
        ...stepProgressContext,
      });
      return sequenceDeferredResult;
    }
    if (stepResult.status !== "succeeded") {
      const terminalError =
        stepResult.status === "failed"
          ? stepResult.error || `sequence step '${step.id}' failed`
          : `sequence step '${step.id}' canceled`;
      recordSequenceStepTerminal({
        sequenceRunId: args.state.sequenceRunId,
        stepIndex: index,
        requestId: resultRequestId,
        status: stepResult.status === "canceled" ? "canceled" : "failed",
        error: terminalError,
      });
      args.onProgress?.({
        type:
          stepResult.status === "canceled"
            ? "sequence-step-canceled"
            : "sequence-step-failed",
        requestId: resultRequestId,
        error: stepResult.status === "failed" ? terminalError : undefined,
        ...stepProgressContext,
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
    args.onProgress?.({
      type: "sequence-step-succeeded",
      requestId: stepResult.requestId,
      ...stepProgressContext,
    });
    await applySequenceStepIfNeeded({
      state: args.state,
      step,
      stepIndex: index,
      stepRequest,
      stepResult,
      output,
      outputsByStep,
      backend: args.backend,
      appendRuntimeLog: args.appendRuntimeLog,
      applySequenceStepResult: args.applySequenceStepResult,
    });
    previousStepId = step.id;
    workspaceRequestId =
      normalizeString(stepResult.requestId) || workspaceRequestId;
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
    if (matchesShortCircuitRule({ step, output })) {
      markSequenceRunTerminal({
        sequenceRunId: args.state.sequenceRunId,
        status: "completed",
      });
      args.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.state.workflowId,
        backendId: args.backend.id,
        backendType: args.backend.type,
        jobId: args.state.jobId,
        requestId: stepResult.requestId,
        stage: "sequence-short-circuit",
        message: "skillrunner sequence short-circuited",
        details: {
          stepId: step.id,
          declaredFinalStepId: args.state.request.final_step_id,
        },
      });
      return buildSequenceResult({
        finalResult: {
          ...stepResult,
          resultJson: output,
        },
        workflowRunId: args.state.workflowRunId,
        finalStepId: args.state.request.final_step_id,
        outputsByStep,
        shortCircuitStepId: step.id,
      });
    }
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
  skillDisplayById?: SkillRunnerSkillDisplayById;
  workflowId: string;
  workflowLabel?: string;
  workflowRunId: string;
  jobId: string;
  executeWithProvider: ExecuteWithProvider;
  applySequenceStepResult?: ApplySequenceStepResult;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
  const state = initializeSequenceRunState({
    request: args.request,
    backend: args.backend,
    providerOptions: args.providerOptions,
    workflowId: args.workflowId,
    workflowLabel: args.workflowLabel,
    workflowRunId: args.workflowRunId,
    jobId: args.jobId,
    skillDisplayById: args.skillDisplayById,
  });
  return executeSequenceFromState({
    state,
    startIndex: 0,
    backend: args.backend,
    providerOptions: args.providerOptions,
    executeWithProvider: args.executeWithProvider,
    applySequenceStepResult: args.applySequenceStepResult,
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
  applySequenceStepResult?: ApplySequenceStepResult;
  appendRuntimeLog: typeof appendRuntimeLog;
  onProgress?: (event: ProviderProgressEvent) => void;
}) {
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
    applySequenceStepResult: args.applySequenceStepResult,
    appendRuntimeLog: args.appendRuntimeLog,
    onProgress: args.onProgress,
  });
}
