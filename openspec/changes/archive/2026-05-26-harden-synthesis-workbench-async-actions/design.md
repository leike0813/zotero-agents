## Design

### Action Lifecycle

Each Workbench host command receives an operation key derived from the command
name and the resource scoped arguments that make duplicate execution unsafe.

Examples:

- `manualRecomputeLayout:<preset>`
- `applyConceptReviewAction:<reviewId>:<action>:<targetConceptId>`
- `acceptTopicGraphRelation:<edgeId>`
- `runLiteratureRegistryJobNow`
- `syncNow`

The operation key is process-local and is not persisted.

### Snapshot Action State

Snapshots expose an `actions` object containing:

- `inFlight`: currently executing operation summaries.
- `lastCompleted`: the last completed operation summary.
- `lastFailed`: the last failed operation summary.
- `warnings`: duplicate or invalid action warnings.

The UI combines server-side `actions.inFlight` with local optimistic pending
state so the first click disables immediately, even before the next snapshot
arrives.

### Host Single-Flight

The Workbench tab runtime owns an `inFlightCommands` map. When a host command is
received:

- If the operation key is already in flight, the service is not called again.
- The host records a warning and posts a snapshot containing the current action
  state.
- Otherwise the command runs through a shared wrapper that records start,
  success/failure, refreshes the snapshot, and clears the in-flight key.

Commands for different resource keys can run concurrently.

### UI Behavior

Buttons keep their existing labels. Pending state is shown through disabled
state, a compact spinner, `aria-busy`, and a title/status message. Page-level
status remains lightweight and non-blocking.

Job-aware disabled rules combine:

- local/server action pending state,
- current snapshot item status,
- service job queue state,
- allowed actions for Git Sync and literature jobs.

### Failure Handling

Existing error reporting remains in place. A failed operation clears the pending
state and updates `actions.lastFailed` so the UI can show a non-blocking failure
notice while preserving the existing alert behavior.
