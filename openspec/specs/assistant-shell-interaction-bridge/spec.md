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

