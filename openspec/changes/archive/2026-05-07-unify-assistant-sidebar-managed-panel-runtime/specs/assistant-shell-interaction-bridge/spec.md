# assistant-shell-interaction-bridge Delta

## MODIFIED Requirements

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

### Requirement: Page boundary preservation

The Assistant shell and managed panel runtime SHALL NOT change child page backend protocols or session behavior as part of shared action routing.

#### Scenario: SkillRunner preserves business semantics

- **Given** SkillRunner is hosted inside the Assistant shell
- **When** shared managed UI controls emit actions
- **Then** waiting_user reply, waiting_auth reply, auth import, cancel, drawer, and task-selection actions route to the original SkillRunner host dispatch path
- **And** SkillRunner backend protocol and assistant revision/replacement semantics remain unchanged.
