# workflow-host-queue-management Specification

## Purpose
Defines the Host-owned admission control, FIFO queue lifecycle, concurrency scoping, cancellation, and observable read-model contracts for workflow execution units that exceed available concurrency slots before backend submission.

## Requirements

### Requirement: The Host SHALL own queued workflow units before backend submission

The plugin Host MUST represent an admitted-but-not-yet-started execution unit as
a Host-owned queued entry. A queued entry MUST NOT be submitted to a provider,
MUST NOT have a backend request or run identity, and MUST NOT be inserted into
backend task stores or completed-task history.

#### Scenario: Concurrency limit leaves units pending

- **WHEN** a supported workflow submission contains more legal execution units than its available concurrency slots
- **THEN** the Host SHALL submit only the units that occupy the available slots
- **AND** it SHALL retain the remaining units as Host-owned queued entries
- **AND** the queued entries SHALL have no backend request or run identity

#### Scenario: A queued unit is admitted

- **WHEN** a slot becomes available and a pending unit is next in the submission's queue
- **THEN** the Host SHALL atomically remove that unit from the queued projection before invoking provider submission
- **AND** the provider-backed task lifecycle SHALL begin only after that admission

### Requirement: Queue concurrency SHALL be fixed and scoped to one submission

Each workflow submission MUST own an independent FIFO admission controller. Its
normalized maximum concurrency MUST be captured when the user confirms the
submission and MUST NOT change if workflow defaults are edited later. A blank
value or `0` MUST mean unlimited concurrency; a positive integer `N` MUST admit
at most `N` execution units from that submission at a time.

#### Scenario: Positive maximum limits one submission

- **WHEN** a submission contains five execution units and captures maximum concurrency `2`
- **THEN** the Host SHALL admit no more than two of those units concurrently
- **AND** the remaining units SHALL stay queued in their original order

#### Scenario: Blank or zero is unlimited

- **WHEN** a submission captures a blank value or `0`
- **THEN** the Host SHALL normalize the value to unlimited concurrency
- **AND** it SHALL admit every legal execution unit from that submission without Host queue throttling

#### Scenario: Concurrent submissions have independent limits

- **WHEN** two submissions of the same workflow are active with different captured limits
- **THEN** each submission SHALL enforce only its own limit and FIFO order
- **AND** neither submission SHALL consume or release slots owned by the other

#### Scenario: Persisted default changes after submit

- **WHEN** a user changes the workflow's persisted maximum-concurrency default after another submission has started
- **THEN** the active submission SHALL retain its captured value
- **AND** only later submissions SHALL use the new default

### Requirement: A concurrency slot SHALL cover the complete workflow execution unit

An admitted execution unit and its submission slot MUST have independent lifecycles. A slot MUST remain occupied while provider work or Host-owned result application is actively proceeding. `waiting_user`, `waiting_auth`, and recoverable failure states MUST yield the slot without settling the unit. Success, terminal failure, confirmed cancellation, and hard timeout MUST release at most one held slot and settle the unit exactly once.

#### Scenario: Successful unit finishes result application

- **WHEN** an admitted unit's provider run succeeds
- **THEN** the Host SHALL reacquire a slot if the unit previously yielded
- **AND** it SHALL keep that slot through terminal result application
- **AND** it SHALL release exactly one held slot after apply settles

#### Scenario: Sequence pauses for user interaction

- **WHEN** an admitted sequence unit enters `waiting_user`, `waiting_auth`, or a recoverable failure
- **THEN** the unit SHALL remain non-terminal
- **AND** it SHALL yield its submission slot exactly once
- **AND** the Host MAY admit the next initial unit from that submission

#### Scenario: Unit reaches a terminal outcome without a held slot

- **WHEN** a yielded unit reaches terminal failure, hard timeout, success, or confirmed cancellation before local resumption
- **THEN** the Host SHALL cancel any unsent resumption callback
- **AND** it SHALL settle the unit without decrementing the held-slot count below zero

### Requirement: One declarative execution unit SHALL remain one queue slot

The preparation seam MUST produce explicit execution-unit plans before Host
admission. Provider preflight expansion, short-circuit results, and multi-step
sequence work derived from one declaratively filtered source unit MUST remain
inside that unit and MUST NOT consume extra Host queue slots.

