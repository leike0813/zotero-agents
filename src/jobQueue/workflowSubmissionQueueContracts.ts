declare const workflowSubmissionIdBrand: unique symbol;
declare const workflowQueueEntryIdBrand: unique symbol;

export type WorkflowSubmissionId = string & {
  readonly [workflowSubmissionIdBrand]: true;
};

export type WorkflowQueueEntryId = string & {
  readonly [workflowQueueEntryIdBrand]: true;
};

export type WorkflowQueueBackendType = "acp" | "skillrunner";

export type WorkflowQueueBackendScope = Readonly<{
  backendType: WorkflowQueueBackendType;
  backendId: string;
}>;

export type WorkflowQueueDisplayIdentity = Readonly<{
  unitId: string;
  order: number;
  taskName: string;
  inputUnitIdentity?: string;
}>;

export type WorkflowQueueWorkflowIdentity = Readonly<{
  workflowId: string;
  workflowLabel: string;
}>;

export type WorkflowExecutionUnitOutcome =
  | Readonly<{ status: "succeeded" }>
  | Readonly<{ status: "failed"; reasonCode: string }>
  | Readonly<{ status: "skipped"; reasonCode: string }>;

export type WorkflowSubmissionSummary = Readonly<{
  submissionId: WorkflowSubmissionId;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}>;

export type QueuedWorkflowUnitSnapshot = Readonly<{
  queueId: WorkflowQueueEntryId;
  submissionId: WorkflowSubmissionId;
  unitId: string;
  unitOrder: number;
  workflowId: string;
  workflowLabel: string;
  taskName: string;
  inputUnitIdentity?: string;
  backendType: WorkflowQueueBackendType;
  backendId: string;
  createdAt: string;
  canCancel: true;
}>;

export type WorkflowQueueRemovalReason = "admitted" | "canceled" | "shutdown";

export type WorkflowSubmissionQueueChangeEvent =
  | Readonly<{
      type: "added";
      entry: QueuedWorkflowUnitSnapshot;
      reason?: undefined;
    }>
  | Readonly<{
      type: "removed";
      queueId: WorkflowQueueEntryId;
      backend: WorkflowQueueBackendScope;
      reason: WorkflowQueueRemovalReason;
    }>
  | Readonly<{
      type: "reset";
      reason?: undefined;
    }>;

export type WorkflowQueueCancelResult =
  | Readonly<{
      status: "canceled";
      queueId: WorkflowQueueEntryId;
    }>
  | Readonly<{
      status: "not-pending";
      queueId: WorkflowQueueEntryId;
    }>;

export type WorkflowSubmissionQueueUnit<TUnit> = Readonly<{
  unit: TUnit;
  display: WorkflowQueueDisplayIdentity;
}>;

export type WorkflowSubmissionQueueConfig<TUnit> = Readonly<{
  backend: WorkflowQueueBackendScope;
  workflow: WorkflowQueueWorkflowIdentity;
  units: ReadonlyArray<WorkflowSubmissionQueueUnit<TUnit>>;
  maxConcurrency?: number;
  initialOutcomes?: ReadonlyArray<WorkflowExecutionUnitOutcome>;
  executeUnit: (unit: TUnit) => Promise<WorkflowExecutionUnitOutcome>;
}>;

export type WorkflowSubmissionHandle = Readonly<{
  submissionId: WorkflowSubmissionId;
  completion: Promise<WorkflowSubmissionSummary>;
}>;

export type WorkflowQueueIdentityQuery = Readonly<{
  workflowId: string;
  inputUnitIdentity: string;
}>;

export type WorkflowSubmissionQueueListener = (
  event: WorkflowSubmissionQueueChangeEvent,
) => void;
