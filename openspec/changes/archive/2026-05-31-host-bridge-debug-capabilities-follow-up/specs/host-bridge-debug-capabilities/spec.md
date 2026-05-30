## ADDED Requirements

### Requirement: Debug capabilities are hard-gated by debug mode

The Host Bridge SHALL expose `debug.*` capabilities only when the hard-coded
debug mode gate is enabled.

#### Scenario: Manifest is requested with debug mode disabled

- **WHEN** an authenticated client requests the Host Bridge manifest
- **AND** `isDebugModeEnabled()` is false
- **THEN** the manifest SHALL NOT contain any capability whose name starts with
  `debug.`
- **AND** debug-only capability metadata SHALL NOT be exposed.

#### Scenario: Debug capability is called with debug mode disabled

- **WHEN** an authenticated client directly calls a `debug.*` capability
- **AND** `isDebugModeEnabled()` is false
- **THEN** the Host Bridge SHALL return `capability_not_found`
- **AND** the debug handler SHALL NOT execute.

#### Scenario: Debug capability is called with debug mode enabled

- **WHEN** an authenticated client calls a registered `debug.*` capability
- **AND** `isDebugModeEnabled()` is true
- **THEN** the Host Bridge SHALL route the call through the registered debug
  capability handler
- **AND** the handler SHALL perform its own debug-mode check before returning
  data or changing state.

### Requirement: Debug output is bounded and redacted

Every debug capability SHALL return a JSON-safe envelope with stable common
diagnostic fields and bounded payloads.

#### Scenario: Debug snapshot succeeds

- **WHEN** a debug capability returns successfully
- **THEN** the payload SHALL include `schema`, `debugMode: true`,
  `generatedAt`, `truncated`, `limits`, and `diagnostics`
- **AND** domain-specific payload fields MAY include bounded objects such as
  `queue`, `jobs`, `tableCounts`, `tasks`, or `persistence`.

#### Scenario: Caller omits debug limits

- **WHEN** a debug capability accepts a list limit
- **AND** the caller does not provide `limit`
- **THEN** the capability SHALL use a default limit of 100
- **AND** it SHALL cap the effective limit at 1000.

#### Scenario: Caller does not opt into local paths or raw rows

- **WHEN** a debug capability may expose local filesystem paths or low-level raw
  rows
- **AND** the input does not explicitly set `includeLocalPaths: true` or
  `includeRawRows: true`
- **THEN** the capability SHALL omit or redact those fields.

#### Scenario: Debug output is generated

- **WHEN** any debug capability returns success or failure data
- **THEN** the output MUST NOT include Host Bridge bearer tokens, ACP backend
  tokens, or hidden credential material.

### Requirement: Global debug diagnostics cover Host Bridge and runtime state

The Host Bridge SHALL provide debug-only global diagnostics for service status,
runtime persistence, and active task state.

#### Scenario: Debug status is requested

- **WHEN** `debug.status` is called in debug mode
- **THEN** the result SHALL include debug mode state, Host Bridge service
  status, capability counts, runtime persistence overview, and active
  task/workflow overview.

#### Scenario: Runtime persistence snapshot is requested

- **WHEN** `debug.persistence.snapshot` is called in debug mode
- **THEN** the result SHALL include persistence usage, integrity summary, and
  bounded table-count diagnostics
- **AND** absolute local paths SHALL be omitted unless
  `includeLocalPaths: true` is set.

#### Scenario: Task snapshot is requested

- **WHEN** `debug.tasks.snapshot` is called in debug mode
- **THEN** the result SHALL include bounded active and recent workflow task, ACP
  run, and backend runtime diagnostics.

### Requirement: Synthesis debug diagnostics inspect queue, jobs, papers, topics, and DB/cache drift

The Host Bridge SHALL provide debug-only Synthesis diagnostics that read the
Synthesis service/repository APIs rather than directly stitching SQL in Host
Bridge handlers.

#### Scenario: Synthesis snapshot is requested

- **WHEN** `debug.synthesis.snapshot` is called in debug mode
- **THEN** the result SHALL include bounded UI snapshot diagnostics, update
  queue state, dirty events, job progress, repository table counts,
  maintenance summary, and startup reconcile state.

#### Scenario: Synthesis dirty events are listed

- **WHEN** `debug.synthesis.queue.list` is called with optional status,
  event-type, scope, or limit filters
- **THEN** the result SHALL return matching `synt_dirty_event`-derived rows
  bounded by the effective limit.

#### Scenario: Synthesis jobs are listed

- **WHEN** `debug.synthesis.jobs.list` is called with optional status, source,
  include-completed, or limit filters
