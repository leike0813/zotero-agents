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
  upload_files?: Array<{ key: string; path: string }>;
  input?: unknown;
  parameter?: Record<string, unknown>;
  runtime_options?: {
    execution_mode?: "auto" | "interactive" | string;
    [key: string]: unknown;
  };
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  fetch_type?: "bundle" | "result";
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
};

export type ProviderExecutionDeferredResult = {
  status: "deferred";
  requestId: string;
  fetchType: "bundle" | "result";
  backendStatus:
    | "queued"
    | "running"
    | "waiting_user"
    | "waiting_auth";
  bundleBytes?: undefined;
  resultJson?: undefined;
  responseJson?: unknown;
};

export type ProviderExecutionResult =
  | ProviderExecutionSucceededResult
  | ProviderExecutionDeferredResult;
