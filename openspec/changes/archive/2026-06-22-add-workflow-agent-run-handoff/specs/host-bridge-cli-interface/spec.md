## MODIFIED Requirements

### Requirement: Rust CLI exposes workflow and file commands

The system SHALL define CLI commands for workflow listing, workflow description,
workflow submission, workflow agent-owned handoff, task listing, and registered
file downloads.

#### Scenario: CLI prepares an agent-owned workflow handoff

- **WHEN** a user or agent runs
  `zotero-bridge workflow agent-run --workflow <id> --items <json-or-file>`
- **THEN** the CLI SHALL call the Host Bridge workflow agent-run endpoint with
  the workflow id and explicit selection
- **AND** the command SHALL NOT send workflow options, provider profiles, agent
  engine settings, or legacy input payloads
- **AND** stdout SHALL identify the handoff bundle and include short execution
  instructions for the agent.

#### Scenario: CLI prepares a no-selection agent-owned workflow handoff

- **WHEN** a user or agent runs
  `zotero-bridge workflow agent-run --workflow <id> --none`
- **THEN** the CLI SHALL request a no-selection handoff
- **AND** Host Bridge SHALL reject the request unless the workflow accepts
  no-selection execution.

### Requirement: Agent-owned workflow handoff is read-only

Host Bridge SHALL expose a workflow agent-run endpoint that packages workflow
context for agent-owned execution without submitting backend jobs or applying
results to Zotero.

#### Scenario: Host Bridge returns handoff context

- **WHEN** Host Bridge receives a valid workflow agent-run request
- **THEN** it SHALL return or register a bundle containing the raw workflow
  definition, referenced skill packages, selection context, selected files,
  output validation/finalization materials when available, workflow protocol
  guidance, and an agent instruction entrypoint
- **AND** it SHALL use current workflow visibility, selection validation, and
  file registry boundaries.

#### Scenario: Agent-run does not become host-owned execution

- **WHEN** Host Bridge handles a workflow agent-run request
- **THEN** it SHALL NOT execute `buildRequest`
- **AND** it SHALL NOT choose provider backends or models
- **AND** it SHALL NOT submit workflow backend tasks
- **AND** it SHALL NOT apply workflow output back to Zotero.

#### Scenario: Agent-run rejects host-owned execution fields

- **WHEN** the request body contains `workflowOptions`, `providerProfile`,
  `agentEngine`, or legacy `input`
- **THEN** Host Bridge SHALL reject the request as an invalid workflow
  agent-run request.
