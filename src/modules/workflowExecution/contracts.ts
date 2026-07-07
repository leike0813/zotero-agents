import type { JobQueueManager } from "../../jobQueue/manager";
import type { LoadedWorkflow } from "../../workflows/types";
import type { WorkflowMessageFormatter } from "../workflowExecuteMessage";
import type { resolveWorkflowExecutionContext } from "../workflowSettings";

export type WorkflowExecutionContext = Awaited<
  ReturnType<typeof resolveWorkflowExecutionContext>
>;

export type PreparedWorkflowExecution = {
  workflow: LoadedWorkflow;
  requests: unknown[];
  preflight?: WorkflowPreflightExecutionState;
  skillDisplayById?: Record<
    string,
    {
      skillId: string;
      skillName?: string;
    }
  >;
  skippedByFilter: number;
  executionContext: WorkflowExecutionContext;
};

export type WorkflowPreflightUnitMeta = {
  planId: string;
  unitId: string;
  unitOrder?: number;
  context?: Record<string, unknown>;
  aggregate?: {
    id: string;
    mode: "single-apply";
  };
};

export type WorkflowPreflightShortCircuitApply = {
  index: number;
  taskLabel: string;
  parent: Zotero.Item | number | string | null;
  request: unknown;
  runResult: {
    status: "succeeded";
    requestId: string;
    fetchType: "result";
    resultJson: unknown;
    responseJson: unknown;
    [key: string]: unknown;
  };
  preflight: WorkflowPreflightUnitMeta;
};

export type WorkflowPreflightAggregatePlan = {
  id: string;
  mode: "single-apply";
  applyWhen: "all-succeeded";
  orderBy: "unit.order";
  requestIndexes: number[];
};

export type WorkflowPreflightExecutionState = {
  requestUnits: Array<WorkflowPreflightUnitMeta | undefined>;
  shortCircuitApplies: WorkflowPreflightShortCircuitApply[];
  aggregates: WorkflowPreflightAggregatePlan[];
  skippedUnits: number;
};

export type PreparationSeamResult =
  | {
      status: "ready";
      prepared: PreparedWorkflowExecution;
    }
  | {
      status: "halted";
    };

export type WorkflowRunState = {
  workflow: LoadedWorkflow;
  requests: unknown[];
  preflight?: WorkflowPreflightExecutionState;
  queue: JobQueueManager;
  jobIds: string[];
  runId: string;
  totalJobs: number;
  idlePromise: Promise<void>;
};

export type WorkflowJobOutcome = {
  index: number;
  taskLabel: string;
  succeeded: boolean;
  terminalState?: "succeeded" | "failed" | "canceled";
  reason?: string;
  structuredApplyResult?: unknown;
  jobId: string;
  requestId?: string;
  sequenceRunId?: string;
};

export type WorkflowApplySummary = {
  succeeded: number;
  failed: number;
  pending: number;
  failureReasons: string[];
  jobOutcomes: WorkflowJobOutcome[];
};

export type WorkflowToastPayload = {
  text: string;
  type: "default" | "success" | "error";
  dedupKey?: string;
  dedupWindowMs?: number;
  semantic?: "start" | "waiting" | "success" | "error" | "canceled" | "runtime";
  source?: string;
  owner?: string;
  scope?: string;
  displayGroupKey?: string;
  relatedHandles?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type WorkflowPresentationArgs = {
  workflowLabel: string;
  totalJobs: number;
  messageFormatter: WorkflowMessageFormatter;
};
