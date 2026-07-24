## ADDED Requirements

### Requirement: ACP Skills recovery SHALL restore run-scoped Host Bridge CLI access

ACP Skills SHALL reconstruct the run's Zotero host-access policy and prepare the run-scoped Host Bridge CLI environment before dependency probing or adapter creation for a recovered conversation. Recovery SHALL obtain current transient credentials instead of restoring a plaintext token from persisted run state.

#### Scenario: Required host access is reapplied before adapter creation

- **GIVEN** an ACP Skill run has a recoverable remote session
- **AND** its effective request requires Zotero host access
- **WHEN** ACP Skills restores the missing local controller
- **THEN** it SHALL rematerialize the Host Bridge profile and CLI shims in the run workspace
- **AND** it SHALL inject `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_TOKEN`, `PATH`, and `Path` into the backend before runtime dependency probing
- **AND** the recovered adapter SHALL receive the backend produced by that dependency path.

#### Scenario: Recovery preserves write auto-approval policy

- **GIVEN** the recovered run's effective request enables `zotero_host_access.auto_approve_writes`
- **WHEN** ACP Skills prepares Host Bridge CLI access for recovery
- **THEN** it SHALL request a replacement run-scoped write auto-approval grant
- **AND** the recovered profile SHALL identify that policy for the same request ID.

#### Scenario: Explicitly disabled host access remains disabled

- **GIVEN** the recovered run's effective request declares `zotero_host_access.required: false`
- **WHEN** ACP Skills restores the local controller
- **THEN** it SHALL NOT materialize Host Bridge CLI access
- **AND** it SHALL NOT inject a Host Bridge profile or token into the recovered backend.

#### Scenario: Missing request uses the safe recovery default

- **GIVEN** neither the run record nor file-backed context contains the original ACP Skill request
- **WHEN** ACP Skills restores the local controller
- **THEN** it SHALL default Zotero host access to required
- **AND** it SHALL default write auto-approval to disabled.

#### Scenario: Recovered token remains transient

- **WHEN** recovery obtains and injects the current Host Bridge token
- **THEN** canonical run state and events SHALL contain only the masked Host Bridge summary
- **AND** they SHALL NOT contain the plaintext token.

#### Scenario: Host Bridge preparation failure settles recovery state

- **WHEN** recovery-time Host Bridge preparation throws an error
- **THEN** ACP Skills SHALL mark conversation recovery as failed
- **AND** it SHALL clear the connecting action state
- **AND** it SHALL NOT create the recovered adapter.
