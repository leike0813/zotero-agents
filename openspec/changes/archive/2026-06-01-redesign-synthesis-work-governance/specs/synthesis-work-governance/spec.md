## ADDED Requirements

### Requirement: WorkItem is the only durable runtime work truth

Synthesis background work SHALL be represented by repository-backed WorkItems.
Trigger events SHALL be inputs to WorkItem enqueue and SHALL NOT be a separate
durable work state source.

#### Scenario: Work is triggered

- **WHEN** Synthesis receives a trigger for background work
- **THEN** the service SHALL enqueue or coalesce a WorkItem through the Work
  Registry
- **AND** the WorkItem SHALL contain owner, scope, status, progress, retry, and
  diagnostic state.

#### Scenario: Terminal work receives another trigger

- **WHEN** a completed, superseded, skipped, or permanently failed WorkItem
  receives a later trigger
- **THEN** the service SHALL either create a new generation WorkItem or coalesce
  into an active compatible WorkItem
- **AND** it SHALL NOT silently mutate terminal history back to queued.

### Requirement: Work Registry declares ownership

Every Synthesis work type SHALL be declared in a static Work Registry.

#### Scenario: Work type is registered

- **WHEN** the service starts
- **THEN** each registered work type SHALL declare owner worker, allowed scope,
  coalescing key, priority, auto-drain behavior, basis policy, UI label, and
  debug command.

#### Scenario: Work type is unknown

- **WHEN** a producer attempts to enqueue an unknown or invalid work type
- **THEN** the service SHALL reject it or record a bounded governance
  diagnostic
- **AND** no ownerless queued work SHALL remain.

### Requirement: Workers claim only owned WorkItems

Workers SHALL consume work by owner claim.

#### Scenario: Worker runs

- **WHEN** a worker starts a bounded pass
- **THEN** it SHALL claim WorkItems whose `owner_worker` matches the worker
- **AND** it SHALL NOT process WorkItems owned by another worker.

#### Scenario: Work is paused

- **WHEN** the global Synthesis work queue is paused
- **THEN** workers SHALL NOT claim queued WorkItems
- **AND** newly triggered work SHALL remain queued.

### Requirement: WorkRun records execution attempts

Each WorkItem execution attempt SHALL create a WorkRun.

#### Scenario: Work attempt runs

- **WHEN** a worker claims a WorkItem
- **THEN** a WorkRun SHALL be created for that attempt
- **AND** progress updates SHALL update both the current WorkItem projection
  and the WorkRun history.

#### Scenario: Running work becomes stale

- **WHEN** a running WorkItem or WorkRun heartbeat exceeds the stale threshold
- **THEN** cleanup SHALL mark it retryable or superseded before UI/debug
  projection
- **AND** it SHALL NOT remain visible as running indefinitely.

### Requirement: Workbench and debug read the same work projection

Workbench maintenance and Host Bridge debug commands SHALL read WorkItem projection.

#### Scenario: Workbench renders maintenance

- **WHEN** the Workbench snapshot is built
- **THEN** it SHALL expose `maintenance.workQueue` and
  `maintenance.workItems`
- **AND** it SHALL NOT expose or combine separate dirty-event or job-progress
  fallback rows.

#### Scenario: Debug work is listed

- **WHEN** `debug.synthesis.work.list` is called
- **THEN** returned rows SHALL match the Workbench WorkItem projection within
  the same filters and bounds.
