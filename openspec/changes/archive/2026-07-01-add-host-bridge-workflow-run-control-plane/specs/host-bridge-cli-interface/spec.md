## ADDED Requirements

### Requirement: CLI exposes workflow and skill run control commands

The `zotero-bridge` CLI SHALL expose semantic commands for workflow cancel intent, active task listing, and explicit skill-run interaction.

#### Scenario: CLI cancels a workflow run
- **WHEN** a caller runs `zotero-bridge workflow cancel <workflowRunId>`
- **THEN** the CLI SHALL post workflow cancel intent to Host Bridge
- **AND** stdout SHALL preserve the standard single JSON result contract.

#### Scenario: CLI lists active tasks
- **WHEN** a caller runs `zotero-bridge task active`
- **THEN** the CLI SHALL call the lightweight active tasks endpoint.

#### Scenario: CLI interacts with a skill run
- **WHEN** a caller runs `zotero-bridge skill-run get`, `skill-run reply`, or `skill-run connect`
- **THEN** the CLI SHALL call the corresponding skill run endpoint using the supplied opaque skill run id.

#### Scenario: CLI preserves structured errors
- **WHEN** a workflow or skill run control command fails
- **THEN** the CLI SHALL report the Host Bridge structured error through the existing CLI error contract.
