## ADDED Requirements

### Requirement: ACP SkillRunner-compatible runs SHALL record bridge transport audit

ACP SkillRunner-compatible runs using ACP transports SHALL write run-local
ACP update, timeline, bridge, and transport audit files only when debug mode is
enabled. The files SHALL live in the existing run-specific
`.acp/<skillId>.<attempt>` namespace and bridge/transport events SHALL be
correlated by spawn id.

#### Scenario: Debug ACP skill run writes detailed audit files

- **GIVEN** debug mode is enabled
- **WHEN** an ACP SkillRunner-compatible run is prepared for skill
  `literature-explainer`
- **THEN** the run MAY write detailed audit files including
  `.acp/literature-explainer.1/timeline.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/acp-updates.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/bridge.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/transport.ndjson`
- **AND** `run.json` SHALL list the detailed audit file paths in its `files`
  map.

#### Scenario: Normal ACP skill run skips high-volume audit files

- **GIVEN** debug mode is disabled
- **WHEN** an ACP SkillRunner-compatible run is prepared and executed
- **THEN** it SHALL NOT write `timeline.ndjson`
- **AND** it SHALL NOT write `acp-updates.ndjson`
- **AND** it SHALL NOT pass `bridge.ndjson` as a bridge audit target
- **AND** it SHALL NOT write `transport.ndjson`
- **AND** low-volume run metadata and terminal state files MAY still be written.

#### Scenario: Repeated skill runs isolate audit files

- **GIVEN** debug mode is enabled
- **AND** `.acp/core-skill.1` already exists for one run in the workspace
- **WHEN** another ACP SkillRunner-compatible run for `core-skill` is prepared
- **THEN** the new run SHALL write bridge and transport audit files under
  `.acp/core-skill.2`
- **AND** it SHALL NOT append to `.acp/core-skill.1` files.

#### Scenario: Bridge and transport audits share spawn id

- **GIVEN** debug mode is enabled
- **WHEN** the plugin launches an ACP transport for a SkillRunner-compatible run
- **THEN** the transport audit and bridge audit SHALL include the same `spawnId`
- **AND** developers SHALL be able to correlate child stdout reads, WebSocket
  stdout frames, plugin stdin writes, and close events with that id.

#### Scenario: Audit write failure does not fail the run

- **GIVEN** bridge or transport audit writing fails because the diagnostic file
  cannot be opened
- **WHEN** the ACP transport otherwise remains usable
- **THEN** audit failure SHALL be logged as diagnostic failure
- **AND** it SHALL NOT by itself fail the SkillRunner-compatible run.

### Requirement: ACP backend diagnostics SHALL record bridge transport audit

ACP backend refresh-cache and backend probe diagnostics SHALL use the same
debug-mode-only bridge/transport audit model as SkillRunner-compatible runs.

#### Scenario: Refresh-cache diagnostic includes audit files

- **GIVEN** debug mode is enabled
- **WHEN** an ACP refresh-cache diagnostic launches a backend through the
  Windows bridge transport
- **THEN** the diagnostic result SHALL include paths for `bridge.ndjson` and
  `transport.ndjson`
- **AND** the files SHALL be written under the diagnostic runtime directory's
  `.acp` subdirectory.

#### Scenario: Backend probe diagnostic includes audit files

- **GIVEN** debug mode is enabled
- **WHEN** ACP backend probe launches a backend through the Windows bridge
  transport
- **THEN** the probe diagnostic SHALL include bridge and transport audit file
  paths
- **AND** transport events SHALL include launch plan, WebSocket, spawn, stdout,
  stderr, exit, and cleanup events when those stages occur.

### Requirement: ACP transport audit SHALL protect secrets and protocol ownership

ACP bridge and transport audit streams SHALL provide useful debugging evidence
without leaking secrets or stealing the ACP stdout stream from the protocol
reader.

#### Scenario: Secret-bearing values are redacted

- **GIVEN** environment keys or payload fields contain names such as `token`,
  `secret`, `password`, `authorization`, `api_key`, or `cookie`
- **WHEN** bridge or transport audit events are written
- **THEN** the value SHALL be redacted
- **AND** the key name MAY remain visible for diagnostic context.

#### Scenario: Protocol stdout remains single-owner

- **WHEN** the child process writes ACP JSON-RPC bytes to stdout
- **THEN** the bridge audit MAY record a bounded sanitized preview
- **AND** the plugin transport audit MAY record byte counts and frame events
- **BUT** only the ACP protocol reader SHALL consume stdout for message
  semantics.

#### Scenario: Empty assistant turn can be diagnosed

- **GIVEN** debug mode is enabled
- **AND** an ACP SkillRunner-compatible run fails because no assistant JSON
  object was produced
- **WHEN** developers inspect bridge and transport audit files
- **THEN** they SHALL be able to determine whether the child emitted assistant
  content, whether the bridge forwarded stdout frames, and whether the plugin
  received those frames.
