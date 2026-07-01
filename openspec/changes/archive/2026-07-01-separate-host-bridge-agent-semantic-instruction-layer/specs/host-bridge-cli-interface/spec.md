## MODIFIED Requirements

### Requirement: Wrapper skill SHALL compose semantic guidance with generated surface mappings

The `zotero-bridge-cli` wrapper skill SHALL be rendered from a manually
maintained semantic instruction source plus generated Host Bridge surface
mappings.

#### Scenario: Wrapper skill is rendered

- **WHEN** the Host Bridge surface render script runs
- **THEN** the final wrapper skill SHALL include agent-facing command selection,
  safety, workflow lifecycle, and failure handling guidance from the semantic
  source
- **AND** it SHALL include generated command/capability/endpoint mappings from
  the Host Bridge surface catalog
- **AND** the semantic source SHALL NOT contain a full generated command table.

#### Scenario: Wrapper skill explains workflow execution modes

- **WHEN** an agent reads the wrapper skill to decide how to run a workflow
- **THEN** it SHALL distinguish Host-owned `workflow submit`, agent-owned
  `workflow agent-run`, and apply-back `workflow agent-apply`
- **AND** it SHALL state that `workflowRunId`, `skillRunId`, `agentRunId`, and
  `agentRequestId` are distinct handles with distinct valid operations.

#### Scenario: Wrapper skill remains current-state only

- **WHEN** wrapper skill docs are checked
- **THEN** they SHALL NOT contain historical migration wording such as legacy,
  deprecated, old command, previous version, or compatibility notes
- **AND** invalid inputs SHALL be described as invalid or unsupported current
  behavior.

### Requirement: Wrapper skill SHALL guide agent-run apply-back

The wrapper skill SHALL give agents enough semantic guidance to use
`workflow agent-run` and `workflow agent-apply` safely without re-describing the
entire output-contract toolkit.

#### Scenario: Agent prepares and applies a self-owned workflow result

- **WHEN** an agent uses `workflow agent-run`
- **THEN** the wrapper skill SHALL direct it to follow the handoff bundle's
  output-contract instructions for final bundle creation
- **AND** it SHALL direct apply-back through
  `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`
- **AND** it SHALL state that `agentRunId` is not monitored through run control
  or `run-watch`.
