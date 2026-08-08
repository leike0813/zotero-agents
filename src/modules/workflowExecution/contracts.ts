import type { JobQueueManager } from "../../jobQueue/manager";
import type {
  LoadedWorkflow,
  WorkflowRuntimeContext,
} from "../../workflows/types";
import type {
  PreparedWorkflowInputUnit,
  WorkflowScopedSelectionContext,
} from "../../workflows/workflowInputPlanning";
import type { WorkflowMessageFormatter } from "../workflowExecuteMessage";
import type { resolveWorkflowExecutionContext } from "../workflowSettings";

export type WorkflowExecutionContext = Awaited<
  ReturnType<typeof resolveWorkflowExecutionContext>
>;

export type PreparedWorkflowUnit = PreparedWorkflowInputUnit;

export type WorkflowRequestBuildPlan = Readonly<{
  units: ReadonlyArray<PreparedWorkflowUnit>;
  stats: Readonly<{
    totalUnits: number;
    executableUnits: number;
    skippedUnits: number;
    candidateStats: Readonly<{
      total: number;
      accepted: number;
      skipped: number;
      reasons: Readonly<Record<string, number>>;
    }>;
  }>;
}>;

export type PreparedWorkflowExecution = {
  workflow: LoadedWorkflow;
  plan: WorkflowRequestBuildPlan;
  selectionContext: WorkflowScopedSelectionContext;
  executionOptions: Readonly<{
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    runOptions?: import("../../workflows/zoteroHostAccessOptions").WorkflowRunOptions;
    hostOptions?: import("../workflowSettingsDomain").WorkflowHostOptions;
  }>;
  candidateSkipped: number;
  executionContext: WorkflowExecutionContext;
  runtime?: Partial<WorkflowRuntimeContext>;
};

export type BuiltPreparedWorkflowUnit = {
  workflow: LoadedWorkflow;
  unit: PreparedWorkflowUnit;
  requests: unknown[];
  preflight?: WorkflowPreflightExecutionState;
  skillDisplayById?: Record<
    string,
    {
      skillId: string;
      skillName?: string;
    }
  >;
  executionContext: WorkflowExecutionContext;
  executionOptions: PreparedWorkflowExecution["executionOptions"];
  runtime?: Partial<WorkflowRuntimeContext>;
};

export type BuildPreparedWorkflowUnitResult =
  | {
      status: "ready";
      built: BuiltPreparedWorkflowUnit;
    }
  | {
      status: "skipped";
      skippedUnits: number;
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
  unit?: PreparedWorkflowUnit;
  requests: unknown[];
  preflight?: WorkflowPreflightExecutionState;
  queue: JobQueueManager;
  jobIds: string[];
  runId: string;
  totalJobs: number;
  idlePromise: Promise<void>;
  terminalPromise: Promise<void>;
  runtime?: Partial<WorkflowRuntimeContext>;
  executionOptions?: PreparedWorkflowExecution["executionOptions"];
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
