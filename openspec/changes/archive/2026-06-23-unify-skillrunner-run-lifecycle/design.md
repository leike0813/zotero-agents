# SkillRunner Run Lifecycle Design

## Decisions

- `runKey` is the local SkillRunner identity. It is allocated before backend
  request creation and never changes.
- `requestId` is backend correlation. `request-created` attaches it to the
  existing `runKey`; it never creates a replacement task row.
- Single SkillRunner jobs and sequence workflow steps use one lifecycle path.
- Sequence runtime owns orchestration and step ordering only. SkillRunner run
  lifecycle owns execution state, observer state, recovery state, and apply
  state.
- Persistent run records store only lifecycle, recovery, and execution facts.
- UI rows are projections and must not own lifecycle truth.
- `tolerate-skillrunner-terminal-failure` is superseded by this model.

## Persistent Model

`SkillRunnerRunRecord` is the only persisted SkillRunner lifecycle record. It
keeps facts required for recovery and execution. Display and registry facts are
resolved dynamically.

```ts
type SkillRunnerRunRecord = {
  schemaVersion: "3.0.0";

  runKey: string;          // local SSOT, immutable
  requestId?: string;      // backend correlation, attached after create
  backendId: string;       // dynamic cascade to backend config

  workflowId: string;
  workflowRunId: string;
  jobId: string;
  taskName: string;        // run-time display intent, acceptable snapshot

  skillId?: string;        // dynamic cascade to skillName

  sequenceRunId?: string;
  sequenceJobId?: string;
  sequenceStepId?: string;

  status: SkillRunnerStatus;
  submitPhase: SkillRunnerSubmitPhase;
  backendStatus?: SkillRunnerStatus;
  observerState?: "attached" | "detached";
  error?: string;

  requestPayload?: unknown;
  fetchType?: "bundle" | "result";
  executionMode?: "auto" | "interactive";
  apply: SkillRunnerApplyState;
  result?: SkillRunnerResultState;

  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

The run record must not persist:

- `backendBaseUrl`, `backendType`, `providerId`
- `workflowLabel`
- `skillName`
- `skillLabel`
- `sequenceStepIndex`, `sequenceFinalStepId`
- `taskProjection`, `role`, `projectable`, `localRunId`

Rationale:

- `backendBaseUrl`, `backendType`, and `providerId` are backend registry facts.
- `workflowLabel` is workflow registry display data.
- `skillName` is skill registry display data derived from `skillId`.
- `skillLabel` has no reliable source and is excluded.
- Sequence index/final-step data belongs to `SequenceRunState`.
- `taskProjection`, `role`, `projectable`, and `localRunId` are old projection
  mechanics, not lifecycle facts.

## UI Projection Model

`SkillRunnerRunProjection` is the read model consumed by task list, dashboard,
run workspace, and recovery handoff surfaces.

```ts
type SkillRunnerRunProjection = WorkflowTaskRecord & {
  runKey: string;
  backendType: "skillrunner";
  providerId: "skillrunner";
  backendBaseUrl?: string;
  workflowLabel?: string;
  skillName?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  canReply: boolean;
  canCancelBackendRun: boolean;
};
```

Projection cascade rules:

| Field | Source | Missing Source Behavior |
| --- | --- | --- |
| `backendBaseUrl` | `backendId -> backend registry` | Mark actions unavailable / needs repair; do not use stale snapshots as lifecycle truth. |
| `workflowLabel` | `workflowId -> workflow registry` | Fall back to `workflowId`. |
| `skillName` | `skillId -> skill registry` or prepared `skillDisplayById` | Fall back to `skillId`, then `taskName`. |
| `sequenceStepIndex` | `sequenceRunId + sequenceStepId -> SequenceRunState` | Omit sequence index display. |
| `sequenceFinalStepId` | `sequenceRunId -> SequenceRunState` | Omit final-step affordances. |
| `canReply` | status, submit phase, pending UI state, execution mode | False when no interactive waiting state is projectable. |
| `canCancelBackendRun` | `requestId`, backend config, terminal status | False when backend config is missing or run is terminal. |

`skillLabel` is intentionally absent. Current inputs do not provide a stable
source distinct from `skillName`.

## State Machine SSOT

Submit phase:

```ts
type SkillRunnerSubmitPhase =
  | "pre_request"
  | "creating"
  | "created"
  | "uploading"
  | "request_ready";
```

Lifecycle:

```ts
type SkillRunnerStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "succeeded"
  | "failed"
  | "canceled";
