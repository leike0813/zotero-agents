import type { BackendInstance } from "../backends/types";
import type { ProviderExecutionResult } from "./contracts";

export type ProviderProgressEventRequestCreated = {
  type: "request-created";
  requestId: string;
};

export type ProviderProgressEventRequestCreating = {
  type: "request-creating";
};

export type ProviderProgressEventRequestUploading = {
  type: "request-uploading";
  requestId: string;
};

export type ProviderProgressEventRequestReady = {
  type: "request-ready";
  requestId: string;
};

export type ProviderProgressEventSequenceStep = {
  type:
    | "sequence-step-started"
    | "sequence-step-succeeded"
    | "sequence-step-deferred"
    | "sequence-step-failed"
    | "sequence-step-canceled"
    | string;
  requestId?: string;
  sequenceStepId: string;
  sequenceStepIndex?: number;
  sequenceStepSkillId?: string;
  sequenceStepSkillName?: string;
  sequenceStepTaskName?: string;
  sequenceJobId?: string;
  workflowRunId?: string;
  sequenceStepRequest?: unknown;
  [key: string]: unknown;
};

export type ProviderProgressEvent =
  | ProviderProgressEventRequestCreating
  | ProviderProgressEventRequestCreated
  | ProviderProgressEventRequestUploading
  | ProviderProgressEventRequestReady
  | ProviderProgressEventSequenceStep
  | {
      type: string;
      [key: string]: unknown;
    };

export type ProviderOrchestrationContext = {
  workflowId?: string;
  workflowLabel?: string;
  workflowRunId?: string;
  jobId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  skillId?: string;
  finalStepId?: string;
};

export type ProviderSupportsArgs = {
  requestKind: string;
  backend: BackendInstance;
};

export type ProviderExecuteArgs = {
  requestKind: string;
  request: unknown;
  backend: BackendInstance;
  providerOptions?: Record<string, unknown>;
  onProgress?: (event: ProviderProgressEvent) => void;
  orchestrationContext?: ProviderOrchestrationContext;
};

export type ProviderRuntimeOptionType = "string" | "number" | "boolean";

export type ProviderRuntimeOptionSchemaEntry = {
  type: ProviderRuntimeOptionType;
  title?: string;
  description?: string;
  placeholder?: string;
  default?: unknown;
  enum?: string[];
  disabled?: boolean;
};

export type ProviderRuntimeOptionSchema = Record<
  string,
  ProviderRuntimeOptionSchemaEntry
>;

export type Provider = {
  id: string;
  requiresBackendProfile?: boolean;
  supports: (args: ProviderSupportsArgs) => boolean;
  execute: (args: ProviderExecuteArgs) => Promise<ProviderExecutionResult>;
  getRuntimeOptionSchema?: () => ProviderRuntimeOptionSchema;
  getRuntimeOptionEnumValues?: (args: {
    key: string;
    options: Record<string, unknown>;
    backend?: BackendInstance;
  }) => string[];
  normalizeRuntimeOptions?: (
    options: unknown,
    backend?: BackendInstance,
  ) => Record<string, unknown>;
};
