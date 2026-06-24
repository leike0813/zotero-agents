## MODIFIED Requirements

### Requirement: ACP skill runner MUST execute ACP skill run requests

ACP skill execution SHALL use `acp.skill.run.v1` as its provider-facing request
contract. The runner MUST reject `skillrunner.job.v1` at its public dispatch
boundary. The runner MUST synthesize effective runtime options from the skill
runner manifest defaults, request payload runtime options, and submit-time
provider runtime options without mutating the submitted request payload.

#### Scenario: Input manifest uses local paths

- **WHEN** an ACP skill run is created from a workflow with upload-derived input
- **THEN** the run input manifest SHALL contain local absolute file paths
- **AND** it SHALL NOT expose `inputs/<key>/...` upload-relative paths to the
  agent.

#### Scenario: Runtime defaults are synthesized for ACP execution

- **GIVEN** an ACP skill run request omits `runtime_options.hard_timeout_seconds`
- **AND** the skill runner manifest declares `runtime.default_options.hard_timeout_seconds`
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the manifest timeout value
- **AND** the submitted request runtime options SHALL remain unchanged.

#### Scenario: Request runtime options override manifest defaults

- **GIVEN** an ACP skill run request declares `runtime_options.hard_timeout_seconds`
- **AND** the skill runner manifest also declares a hard timeout default
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the request timeout value.

#### Scenario: Submit-time provider runtime options override request payload

- **GIVEN** an ACP skill run request declares `runtime_options.hard_timeout_seconds`
- **AND** the selected workflow execution context declares provider option
  `hard_timeout_seconds`
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the provider option timeout
  value.

#### Scenario: Missing timeout falls back to 1200 seconds

- **GIVEN** neither the request nor the skill runner manifest declares a valid hard timeout
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use `1200` seconds.

### Requirement: ACP skill runner MUST disconnect recoverably on hard timeout

ACP skill execution SHALL apply `hard_timeout_seconds` as a local ACP connection
guard. Timeout expiry MUST disconnect the local ACP connection through existing
recoverable disconnect semantics, MUST NOT introduce a new terminal run state,
and MUST NOT mark the run as `failed` or `canceled`.

#### Scenario: Initial session setup is not counted as agent execution time

- **GIVEN** an ACP skill run is creating or configuring an ACP session
- **WHEN** session setup has not yet reached the first ACP prompt call
- **THEN** hard timeout monitoring SHALL NOT start
- **AND** the first timeout window SHALL start only after the prompt turn is
  ready to be sent to the ACP session.

#### Scenario: Auto run timeout disconnects without failing the run

- **GIVEN** an auto ACP skill run has an active prompt turn
- **WHEN** the effective hard timeout expires
- **THEN** the runner SHALL record a `hard-timeout-disconnect-requested` event
- **AND** it SHALL attempt to cancel the active ACP prompt
- **AND** it SHALL drain already-arrived transcript updates for a bounded local
  window
- **AND** it SHALL close any open streaming transcript item before appending the
  timeout notice
- **AND** it SHALL append a localized system status transcript item explaining
  the timeout disconnect
- **AND** it SHALL close the local ACP connection
- **AND** the run SHALL remain recoverable
- **AND** the run status SHALL NOT become `failed` or `canceled`.

#### Scenario: Timeout notice follows drained transcript content

- **GIVEN** transcript text has already arrived locally when hard timeout
  disconnect starts
- **WHEN** the runner completes the hard timeout disconnect transcript handling
- **THEN** visible transcript content SHALL be finalized before the timeout
  status item is appended
- **AND** the timeout status item SHALL appear after the drained agent
  transcript content.

#### Scenario: Interactive waiting clears timeout monitoring

- **GIVEN** an interactive ACP skill run reaches `waiting_user`
- **WHEN** the run waits for a user reply
- **THEN** hard timeout monitoring SHALL be stopped for that waiting period
- **AND** a later user reply SHALL start a fresh hard timeout window for the next agent turn.

#### Scenario: Recovered session reapplies timeout monitoring

- **GIVEN** an ACP skill run is reconnected through session recovery
- **WHEN** a recovered agent turn starts
- **THEN** the runner SHALL recompute effective runtime options
- **AND** it SHALL apply hard timeout monitoring to that recovered turn.
