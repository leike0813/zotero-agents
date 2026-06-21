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
  semantic?:
    | "start"
    | "waiting"
    | "success"
    | "error"
    | "canceled"
    | "runtime";
};

export type WorkflowPresentationArgs = {
  workflowLabel: string;
  totalJobs: number;
  messageFormatter: WorkflowMessageFormatter;
};
