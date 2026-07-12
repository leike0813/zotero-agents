# acp-engine-session-workspace-governance Specification

## Purpose
TBD - created by archiving change define-acp-engine-session-workspace-governance. Update Purpose after archive.
## Requirements
### Requirement: ACP backend and engine concepts are distinct

The system SHALL treat an ACP backend as persisted user configuration and an ACP engine as a live runtime process/connection derived from that backend.

#### Scenario: Runtime starts from backend configuration

- **WHEN** an ACP backend is connected
- **THEN** the runtime engine MUST be derived from that backend configuration
- **AND** engine lifecycle state MUST NOT be treated as part of the backend configuration itself.

### Requirement: Chat and task engines are isolated

The system SHALL keep global chat engines and workflow task engines separate for the same ACP backend.

#### Scenario: Same backend is used for chat and task execution

- **WHEN** a backend is used for global chat and ACP task execution
- **THEN** the chat runtime MUST use a `ChatEngineRuntime`
- **AND** the task runtime MUST use a separate `TaskEnginePool`
- **AND** chat session state MUST NOT be shared with task session state.

### Requirement: ACP chat supports multiple local sessions per backend

The system SHALL allow each ACP backend to own multiple local chat sessions with one active chat session at a time.

#### Scenario: User switches chat sessions

- **WHEN** the user selects a different chat session for a backend
- **THEN** the visible transcript, diagnostics, mode/model state, and send target MUST switch to that session
- **AND** other chat sessions for the backend MUST remain locally available.

### Requirement: Chat actions target the active chat session

The system SHALL route chat actions to the active chat session for the active backend.

#### Scenario: User sends a prompt or changes mode/model

- **WHEN** the user sends a prompt, cancels a prompt, resolves permission, changes mode, or changes model
- **THEN** the action MUST apply only to the active chat session
- **AND** changing mode or model MUST NOT require rebuilding the chat engine.

### Requirement: Chat restart recovery is local-first

The system SHALL restore chat transcript and UI state locally after plugin restart, but SHALL NOT treat remote ACP `sessionId` as durable SSOT.

#### Scenario: Plugin restarts with stored chat sessions

- **WHEN** the plugin starts after a previous ACP chat session
- **THEN** local chat transcript and UI state MAY be restored
- **AND** the old remote ACP `sessionId` MUST NOT be assumed already attached
- **AND** reconnecting or sending a prompt MAY attempt remote restore only when the backend declares `session/resume` or `session/load`
- **AND** unsupported or failed restore MUST create a new remote ACP session.

### Requirement: ACP task execution uses a serial per-backend task pool

The system SHALL use one serial ACP task engine pool per backend for workflow/skill execution.

#### Scenario: Multiple ACP workflow jobs target one backend

- **WHEN** multiple ACP task jobs target the same backend
- **THEN** the jobs MUST execute through that backend's task pool
- **AND** v1 task execution MUST run at most one task session per backend at a time
- **AND** additional task sessions MUST wait rather than run concurrently.

### Requirement: Task sessions are archived outside free-form chat

The system SHALL keep ACP task sessions out of the free-form chat session list while preserving read-only auditability.

#### Scenario: ACP task session completes

- **WHEN** an ACP task session reaches terminal state
- **THEN** its transcript, result metadata, diagnostics, and identifiers SHOULD be archived with task history
- **AND** it SHOULD be openable as a read-only task transcript or diagnostic view
- **AND** it MUST NOT appear as a normal free-form chat session.

### Requirement: ACP path roles are explicit

The system SHALL distinguish `engineCwd`, `sessionWorkspace`, and `runtimeDir`.

#### Scenario: Runtime paths are resolved

- **WHEN** an ACP engine or session is prepared
- **THEN** `engineCwd` MUST represent the process launch cwd and default `session/new cwd`
- **AND** `sessionWorkspace` MUST represent a plugin-managed workspace owned by one chat or task session
- **AND** `runtimeDir` MUST represent engine-level diagnostics, stderr, temporary state, and connection metadata.

### Requirement: Chat and task workspaces use separate ownership keys

The system SHALL assign workspace ownership based on session type.

#### Scenario: Chat workspace is created

- **WHEN** a chat session needs a workspace
- **THEN** the workspace MUST be keyed by `backendId + conversationId`
- **AND** it SHOULD be retained with the local chat session.

#### Scenario: Task workspace is created

