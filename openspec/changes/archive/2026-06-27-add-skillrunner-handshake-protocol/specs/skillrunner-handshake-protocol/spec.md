## ADDED Requirements

### Requirement: SkillRunner handshake endpoint

SkillRunner backends SHALL expose a handshake contract at `POST /v1/system/handshake` for protocol capability discovery.

#### Scenario: Plugin requests known protocols

- **WHEN** the plugin prepares a SkillRunner backend for protocol-aware execution
- **THEN** it SHALL send a JSON request with schema `zotero-agents.skillrunner-handshake.request.v1`
- **AND** it SHALL include client name, client version, and requested protocol IDs.

#### Scenario: Backend reports protocol support

- **WHEN** the backend responds to the handshake request
- **THEN** the response SHALL use schema `zotero-agents.skillrunner-handshake.response.v1`
- **AND** it SHALL report support as a boolean per protocol ID.

### Requirement: SkillRunner protocol preflight

The plugin SHALL confirm that a SkillRunner backend supports the required execution protocol before sending a protocol-specific request.

#### Scenario: Existing SkillRunner job execution

- **WHEN** the plugin prepares a `skillrunner.job.v1` request
- **THEN** it SHALL require backend support for `skillrunner.job.v1`.

#### Scenario: Current SkillRunner sequence execution

- **WHEN** the plugin executes `skillrunner.sequence.v1` by decomposing the workflow into step jobs
- **THEN** it SHALL require backend support for `skillrunner.job.v1`.

#### Scenario: Backend-native SkillRunner sequence execution

- **WHEN** the plugin uses a backend-native sequence execution path
- **THEN** it SHALL require backend support for `skillrunner.sequence.v1`.

#### Scenario: Required protocol unsupported

- **WHEN** the required protocol is not supported
- **THEN** execution SHALL fail before sending the request to the backend
- **AND** the error SHALL tell the user that the current SkillRunner backend does not support the execution protocol.

### Requirement: Legacy SkillRunner capability fallback

The plugin SHALL treat a reachable SkillRunner backend without a handshake endpoint as legacy-capable for `skillrunner.job.v1` only.

#### Scenario: Handshake endpoint missing

- **WHEN** `POST /v1/system/handshake` returns `404` or `405`
- **AND** `/v1/system/ping` confirms the backend is reachable
- **THEN** the plugin SHALL use legacy capabilities with `skillrunner.job.v1` supported and `skillrunner.sequence.v1` unsupported.

#### Scenario: Handshake unavailable due to auth or network failure

- **WHEN** the handshake fails due to authentication, authorization, or network availability
- **THEN** the plugin SHALL NOT convert the failure into legacy capabilities.

### Requirement: Handshake caching

The plugin SHALL cache SkillRunner handshake results by backend identity and base URL.

#### Scenario: Same backend and URL

- **WHEN** the same backend id and base URL are checked repeatedly
- **THEN** the plugin SHALL reuse the cached handshake result.

#### Scenario: Backend id or URL changes

- **WHEN** the backend id or base URL changes
- **THEN** the plugin SHALL perform a new handshake.
