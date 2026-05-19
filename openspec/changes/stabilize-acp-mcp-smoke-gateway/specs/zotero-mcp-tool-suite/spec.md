## MODIFIED Requirements

### Requirement: MCP callable smoke failures are diagnosable across backends

ACP SkillRunner-compatible runs with required MCP tools SHALL persist a
backend-agnostic diagnostic bundle when callable smoke fails. The diagnostic
bundle SHALL identify the gateway decision source and MAY include transcripts,
runtime logs, or embedded server diagnostics only as non-decision evidence.

#### Scenario: Smoke failure records gateway diagnostics

- **GIVEN** a workflow declares required Zotero MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** callable smoke fails
- **THEN** the run SHALL record a diagnostic classification
- **AND** the run SHALL persist a redacted diagnostic JSON file
- **AND** the diagnostic JSON SHALL include `decisionSource = "mcp-gateway"`,
  `connectionId`, `smokeAttemptId`, `reachedTools`, and `missingTools`
- **AND** the run MAY persist a backend evidence log marked as non-decision
  evidence.

#### Scenario: Backend-specific evidence remains optional

- **GIVEN** a backend does not provide Claude Code debug files
- **WHEN** callable smoke fails
- **THEN** the diagnostic bundle SHALL still be generated from backend-neutral
  gateway and host evidence.

### Requirement: ACP callable smoke has a hard timeout

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
bound gateway observation with a 120 second hard timeout before sending any
business skill prompt. Once the gateway observes all required tools for the
current smoke span, the runner SHALL clear the smoke timeout immediately even if
the smoke prompt has not ended yet.

#### Scenario: Smoke observation times out

- **GIVEN** a workflow declares required MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** the gateway does not observe all required tools within 120 seconds
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL fail with a clear MCP callable smoke timeout error
- **AND** the runner SHALL best-effort cancel the active ACP turn
- **AND** the active smoke span SHALL be released.

#### Scenario: Observation clears timeout before prompt completion

- **GIVEN** a workflow declares required MCP tools
- **AND** the gateway observes all required tools within 120 seconds
- **WHEN** the smoke prompt continues running after observation completes
- **THEN** the smoke timeout SHALL be cleared immediately
- **AND** the smoke SHALL NOT fail solely because the prompt finishes after 120
  seconds.

### Requirement: ACP required MCP tools are callable-smoked

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
verify that the current ACP session exposes the required Zotero MCP callables
before sending the business skill prompt. The smoke decision SHALL be derived
from the host MCP gateway observing `tools/call` traffic for the current
`connectionId` and `smokeAttemptId`, not from transcripts, global runtime logs,
or embedded server diagnostics.

#### Scenario: Callable smoke succeeds

- **GIVEN** required MCP tools are declared
- **AND** host MCP availability preflight succeeds
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send a smoke prompt before the business prompt
- **AND** the run SHALL continue only after the MCP gateway observes each
  required tool as a `tools/call` for the current connection and smoke attempt
- **AND** the run SHALL record reached tools, missing tools, transport kinds,
  `connectionId`, and `smokeAttemptId`.

#### Scenario: Callable smoke fails

- **GIVEN** required MCP tools are declared
- **AND** the current ACP session does not expose one required callable through
  the host-injected MCP descriptor path
- **WHEN** smoke runs
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL record a clear MCP callable smoke failure with that tool
  in `missingTools`.

#### Scenario: Prompt error after observation is non-decision evidence

- **GIVEN** required MCP tools are declared
- **AND** the gateway has already observed all required tools for the current
  smoke span
- **WHEN** the smoke prompt later returns an agent error
- **THEN** MCP callable smoke SHALL remain passed
- **AND** the error SHALL be recorded only as warning or non-decision evidence
  unless the connection layer reports the session as disconnected.

#### Scenario: Old smoke evidence is ignored

- **GIVEN** a prior ACP connection or smoke attempt observed all required tools
- **WHEN** a later ACP connection starts a new smoke attempt
- **THEN** the later smoke SHALL require fresh gateway observations for its own
  `connectionId` and `smokeAttemptId`.
