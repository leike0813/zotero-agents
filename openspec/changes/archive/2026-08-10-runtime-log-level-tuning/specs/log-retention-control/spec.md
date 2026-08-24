## MODIFIED Requirements

### Requirement: Runtime Logs SHALL Enforce a Maximum Retained Entry Count of 2000

The retention system SHALL apply a mode-aware budget to bound stored diagnostics.
The total entry budget covers both the info/debug queue and the
warn/error queue, while the warn/error queue is additionally bounded by a
dedicated important quota so that traffic in the info queue cannot evict
diagnosis-critical entries.

#### Scenario: Normal mode retention

- **WHEN** diagnostic mode is disabled
- **THEN** retention SHALL follow normal-mode total entry budget (2000)
  AND the warn/error queue SHALL be capped at 500 entries.

#### Scenario: Diagnostic mode retention

- **WHEN** diagnostic mode is enabled
- **THEN** retention SHALL enforce dual thresholds (`3000 entries` total and
  `20MB` serialized estimate)
- **AND** the warn/error queue SHALL be capped at 1000 entries
- **AND** eviction SHALL remove oldest entries first, evicting from the
  info/debug queue before any warn/error entry.

## ADDED Requirements

### Requirement: Important-Level Entries SHALL Have a Dedicated Retention Budget

The runtime log manager SHALL maintain two in-memory queues. Entries with
level `warn` or `error` SHALL be stored in the important queue. Entries with
level `debug` or `info` SHALL be stored in the info queue. The important queue
SHALL have its own maximum entry budget that is independent of the total entry
budget, so that a flood of info-level events cannot evict warn/error entries
before those entries expire.

#### Scenario: Important queue has its own cap

- **WHEN** the info queue is empty and only warn/error entries remain
- **THEN** the manager SHALL still enforce the important-queue cap
  (`500` in normal mode, `1000` in diagnostic mode)
- **AND** it SHALL evict the oldest warn/error entry when the cap is
  exceeded.

#### Scenario: Info flood does not evict warn/error

- **GIVEN** 200 warn entries are retained
- **WHEN** 2000 info entries are appended afterwards
- **THEN** all 200 warn entries SHALL remain in the important queue
- **AND** the info queue SHALL continue to evict its own oldest entries
  before the important queue is touched.

#### Scenario: Byte budget prefers info queue

- **WHEN** the serialized byte budget is exceeded
- **THEN** the manager SHALL evict entries from the info queue first
- **AND** the manager SHALL only start evicting from the important queue
  after the info queue is empty.

#### Scenario: Persisted file remains backward compatible

- **WHEN** the manager writes the persisted runtime log payload
- **THEN** the payload SHALL contain a single `entries` array
- **AND** that array SHALL preserve the retained entries' global append order
- **AND** hydration SHALL route entries by level into the two in-memory
  queues without changing the global order exposed by read APIs.

### Requirement: High-Frequency Control-Plane Actions SHALL Emit at Debug Level

The Assistant Workspace host audit trail SHALL emit shell/child control-plane
actions at level `debug` instead of `info`. The set of downgraded actions is
explicit and limited to high-frequency control-plane traffic. Lifecycle and
user-initiated input actions SHALL remain at `info` (or `warn` on error).

#### Scenario: Child control-plane actions are downgraded

- **WHEN** the host records a child-action for `publication-ack`,
  `publication-render-observation`, `load-transcript-page`, or
  `request-owner-details`
- **THEN** the runtime log entry SHALL have level `debug`
- **AND** the entry SHALL NOT appear in normal-mode default filtering.

#### Scenario: Shell user actions are downgraded

- **WHEN** the host records a shell-action for `set-tab` or `close-sidebar`
- **THEN** the runtime log entry SHALL have level `debug`
- **AND** the entry SHALL NOT appear in normal-mode default filtering.

#### Scenario: Lifecycle events remain at info

- **WHEN** the host records a `ready` shell-action or a `ready` child-action
- **THEN** the runtime log entry SHALL have level `info`
- **AND** the entry SHALL appear in normal-mode default filtering.

#### Scenario: Audit trail remains complete in diagnostic mode

- **GIVEN** diagnostic mode is enabled
- **WHEN** any of the downgraded control-plane actions is recorded
- **THEN** the entry SHALL be retained and SHALL appear under the Debug
  filter.
