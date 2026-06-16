import type { SkillRunnerProviderState } from "../modules/skillRunnerProviderStateMachine";

export type ProviderExecutionRequestMeta = {
  targetParentID?: number;
  taskName?: string;
  sourceAttachmentPaths?: string[];
};

export type SkillRunnerHttpStepDefinition = {
  id: string;
  request: {
    method: string;
    path: string;
    json?: Record<string, unknown>;
    multipart?: boolean;
  };
  extract?: {
    request_id?: string;
  };
  repeat_until?: string;
  files?: Array<{ key: string; path: string }>;
  skillPackage?: {
    filename: string;
    zipBytes: Uint8Array;
  };
};

export type SkillRunnerHttpStepsRequest = ProviderExecutionRequestMeta & {
  kind: "http.steps";
  steps: SkillRunnerHttpStepDefinition[];
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
};

export type SkillRunnerJobRequestV1 = ProviderExecutionRequestMeta & {
  kind: "skillrunner.job.v1";
  skill_id: string;
  skill_source?: "local-package" | "installed";
  upload_files?: Array<{ key: string; path: string }>;
  input?: unknown;
  parameter?: Record<string, unknown>;
  runtime_options?: {
    execution_mode?: "auto" | "interactive" | string;
    collect_skill_run_feedback?: boolean;
    workspace?: {
      mode?: "reuse";
      request_id?: string;
    };
    env?: Record<string, string>;
    zotero_host_access?: {
      required?: boolean;
      auto_approve_writes?: boolean;
    };
    [key: string]: unknown;
  };
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  fetch_type?: "bundle" | "result";
};

export type SkillRunnerSequenceWorkspaceMode = "new" | "reuse-workflow";

export type SkillRunnerSequenceHandoffSpec = {
  from_step?: string;
  required?: boolean;
  pass_through?: boolean;
  input?: Record<string, string>;
  parameter?: Record<string, string>;
  defaults?: {
    input?: Record<string, unknown>;
    parameter?: Record<string, unknown>;
  };
};

export type SkillRunnerSequenceShortCircuitSpec = {
  when: {
    path: string;
    equals: string | number | boolean | null;
  };
  result: "step_output";
};

export type SkillRunnerSequenceStepApplySpec = {
  workflow_id?: string;
  on_failure?: "continue" | "fail_sequence";
};

export type SkillRunnerSequenceStepV1 = {
  id: string;
  skill_id: string;
  input?: Record<string, unknown>;
  parameter?: Record<string, unknown>;
  fetch_type?: "bundle" | "result";
  workspace?: SkillRunnerSequenceWorkspaceMode;
  handoff?: SkillRunnerSequenceHandoffSpec;
  short_circuit?: SkillRunnerSequenceShortCircuitSpec;
  apply_result?: SkillRunnerSequenceStepApplySpec;
};

export type SkillRunnerSequenceRequestV1 = ProviderExecutionRequestMeta & {
  kind: "skillrunner.sequence.v1";
  steps: SkillRunnerSequenceStepV1[];
  final_step_id: string;
  parameter?: Record<string, unknown>;
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  runtime_options?: {
    execution_mode?: "auto" | "interactive" | string;
    collect_skill_run_feedback?: boolean;
    workspace?: {
      mode?: "reuse";
      request_id?: string;
    };
    env?: Record<string, string>;
    zotero_host_access?: {
      required?: boolean;
      auto_approve_writes?: boolean;
    };
    [key: string]: unknown;
  };
};

export type GenericHttpRequestV1 = ProviderExecutionRequestMeta & {
  kind: "generic-http.request.v1";
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    json?: unknown;
  };
  timeout_ms?: number;
};

export type GenericHttpStepRequestDefinition = {
  method: string;
  path?: string;
  url?: string;
  headers?: Record<string, string>;
  json?: unknown;
  binary_from?: string;
  response_type?: "json" | "bytes" | "text";
};

export type GenericHttpStepDefinitionV1 = {
  id: string;
  request: GenericHttpStepRequestDefinition;
  extract?: Record<string, string>;
  repeat_until?: {
    json_path: string;
    in: unknown[];
  };
  fail_when?: {
    json_path: string;
    equals?: unknown;
    in?: unknown[];
    message?: string;
    message_path?: string;
  };
};

export type GenericHttpStepsRequestV1 = ProviderExecutionRequestMeta & {
  kind: "generic-http.steps.v1";
  context?: Record<string, unknown>;
  steps: GenericHttpStepDefinitionV1[];
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
};

export type PassThroughRunRequestV1 = ProviderExecutionRequestMeta & {
  kind: "pass-through.run.v1";
  selectionContext: unknown;
  parameter?: Record<string, unknown>;
};

export type AcpPromptRequestV1 = ProviderExecutionRequestMeta & {
  kind: "acp.prompt.v1";
  message: string;
  hostContext?: Record<string, unknown>;
};

export type AcpSkillRunRequestV1 = ProviderExecutionRequestMeta & {
  kind: "acp.skill.run.v1";
  skill_id: string;
  input?: unknown;
  parameter?: Record<string, unknown>;
  runtime_options?: {
    execution_mode?: "auto" | "interactive" | string;
    collect_skill_run_feedback?: boolean;
    zotero_host_access?: {
      required?: boolean;
      auto_approve_writes?: boolean;
    };
    workspace?: {
      mode?: "new" | "reuse";
      workflow_run_id?: string;
    };
    /** Legacy ACP fallback. New requests must use runtime_options.workspace. */
    workflow_workspace?: {
      mode?: "new" | "reuse";
      workflow_run_id?: string;
    };
    [key: string]: unknown;
  };
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  fetch_type?: "bundle" | "result";
};

export type SkillRunnerBackendRunStatus = SkillRunnerProviderState;

export type ProviderExecutionSucceededResult = {
  status: "succeeded";
  requestId: string;
  fetchType: "bundle" | "result";
  bundleBytes?: Uint8Array;
  bundleDir?: string;
  resultJson?: unknown;
  responseJson?: unknown;
  sequence?: {
    workflow_run_id?: string;
    final_step_id?: string;
    short_circuited?: boolean;
    short_circuit_step_id?: string;
    declared_final_step_id?: string;
    steps?: Array<{
      step_id?: string;
      request_id?: string;
      output?: unknown;
      result?: ProviderExecutionResult;
      apply_result?: {
        status?: "succeeded" | "failed" | "skipped";
        workflow_id?: string;
        error?: string;
        result?: unknown;
        updated_at?: string;
      };
    }>;
  };
};

export type ProviderExecutionDeferredResult = {
  status: "deferred";
  requestId: string;
  fetchType: "bundle" | "result";
  backendStatus: "queued" | "running" | "waiting_user" | "waiting_auth";
  bundleBytes?: undefined;
  resultJson?: undefined;
  responseJson?: unknown;
};

export type ProviderExecutionTerminalErrorResult = {
  status: "failed" | "canceled";
  requestId: string;
  fetchType: "bundle" | "result";
  error?: string;
  bundleBytes?: undefined;
  resultJson?: unknown;
  responseJson?: unknown;
};

export type ProviderExecutionResult =
  | ProviderExecutionSucceededResult
  | ProviderExecutionDeferredResult
  | ProviderExecutionTerminalErrorResult;