- **THEN** the result SHALL return matching `synt_job_state` rows bounded by the
  effective limit.

#### Scenario: Paper inspect is requested

- **WHEN** `debug.synthesis.paper.inspect` is called with `paperRef` or
  `{ libraryId, itemKey }`
- **THEN** the result SHALL compare the Zotero item and note payload with the
  Synthesis paper registry row, matching metadata cache, citation graph state,
  and topic usage.

#### Scenario: Topic inspect is requested

- **WHEN** `debug.synthesis.topic.inspect` is called with `topicId`
- **THEN** the result SHALL include topic artifact state, topic graph rows,
  review rows, freshness state, and related papers.

#### Scenario: Synthesis diff is requested

- **WHEN** `debug.synthesis.diff` is called
- **THEN** the result SHALL compare current Zotero payload state with Synthesis
  DB/cache state
- **AND** it SHALL report missing, stale, orphan, and queued diagnostics within
  the effective bounds.

### Requirement: Synthesis debug worker commands can advance background state

Debug worker capabilities SHALL run existing Synthesis service worker paths and
return before/after diagnostics.

#### Scenario: Worker run is requested

- **WHEN** `debug.synthesis.worker.run` is called with a supported worker name
- **THEN** the service SHALL run the requested worker through the existing
  Synthesis worker/service boundary
- **AND** the output SHALL include `before`, `result`, `after`, and
  `jobProgress`.

#### Scenario: Worker run input omits bounds

- **WHEN** `debug.synthesis.worker.run` omits `batchLimit` or `timeBudgetMs`
- **THEN** the service SHALL use defaults of `batchLimit: 10` and
  `timeBudgetMs: 2000`.

#### Scenario: Maintenance run is requested

- **WHEN** `debug.synthesis.maintenance.run` is called
- **THEN** the service SHALL run one bounded maintenance pass in the order
  paper registry, citation graph structure, complex metrics, and topic
  freshness
- **AND** the result SHALL include each step's before/after state.

### Requirement: Synthesis debug queue and job controls are bounded

Debug control capabilities SHALL allow developers to enqueue, retry, pause,
resume, and clear queue/job state without exposing arbitrary SQL.

#### Scenario: Queue control is requested

- **WHEN** `debug.synthesis.queue.enqueue`, `debug.synthesis.queue.retry`,
  `debug.synthesis.queue.pause`, or `debug.synthesis.queue.resume` is called
- **THEN** the service SHALL apply the requested operation through the existing
  Synthesis queue service/repository API
- **AND** the result SHALL include the queue state after the operation.

#### Scenario: Stale jobs are cleared

- **WHEN** `debug.synthesis.jobs.clearStale` is called with `staleBefore` or
  `olderThanMs`
- **THEN** stale running jobs SHALL be downgraded to retryable failed state
  through the Synthesis repository API
- **AND** the result SHALL include affected job counts.

#### Scenario: Queue clear is requested as dry-run

- **WHEN** `debug.synthesis.queue.clear` is called without `dryRun: false`
- **THEN** the capability SHALL report the rows that would be cleared
- **AND** it SHALL NOT delete queue rows.

#### Scenario: Queue clear is requested for execution

- **WHEN** `debug.synthesis.queue.clear` is called with `dryRun: false`
- **THEN** Zotero UI approval SHALL be required
- **AND** the input SHALL include the exact confirmation phrase
  `CLEAR SYNTHESIS DEBUG QUEUE`
- **AND** rows SHALL be cleared only after approval and phrase validation pass.

### Requirement: Dangerous debug operations require Zotero approval and confirmation

Debug operations that clear, delete, reset, or otherwise discard state SHALL be
dangerous operations.

#### Scenario: Dangerous debug operation is requested

- **WHEN** a dangerous `debug.*` capability is called
- **THEN** the Host Bridge approval policy SHALL be `zotero-ui-required`
- **AND** the handler SHALL validate its fixed confirmation phrase when
  executing the operation.

#### Scenario: Confirmation phrase is missing or wrong

- **WHEN** a dangerous debug capability is called for execution
- **AND** the confirmation phrase is missing or does not match exactly
- **THEN** the capability SHALL reject the operation
- **AND** no state SHALL be deleted or reset.

#### Scenario: Arbitrary data access is requested

- **WHEN** a debug capability input attempts to request arbitrary SQL execution
  or arbitrary filesystem reads/writes
- **THEN** the capability SHALL reject or ignore that request
- **AND** no direct SQL shell or arbitrary path operation SHALL be exposed.