#### Scenario: Provider preflight expands one source unit

- **WHEN** provider preflight expands one prepared source unit into multiple backend requests
- **THEN** those requests SHALL execute within one admitted unit
- **AND** they SHALL consume one Host concurrency slot in aggregate

#### Scenario: Provider preflight short-circuits one source unit

- **WHEN** provider preflight returns a local terminal result without submitting a backend request
- **THEN** the Host SHALL finalize and apply that unit as required
- **AND** it SHALL release the unit's single slot after Host completion

#### Scenario: Declarative filtering leaves no units

- **WHEN** confirmed execute-mode preparation produces no executable units after its existing filtering and skip semantics
- **THEN** the Host SHALL create no queue controller or queued entries
- **AND** no provider submission SHALL occur
- **AND** final feedback SHALL preserve the skipped-unit count through the existing no-executable-unit semantics

### Requirement: Queued-unit cancellation SHALL be pending-only and race-safe

The Host MUST expose cancellation for a queued unit. Cancellation MUST succeed
only while the unit is still pending, MUST remove it from the queue immediately,
MUST produce no backend call or archived task row, and MUST count the unit as
`skipped` in its submission summary. Admission and cancellation MUST use one
atomic state transition so that exactly one operation wins.

#### Scenario: User cancels a pending unit

- **WHEN** the user cancels a unit that is still Host-queued
- **THEN** the Host SHALL remove the unit from all queue projections
- **AND** it SHALL never submit that unit to a backend
- **AND** the submission summary SHALL count that unit as skipped

#### Scenario: Admission wins a cancellation race

- **WHEN** a unit has already transitioned from pending to admitted before its cancel action is handled
- **THEN** queued-unit cancellation SHALL report that the unit is no longer queued
- **AND** it SHALL NOT redirect the action to backend task cancellation

#### Scenario: Cancellation wins an admission race

- **WHEN** cancellation atomically removes a pending unit before admission
- **THEN** later slot release SHALL skip that unit
- **AND** no provider submission SHALL be attempted for it

### Requirement: Queue state SHALL be in-memory and process-scoped

Host queue state MUST exist only for the current plugin process. Startup MUST
NOT restore queued units, and orderly shutdown MUST stop further admission and
discard pending units without attempting backend submission.

#### Scenario: Plugin restarts with pending units

- **WHEN** the plugin process ends while units remain queued and later starts again
- **THEN** the prior queued units SHALL NOT be restored or submitted
- **AND** no persistent queue recovery record SHALL be required

#### Scenario: Shutdown begins while a slot becomes available

- **WHEN** shutdown has started before a pending unit is admitted
- **THEN** the Host SHALL NOT start a new provider submission for that unit
- **AND** the pending in-memory entry SHALL be discarded during teardown

### Requirement: Native Host queueing SHALL be limited to ACP Skills and SkillRunner

Host admission control and queued projections MUST apply to ACP Skills and
SkillRunner workflow submissions. Generic HTTP and pass-through execution MUST
retain their existing dispatch and local-queue behavior.

#### Scenario: Supported backend receives a positive limit

- **WHEN** an ACP Skills or SkillRunner submission captures a positive maximum concurrency
- **THEN** the Host SHALL apply per-submission admission control

#### Scenario: Unsupported backend receives workflow settings

- **WHEN** a Generic HTTP or pass-through workflow is submitted
- **THEN** this change SHALL NOT introduce Host-owned queued units for that submission
- **AND** its existing dispatch semantics SHALL remain unchanged

### Requirement: Queue read models SHALL be observable without polling

The Host MUST expose immutable queue snapshots and change subscriptions suitable
for task drawers, Dashboard backend tabs, duplicate detection, and summary
aggregation. Queue entries MUST expose stable Host queue identity, submission
identity, workflow identity, backend profile identity, display metadata, source
unit identity, FIFO position, and cancellation capability, but MUST NOT copy
provider credentials or full request payloads.

#### Scenario: Queue membership changes

