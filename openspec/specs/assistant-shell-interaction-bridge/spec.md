# assistant-shell-interaction-bridge Specification

## Purpose
TBD - created by archiving change harden-assistant-shell-interaction-bridge. Update Purpose after archive.
## Requirements
### Requirement: Reliable shell-to-host action bridge

The Assistant shell SHALL use a host-injected bridge as the primary path for all child tab actions.

#### Scenario: ACP Skills reply reaches host

- **Given** ACP Skills is opened inside the Assistant shell
- **When** the user sends a reply
- **Then** the shell sends a `reply-run` action envelope to the host through `__zsAssistantWorkspaceBridge`
- **And** the host dispatches the action to ACP Skills run handling

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

The Assistant shell SHALL NOT change SkillRunner child page business UI or session behavior as part of action routing.

#### Scenario: SkillRunner reply path

- **Given** SkillRunner is opened inside Assistant shell
- **When** the user replies in a waiting task
- **Then** the shell forwards the action to the existing SkillRunner sidebar action dispatcher
- **And** the child page's run-dialog semantics remain unchanged