- **WHEN** an ACP task session needs a workspace
- **THEN** the workspace MUST be keyed by `backendId + runId + jobId`
- **AND** it SHOULD follow task history retention.

### Requirement: Task workspace retention follows task history retention

The system SHALL align task workspace cleanup with task history cleanup. ACP
Skill runtime files, including transcript JSONL, output revisions, continuation
context, and result artifacts, SHALL be stored under the run workspace/runtime
directory so they are governed by the same retention lifecycle.

#### Scenario: Task history retention expires

- **WHEN** an ACP task history record becomes eligible for cleanup
- **THEN** its task workspace SHOULD also become eligible for cleanup
- **AND** the default retention policy SHOULD follow the existing 30-day task
  history retention.

#### Scenario: Terminal ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is terminal, removed or archived, and older than the
  task history retention threshold
- **THEN** retention cleanup MUST delete its persisted ACP skill run row
- **AND** retention cleanup MUST delete its workspace under
  `runtime/acp/skill-runs`
- **AND** retention cleanup MUST delete the run's file-backed transcript,
  output revision, and continuation context files because they live under that
  workspace.

#### Scenario: Terminal ACP Skills run has a separate runtime directory

- **WHEN** an expired terminal ACP Skills run has `runtimeDir` under
  `runtime/acp/skill-runs` but no deletable `workspaceDir`
- **THEN** retention cleanup MUST delete the persisted ACP skill run row
- **AND** retention cleanup MUST delete that `runtimeDir` after validating it is
  inside `runtime/acp/skill-runs`.

#### Scenario: Active ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is non-terminal or still recoverable
- **THEN** retention cleanup MUST NOT delete its persisted run row
- **AND** retention cleanup MUST NOT delete its workspace solely because its
  timestamp is older than the retention threshold.

#### Scenario: Fresh terminal ACP Skills run

- **WHEN** an ACP Skills run is terminal but still within task history retention
- **THEN** retention cleanup MUST preserve its persisted run row
- **AND** retention cleanup MUST preserve its workspace.

### Requirement: Local ACP engines and sessions SHALL use the shared transport controller

Every local ACP engine or session launch SHALL be created and closed through the shared ACP transport controller, including adapter and direct diagnostic launches.

#### Scenario: Adapter launch is controlled

- **WHEN** a local ACP adapter initializes an engine or session
- **THEN** its transport SHALL be owned by the shared controller
- **AND** adapter close SHALL delegate teardown to that controller.

#### Scenario: Raw diagnostic launch is controlled

- **WHEN** a diagnostic launches an ACP transport without an adapter
- **THEN** it SHALL receive the same controlled transport boundary
- **AND** it SHALL NOT access an unverified process-group termination primitive.

#### Scenario: Close is idempotent

- **WHEN** two callers close the same controller concurrently or repeatedly
- **THEN** they SHALL reuse one teardown operation
- **AND** stdin EOF and process termination SHALL execute at most once.

### Requirement: Shared ACP controller close SHALL be bounded and EOF-first

The shared controller SHALL stop new writes, settle queued writes, request bounded stdin EOF, and allow bounded graceful exit before attempting process termination.

#### Scenario: Backend exits after EOF

- **WHEN** the backend exits within the grace period after stdin EOF
- **THEN** the controller SHALL finish close without group or direct kill.

#### Scenario: EOF or write drain stalls

- **WHEN** queued writes or stdin close exceed their deadline
- **THEN** controller close SHALL continue to the same fail-closed cleanup decision
- **AND** close SHALL NOT remain pending indefinitely.

### Requirement: Shared ACP controller SHALL own signal authorization and actuation
Every plugin-owned ACP process launch and close path SHALL use the shared transport controller, and business consumers MUST NOT construct process-group signal targets or external signal commands.

#### Scenario: ACP consumer closes a local controller
- **WHEN** Backend Manager probing, ACP Chat, ACP Skills, a sequence stage, recovery, or a diagnostic closes a local ACP process
- **THEN** cleanup SHALL pass through the shared controller's validated signal boundary
- **AND** no consumer-specific process-group termination logic SHALL run

#### Scenario: Controller cannot prove safe group actuation
- **WHEN** ownership authorization or target-preserving actuation fails
- **THEN** the shared controller SHALL use only its directly held child handle
- **AND** the consumer SHALL receive bounded cleanup diagnostics without widening the signal target

