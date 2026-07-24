## ADDED Requirements

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
