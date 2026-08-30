## MODIFIED Requirements

### Requirement: Workflow Editor Host SHALL Manage Dialog Lifecycle Uniformly
The system SHALL provide a generic workflow editor host that owns dialog open/close, action resolution, timer cleanup, caller-scoped concurrency, state bounds, and cleanup for local workflow editors. Renderer, actions, DOM root, callbacks, and mutable state helpers SHALL remain in-process session values and MUST NOT enter Broker, Host Bridge/MCP, durable state, or serialized results.

#### Scenario: Custom action buttons return action id
- **WHEN** a caller opens an editor with bounded inline actions
- **THEN** the host renders those actions as dialog buttons
- **AND** a closing action resolves with explicit `actionId` and bounded serialized value

#### Scenario: Close default action is configurable
- **WHEN** a caller sets `closeActionId` and the dialog closes without an explicit action
- **THEN** the host resolves the configured close policy deterministically
- **AND** it releases timers, DOM references, and the caller's active-session slot

#### Scenario: Session values are not portable
- **WHEN** initial state, context, or serialized output is not bounded strict JSON
- **THEN** the session fails before opening a dialog
- **AND** no callback or DOM value enters the public result

#### Scenario: Save/cancel compatibility remains unchanged
- **WHEN** a staged v11 caller does not provide custom actions
- **THEN** the host preserves the default Save/Cancel flow and dirty-close prompt semantics
- **AND** the inline session owner remains the only new v12 contract

## REMOVED Requirements

### Requirement: Workflow Editor Host SHALL Dispatch Renderers by Renderer ID
**Reason**: V12 makes the inline renderer session-owned; a public renderer-id registry creates a second lifecycle and an unbounded capability lookup.

**Migration**: Active workflow callers pass their renderer and actions directly in the editor session request. Internal registration helpers may remain only until those callers migrate in the activation change.

## ADDED Requirements

### Requirement: Workflow Editor Host SHALL own one active session per caller
Each caller scope SHALL have at most one active editor session. Additional sessions MUST wait in deterministic order or fail with stable `conflict` evidence, and non-interactive projection MUST retain the member while returning `interaction_required`.

#### Scenario: Caller opens concurrent sessions
- **WHEN** the same caller scope requests another session while one is active
- **THEN** the host queues it deterministically or returns the declared operation-in-progress conflict
- **AND** it does not create a hidden parallel dialog

#### Scenario: Non-interactive caller opens an editor
- **WHEN** an editor session is requested through a non-interactive adapter
- **THEN** it fails with stable `interaction_required` data
- **AND** no dialog or session timer is created
