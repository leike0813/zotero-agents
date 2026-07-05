## MODIFIED Requirements

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

#### Scenario: Execution preflight uses submission lane

- **WHEN** the SkillRunner provider prepares a request for job submission
- **THEN** the capability handshake SHALL run under the submission connection lane
- **AND** it SHALL NOT be skipped as a low-priority health probe solely because the backend is busy or degraded.

### Requirement: Legacy SkillRunner capability fallback

The plugin SHALL treat a reachable SkillRunner backend without a handshake endpoint as legacy-capable for `skillrunner.job.v1` only.

#### Scenario: Handshake endpoint missing

- **WHEN** `POST /v1/system/handshake` returns `404` or `405`
- **AND** `/v1/system/ping` confirms the backend is reachable
- **THEN** the plugin SHALL use legacy capabilities with `skillrunner.job.v1` supported and `skillrunner.sequence.v1` unsupported.

#### Scenario: Execution preflight fallback keeps submission lane

- **WHEN** the SkillRunner provider prepares a request for job submission
- **AND** `POST /v1/system/handshake` returns `404` or `405`
- **THEN** the fallback reachability check SHALL use the same submission connection lane as the failed handshake.

#### Scenario: Handshake unavailable due to auth or network failure

- **WHEN** the handshake fails due to authentication, authorization, or network availability
- **THEN** the plugin SHALL NOT convert the failure into legacy capabilities.
