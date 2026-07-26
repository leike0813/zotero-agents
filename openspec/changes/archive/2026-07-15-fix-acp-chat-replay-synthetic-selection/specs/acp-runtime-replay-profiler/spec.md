## ADDED Requirements

### Requirement: Replay target activation is lifecycle-owned

Every Replay target SHALL expose an idempotent activation operation. For each matrix record the runner SHALL create the target, activate it only for `target-active`, prepare the Workspace surface, start profiling, replay trace and R2 work, drain publication, finish profiling, and clean up in that order. `closed` and `open-inactive` SHALL NOT activate the synthetic target.

#### Scenario: Chat target-active runs without a registered backend
- **WHEN** Replay prepares an already-created synthetic Chat owner while the real backend registry contains no matching backend
- **THEN** target activation SHALL succeed without backend lookup, adapter creation, transport creation, or default-backend persistence
- **AND** the ordinary ACP Chat backend and conversation selectors SHALL continue rejecting the missing backend even when it equals the lease-owned effective owner.

#### Scenario: Inactive surfaces run
- **WHEN** Replay profiles `closed` or `open-inactive`
- **THEN** target activation SHALL NOT run
- **AND** Workspace shell, tab, and readiness preparation SHALL remain independent from synthetic selection.

### Requirement: Synthetic Chat selection is restored safely

Chat Replay activation SHALL return an owner/token-scoped lease that snapshots the foreground selection. Cleanup SHALL restore that snapshot before deleting synthetic runtime, conversation, transcript, and index state, and SHALL be idempotent across completion, failure, cancellation, and repeated cleanup. A stale lease SHALL NOT overwrite a selection made after activation.

#### Scenario: Prior selection is restored
- **WHEN** the prior foreground selection is a real Chat owner, an empty owner, a closed Workspace state, or a Skills tab
- **THEN** Replay cleanup SHALL restore Chat selection and Workspace presentation state independently to their prior values.

#### Scenario: Cleanup lease is stale
- **WHEN** another owner supersedes the synthetic owner or a newer activation token exists before cleanup
- **THEN** the stale lease SHALL NOT replace the newer foreground selection.

#### Scenario: Workspace refreshes the real backend registry
- **WHEN** Workspace initialization refreshes or backend settings prune an empty or non-empty real backend registry while the synthetic lease still owns the exact foreground owner
- **THEN** registry maintenance SHALL update real backend data without deleting the synthetic runtime or clearing, switching, or persisting over the synthetic foreground
- **AND** owner readiness and Chat panel availability SHALL continue to project the lease-owned backend and conversation from in-memory runtime state without a registry entry.

#### Scenario: Activation or cleanup fails
- **WHEN** activation partially fails, Replay is canceled, or one cleanup operation throws
- **THEN** Replay SHALL attempt all remaining owned cleanup and restoration steps
- **AND** repeated cleanup SHALL NOT apply restoration twice.

### Requirement: Replay setup failure evidence is stage-accurate

Matrix v2 records SHALL optionally expose a structured primary `failure` containing `phase` and `detail`, where phase distinguishes target activation, Workspace preparation, profiling, replay, drain, and cleanup. The first error SHALL remain primary and later cleanup errors SHALL be retained as warnings. A stage not reached SHALL be reported as `not-run` rather than as a failure of that stage.

#### Scenario: Target activation fails
- **WHEN** target activation fails before Workspace preparation and profiling
- **THEN** the record failure phase SHALL identify target activation
- **AND** profiler, trace replay, R2, and drain SHALL remain not-run with no measurement family reported captured.

#### Scenario: Cleanup also fails
- **WHEN** a primary lifecycle failure is followed by cleanup failure
- **THEN** the primary failure SHALL remain unchanged
- **AND** cleanup failure detail SHALL appear in warnings.

### Requirement: R1 capture requires completed positive replay

R1 SHALL be captured only when semantic replay completes, the applied event count is greater than zero, and the observed semantic counter exactly matches that applied count. Equality between zero-valued defaults SHALL NOT produce captured evidence. R2 and R3 SHALL likewise remain missing or not-run when their producing stages do not execute, while backend-free transport metrics SHALL remain `not-applicable`.

#### Scenario: Setup fails before replay
- **WHEN** Replay setup fails while applied and semantic counters both remain zero
- **THEN** R1 SHALL NOT be captured
- **AND** R2 and R3 SHALL NOT be captured.

#### Scenario: Replay completes with semantic events
- **WHEN** replay completes with one or more applied events and the semantic counter matches exactly
- **THEN** R1 SHALL be captured.

### Requirement: Cold Workspace publication acknowledgement is retryable

After Workspace child and owner readiness, Replay diagnostics SHALL observe a post-baseline child snapshot revision and its render acknowledgement. If a forced asynchronous snapshot build completes without publishing because a concurrent cold-init build superseded it, diagnostics SHALL retry the same idempotent forced publication serially at a bounded interval. Retry SHALL stop after acknowledgement, cancellation, frame replacement, unload, publication error, or timeout, and SHALL NOT overlap forced builds.

#### Scenario: Cold first publication is superseded
- **WHEN** the first forced publication returns without a post-baseline revision because a newer child init build superseded it
- **THEN** diagnostics SHALL issue another forced publication without waiting for the overall timeout
- **AND** a later post-baseline revision rendered by the child SHALL complete Workspace preparation successfully.

### Requirement: Synthetic activation is release-elidable

The synthetic Chat activation/restore seam SHALL exist only when Debug and Replay Profiler source are enabled. Production plugin output and Replay-disabled diagnostic output SHALL contain zero bytes attributable to synthetic activation, lease state, or activation markers, and ordinary Chat hot paths SHALL perform no Replay-specific lookup or branch.

#### Scenario: Replay source is disabled
- **WHEN** runtime diagnostics build Replay Profiler as disabled or builds the production plugin entry
- **THEN** activation and lease markers SHALL be absent from executable output
- **AND** the production ACP Chat selector behavior SHALL remain unchanged.
