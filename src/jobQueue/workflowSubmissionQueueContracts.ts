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
  memberIdentities?: ReadonlyArray<string>;
  memberCount?: number;
}>;

export type WorkflowQueueWorkflowIdentity = Readonly<{
  workflowId: string;
  workflowLabel: string;
}>;

export type WorkflowSubmissionDisplayIdentity = Readonly<{
  symbol: string;
  provider: string;
  model: string;
}>;

export type WorkflowSubmissionPresentationInput = Readonly<{
  provider?: string;
  model?: string;
}>;

export type WorkflowSubmissionSlotYieldReason =
  | "waiting-user"
  | "waiting-auth"
  | "recoverable-failure";

export type WorkflowSubmissionSlotResumeReason =
  | "user-reply"
  | "auth-reply"
  | "retry"
  | "remote-resume"
  | "host-apply";

export type WorkflowSubmissionSlotState =
  | "held"
  | "yielded"
  | "resumption-pending"
  | "settled";

export type WorkflowSubmissionSlotSnapshot = Readonly<{
  submissionId: WorkflowSubmissionId;
  submissionUnitId: WorkflowQueueEntryId;
  state: WorkflowSubmissionSlotState;
  yieldReason?: WorkflowSubmissionSlotYieldReason;
  resumeReason?: WorkflowSubmissionSlotResumeReason;
}>;

export type WorkflowSubmissionSlotCoordinator = Readonly<{
  yield: (reason: WorkflowSubmissionSlotYieldReason) => boolean;
  ensureSlot: (reason: WorkflowSubmissionSlotResumeReason) => Promise<boolean>;
  runWithPrioritySlot: <T>(
    reason: WorkflowSubmissionSlotResumeReason,
    callback: () => Promise<T> | T,
  ) => Promise<boolean>;
  cancelPendingResumption: () => boolean;
  snapshot: () => WorkflowSubmissionSlotSnapshot | null;
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
  memberCount: number;
  backendType: WorkflowQueueBackendType;
  backendId: string;
  createdAt: string;
  canCancel: true;
  submission: WorkflowSubmissionDisplayIdentity;
}>;

export type ActiveWorkflowSubmissionUnitSnapshot = Readonly<{
  queueId: WorkflowQueueEntryId;
  submissionId: WorkflowSubmissionId;
  unitId: string;
  unitOrder: number;
  taskName: string;
  memberCount: number;
  createdAt: string;
  state: "pending" | "admitted" | "yielded" | "resumption-pending";
  canCancel: boolean;
}>;

export type ActiveWorkflowSubmissionSnapshot = Readonly<{
  submissionId: WorkflowSubmissionId;
  workflowId: string;
  workflowLabel: string;
  backendType: WorkflowQueueBackendType;
  backendId: string;
  submission: WorkflowSubmissionDisplayIdentity;
  total: number;
  initiallySkipped: number;
  pending: number;
  admitted: number;
  settled: number;
  units: ReadonlyArray<ActiveWorkflowSubmissionUnitSnapshot>;
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
    }>
  | Readonly<{
      type: "slot-changed";
      queueId: WorkflowQueueEntryId;
      backend: WorkflowQueueBackendScope;
      state: WorkflowSubmissionSlotState;
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

export type WorkflowSubmissionQueueExecutionContext = Readonly<{
  submissionId: WorkflowSubmissionId;
  submissionUnitId: WorkflowQueueEntryId;
  inputUnitIdentity?: string;
  slot: WorkflowSubmissionSlotCoordinator;
}>;

export type WorkflowSubmissionQueueConfig<TUnit> = Readonly<{
  backend: WorkflowQueueBackendScope;
  workflow: WorkflowQueueWorkflowIdentity;
  units: ReadonlyArray<WorkflowSubmissionQueueUnit<TUnit>>;
  maxConcurrency?: number;
  presentation?: WorkflowSubmissionPresentationInput;
  initialOutcomes?: ReadonlyArray<WorkflowExecutionUnitOutcome>;
  onTerminal?: (summary: WorkflowSubmissionSummary) => void;
  executeUnit: (
    unit: TUnit,
    context: WorkflowSubmissionQueueExecutionContext,
  ) => Promise<WorkflowExecutionUnitOutcome>;
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
