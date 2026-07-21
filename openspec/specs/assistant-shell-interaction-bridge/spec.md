# assistant-shell-interaction-bridge Specification

## Purpose
TBD - created by archiving change harden-assistant-shell-interaction-bridge. Update Purpose after archive.
## Requirements
### Requirement: Reliable shell-to-host action bridge

The Assistant shell SHALL use a host-injected bridge as the primary path for child tab actions. Managed panel renderer actions SHALL be mapped by the child page adapter into existing host bridge actions.

#### Scenario: Managed ACP Chat action reaches host

- **Given** ACP Chat is hosted inside the Assistant shell
- **When** the managed panel renderer emits a context action such as `new-conversation`, `connect`, `disconnect`, or `set-active-conversation`
- **Then** ACP Chat maps the action to its existing ACP sidebar action envelope
- **And** sends it through the shell host bridge.

#### Scenario: Managed ACP Skills action reaches host

- **Given** ACP Skills is hosted inside the Assistant shell
- **When** the managed panel renderer emits `reply-run`, `connect-run`, `disconnect-run`, `end-session`, `cancel-run`, or `resolve-permission`
- **Then** ACP Skills maps the action to the existing ACP Skills sidebar action envelope
- **And** sends it through the shell host bridge.

#### Scenario: Managed SkillRunner action reaches host

- **Given** SkillRunner is hosted inside the Assistant shell
- **When** the managed panel renderer emits `reply-run`, `auth-import-run`, `cancel-run`, `select-task`, `open-context-drawer`, or `close-context-drawer`
- **Then** SkillRunner maps the action to the existing SkillRunner sidebar action envelope
- **And** sends it through the shell host bridge.

### Requirement: Child tab bridge reinstallation

The Assistant shell SHALL install the correct child bridge after iframe load, tab activation, and snapshot replay.

#### Scenario: Late iframe load

- **Given** a child snapshot arrives before the iframe is ready
- **When** the iframe later loads
- **Then** the cached snapshot is replayed
- **And** the child bridge is installed before user actions are handled

### Requirement: Action diagnostics

The Assistant shell SHALL keep a recent trace of action routing and host results.

#### Scenario: Host action fails

- **Given** the host handler rejects an action
- **When** the shell receives the failure result
- **Then** the trace records the failed action id, tab, action, and safe error message

### Requirement: Page boundary preservation

The Assistant shell and managed panel runtime SHALL NOT change child page backend protocols or session behavior as part of shared action routing.

#### Scenario: SkillRunner preserves business semantics

- **Given** SkillRunner is hosted inside the Assistant shell
- **When** shared managed UI controls emit actions
- **Then** waiting_user reply, waiting_auth reply, auth import, cancel, drawer, and task-selection actions route to the original SkillRunner host dispatch path
- **And** SkillRunner backend protocol and assistant revision/replacement semantics remain unchanged.

### Requirement: Waiting-user interactions use one bounded Assistant contract

The Assistant shell SHALL represent open text, single choice, confirmation, and file upload requests with one exact-key validated pending-interaction DTO. The DTO SHALL preserve JSON option values, expose a stable interaction token, limit options to 16 and file slots to 8, and reject oversized or malformed nested wire data.

#### Scenario: Structured choice remains typed

- **WHEN** a waiting-user hint declares an option whose label differs from a boolean or object value
- **THEN** the child model SHALL retain the original JSON value as `responseValue`
- **AND** use the label only for visible display and transcript text

#### Scenario: Stale interaction action arrives

- **WHEN** an action's owner, waiting state, or interaction token no longer matches the current pending interaction
- **THEN** the host SHALL reject it without submitting a continuation

### Requirement: Canonical actions are model-owned

The Assistant panel model SHALL produce canonical host actions for waiting-user controls, and the shared renderer SHALL render those descriptors without inventing backend action names.

#### Scenario: SkillRunner quick option is selected

- **WHEN** the user selects a SkillRunner pending option
- **THEN** the model SHALL emit `reply-run` with the typed response value and visible label
- **AND** the host boundary SHALL route it to the selected pending run

#### Scenario: Legacy literal reaches the host boundary

- **WHEN** a supported historical literal such as `reply` or `cancel` reaches the canonicalizer
- **THEN** the boundary MAY translate that literal once
- **AND** no renderer or alias table SHALL become a second action source of truth

### Requirement: Managed reply controls MUST dispatch the current interaction action
The shared managed reply region MUST keep its textarea and action button stable across equivalent publications while updating the live action state used by its listener. An interaction token or action-payload update MUST NOT require reply-region reconstruction, and dispatch MUST retain existing current-token validation.

#### Scenario: Interaction token advances on a stable reply mount
- **WHEN** the same reply DOM receives interaction token N and then token N+1 without a structural reply-state change
- **THEN** the textarea, reply button, and unrelated managed regions retain DOM identity
- **AND** a subsequent reply dispatch contains token N+1 and the current typed response
- **AND** token N is not dispatched.

