# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: MCP callable smoke failures are diagnosable across backends

ACP SkillRunner-compatible runs with required MCP tools SHALL persist a
backend-agnostic diagnostic bundle when callable smoke fails.

#### Scenario: Smoke failure records context injection diagnostics

- **GIVEN** a workflow declares required Zotero MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** callable smoke fails
- **THEN** the run SHALL record a diagnostic classification
- **AND** the run SHALL persist a redacted diagnostic JSON file
- **AND** the run SHALL persist a backend evidence log.

#### Scenario: Backend-specific evidence remains optional

- **GIVEN** a backend does not provide Claude Code debug files
- **WHEN** callable smoke fails
- **THEN** the diagnostic bundle SHALL still be generated from backend-neutral
  host evidence.

### Requirement: MCP context diagnostics do not leak credentials

MCP context diagnostics SHALL redact bearer tokens and authorization headers.

#### Scenario: Descriptor contains authorization

- **WHEN** the host persists MCP context diagnostics
- **THEN** the diagnostic JSON and evidence log SHALL NOT contain the raw bearer
  token or full Authorization header value.
