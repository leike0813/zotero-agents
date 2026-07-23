## ADDED Requirements

### Requirement: Queue-only updates SHALL be isolated to task-drawer managed regions

ACP Skills and SkillRunner queue subscription events MUST update only the task
drawer region whose visible queue projection changed. Queue revisions, queue
counts, FIFO positions, or cancellation state MUST NOT enter transcript,
toolbar, banner, plan, hint, reply, context drawer, details drawer, permission
drawer, or whole-runner render signatures.

#### Scenario: Background queued unit is added

- **WHEN** a Host-queued unit is added for a backend represented in the task drawer
- **THEN** the affected drawer section SHALL update
- **AND** existing transcript and non-drawer managed-region DOM identities SHALL remain unchanged

#### Scenario: Queued unit is canceled

- **WHEN** a queued row disappears after cancellation
- **THEN** only the affected queued backend group and necessary parent drawer signatures SHALL change
- **AND** the selected run owner and transcript window SHALL remain unchanged

#### Scenario: Queue changes for an unchanged drawer group

- **WHEN** a queue notification does not alter a rendered drawer group's visible content
- **THEN** that group's signature guard SHALL suppress DOM clear or rebuild

### Requirement: Queued-section collapse state SHALL have a drawer-owned signature

The queued section and its backend groups MUST preserve collapse state through
unrelated transcript, run-status, and queue updates. Their signatures MUST
contain only the user-visible rows and drawer-owned open/collapsed state.

#### Scenario: Transcript streams while queued section is collapsed

- **WHEN** transcript-only updates arrive while the user has collapsed a queued section or backend group
- **THEN** the collapse state and drawer DOM identity SHALL remain stable

#### Scenario: A row is added to an expanded backend group

- **WHEN** a queued row is added to an expanded backend group
- **THEN** the group SHALL remain expanded
- **AND** unrelated backend groups SHALL retain their DOM identity