- **WHEN** a unit is enqueued, canceled, admitted, or discarded
- **THEN** queue subscribers SHALL receive a change notification
- **AND** consumers SHALL be able to obtain a consistent snapshot without polling

#### Scenario: Duplicate guard queries a queued identity

- **WHEN** duplicate detection asks whether a workflow and source-unit identity is queued
- **THEN** the Host SHALL answer from a queue identity index
- **AND** it SHALL NOT require the queued entry to masquerade as a backend task

### Requirement: Host Bridge SHALL use the native prepared-unit submission queue
Every Zotero-managed ACP or SkillRunner workflow submission received through Host Bridge SHALL register its duplicate-approved immutable prepared units with the same `WorkflowSubmissionQueue` used by plugin UI execution.

#### Scenario: Host Bridge submits grouped prepared units
- **WHEN** confirmed Input Planning v2 produces one or more duplicate-approved prepared units
- **THEN** Host Bridge SHALL enqueue those unchanged units as one Host submission
- **AND** it SHALL NOT flatten the units into a provider batch before admission

#### Scenario: Unsupported provider is submitted
- **WHEN** the prepared workflow uses Generic HTTP or pass-through ownership
- **THEN** the existing direct dispatch path SHALL remain unchanged
- **AND** no native Host queue entry SHALL be created

### Requirement: Active submission projection SHALL bridge queue and runtime state
The Host queue SHALL expose a process-local active submission snapshot that retains safe pending and admitted unit projections until task registration or settlement can establish the next runtime owner.

#### Scenario: Unit is admitted before a task exists
- **WHEN** a pending unit leaves the cancelable queue and its provider task has not yet been registered
- **THEN** the active submission snapshot SHALL expose that unit as admitted and non-cancelable
- **AND** it SHALL NOT expose member identities, selection payloads, credentials, or provider requests

#### Scenario: Process restarts
- **WHEN** the plugin process stops or restarts
- **THEN** pending and admitted active-submission projections SHALL be discarded
- **AND** the Host SHALL NOT replay them from persistent state

### Requirement: Submission lineage SHALL remain Host-only
The Host SHALL associate admitted task records with opaque submission and submission-unit handles without adding those handles or input membership to provider payloads.

#### Scenario: Agent discovers admitted work
- **WHEN** an admitted unit creates one or more concrete tasks
- **THEN** task queries by `submissionId` SHALL return those tasks and their existing run handles
- **AND** every expanded task from one prepared unit SHALL share the same opaque submission-unit identity

### Requirement: Resumption admission SHALL precede initial work within one submission

The Host SHALL enqueue a yielded unit's reply, authorization, retry, autonomous local continuation, or apply as a resumption request. Resumptions MUST retain request order and MUST be admitted before not-yet-started units from the same submission. They MUST NOT compete with or consume slots from another submission.

#### Scenario: Waiting unit resumes behind current work

- **GIVEN** a one-slot submission ordered A, B, C
- **AND** A yields so B is admitted
- **WHEN** A requests resumption while B holds the slot
- **THEN** A SHALL remain resumption-pending until B releases the slot
- **AND** A SHALL be admitted before initial unit C

#### Scenario: Two submissions resume independently

- **WHEN** yielded units from two submissions request resumption
- **THEN** each request SHALL be ordered only against work in its own submission
- **AND** neither submission SHALL change the other's held-slot count

### Requirement: Submission display identity SHALL be safe and stable

Each process-local submission SHALL freeze a provider label, model label, and stable symbol when created. The symbol MUST use the ordered non-numeric celestial/natural alphabet `🌙`, `☀️`, `⭐`, `☄️`, `🪐`, `🌍`, `🌊`, `🔥`, extending with ordered multi-symbol codes after eight submissions. Display identity MUST NOT contain credentials or full provider options and MUST NOT be reused while the process is running.

#### Scenario: More than eight submissions coexist

- **WHEN** the ninth and later submissions are created
- **THEN** each SHALL receive a unique stable multi-symbol code
- **AND** no code SHALL contain a digit or numeric emoji

#### Scenario: Model configuration is absent

- **WHEN** provider or model display input is blank
- **THEN** the frozen display identity SHALL expose an explicit localized default fallback
- **AND** it SHALL not copy arbitrary provider options