```

State rules:

- Creating a run allocates stable `runKey` immediately and inserts a visible
  `queued/pre_request` projection.
- `creating` means the backend request creation is in progress.
- `created` means a `requestId` has attached to the existing `runKey`.
- `uploading` means required request artifacts are being uploaded for the same
  run.
- `request_ready` means the backend request is recoverable and ready for
  observation or foreground continuation.
- Backend non-terminal observations may update `status` to `running`,
  `waiting_user`, or `waiting_auth`.
- Backend terminal observations may settle `status` to `succeeded`, `failed`,
  or `canceled`.
- Terminal local client errors are allowed only before `requestId` exists or
  when classified as nonrecoverable contract errors.
- Apply policy failures may settle or annotate terminal apply state according to
  declared apply ownership; they must not be confused with observer failures.
- After `requestId` exists, network errors, aborts, shutdown transport errors,
  and poll timeouts are observer failures. They set
  `observerState = "detached"` and keep the run active/recoverable.
- Sequence step failure must not delete or replace the SkillRunner run
  projection through a synthetic job path.

## UI Behavior

- Task row key is always `runKey`.
- `pre_request`, `creating`, `created`, `uploading`, and `request_ready` update
  the same row.
- UI display state, button availability, and display name come from projection.
- UI state does not decide lifecycle transitions.
- Observer detached state keeps the row visible and may show a degraded
  observation state, but it does not mark run, step, or sequence terminal.
- Backend config missing makes backend actions unavailable and marks the row as
  needing configuration repair. The old `backendBaseUrl` snapshot is not used as
  fallback lifecycle truth.

## Recovery Data Flow

1. Recovery reads local `SkillRunnerRunRecord` rows that are not archived and
   not terminal-complete.
2. Each row is projected with current backend, workflow, skill, and sequence
   registries.
3. Rows with `requestId` and `submitPhase = "request_ready"` are eligible for
   foreground continuation or observation handoff.
4. Rows with `observerState = "detached"` remain recoverable if backend config
   resolves at use time.
5. Rows without resolvable backend config remain visible but not actionable.
6. Recovery does not perform backend-wide run-list scans as a lifecycle
   fallback.

## Sequence Workflow Integration

Sequence runtime maintains:

- `sequenceRunId`
- ordered step ids
- active step id
- final step id
- sequence aggregate status
- orchestration decisions

SkillRunner run lifecycle maintains per-step execution:

- run identity
- backend correlation
- submit phase
- backend status
- observer state
- result/apply state
- recovery facts

The sequence runtime starts a step by calling the same SkillRunner run seam used
by single jobs. It passes sequence association fields and waits for the
resulting run lifecycle to converge. It does not construct synthetic step jobs
or delete SkillRunner run projections.

## Code Draft

These signatures are design targets only and are not implemented in this round.

```ts
function createSkillRunnerRun(args: SkillRunnerRunInit): SkillRunnerRunRecord;

function attachSkillRunnerRequestId(args: {
  runKey: string;
  requestId: string;
}): SkillRunnerRunRecord;

function recordSkillRunnerProgress(args: {
  runKey: string;
  event: ProviderProgressEvent;
}): SkillRunnerRunRecord;

function recordSkillRunnerObserverFailure(args: {
  runKey: string;
  error: unknown;
  source: string;
}): SkillRunnerRunRecord;

function settleSkillRunnerRun(args: {
  runKey: string;
  status: "succeeded" | "failed" | "canceled";
  backendStatus?: SkillRunnerStatus;
  result?: SkillRunnerResultState;
  error?: string;
}): SkillRunnerRunRecord;

function projectSkillRunnerRun(args: {
  run: SkillRunnerRunRecord;
  backendRegistry: BackendRegistrySnapshot;
  workflowRegistry: WorkflowRegistrySnapshot;
  skillRegistry: SkillRegistrySnapshot;
  sequenceState?: SequenceRunState;
}): SkillRunnerRunProjection;
```

Future implementation boundaries:

- `runSeam`: single jobs and sequence steps both create a run first, then record
  progress through the same lifecycle functions.
- `sequenceRuntime`: maintains sequence state only and never constructs
  synthetic SkillRunner step jobs.
- `taskRuntime` / `taskDashboardHistory`: consume projections only and never
  reverse-upsert or delete SkillRunner run records.
- `skillRunnerTaskReconciler`: scans the local SkillRunner run store SSOT and
  does not use backend-wide scans as lifecycle fallback.

## YAML Invariants

`doc/components/skillrunner-run-lifecycle-ssot.invariants.yaml` defines the
new invariants for identity, persistence, terminal ownership, projection, and
recovery. The implementation wires those invariants to
`SKILLRUNNER_SSOT_FACTS.runLifecycle` and includes the YAML in
`check:ssot-invariants`.

Invariant anchors:

- `INV-SR-RUNKEY-LOCAL-SSOT`
- `INV-SR-REQUESTID-ATTACH-NO-REKEY`
- `INV-SR-RUN-PERSISTED-MINIMAL`
- `INV-SR-SEQUENCE-STEP-FIRST-CLASS-RUN`
- `INV-SR-OBSERVER-FAILURE-NONTERMINAL`
- `INV-SR-BACKEND-TERMINAL-OWNER`
- `INV-SR-UI-PROJECTION-DERIVED`
- `INV-SR-UI-SKILL-NAME-CASCADED`
- `INV-SR-BACKEND-CONFIG-CASCADE`
- `INV-SR-RECOVERY-RUN-STORE-SSOT`
