## MODIFIED Requirements

### Requirement: CLI SHALL expose diagnostics/history/profile canonical commands

The Host Bridge CLI SHALL expose connection diagnostics, independent backend provider-profile discovery and validation, workflow-only validation, permission visibility, recent history, skill-run events, and synthesis maintenance under canonical namespaces.

#### Scenario: Bridge diagnostics commands map to diagnostics endpoints

- **WHEN** an agent runs `zotero-bridge bridge profile inspect` or `zotero-bridge bridge backend status <backendId>`
- **THEN** the CLI calls the corresponding Host Bridge diagnostics endpoint
- **AND** stdout is a single JSON object.

#### Scenario: Workflow validate excludes provider input

- **WHEN** an agent runs `zotero-bridge workflow validate --workflow <id> ...`
- **THEN** the CLI constructs only the selection and workflow-options payload
- **AND** Host Bridge validates without resolving a provider profile or starting execution.

#### Scenario: Provider profile commands use backend context only

- **WHEN** an agent runs `workflow profile list`, `workflow profile describe --backend <id>`, or `workflow profile validate`
- **THEN** the CLI does not send a workflow identifier
- **AND** the response describes or validates only backend-owned profile facts.

#### Scenario: Run commands expose permission and history

- **WHEN** an agent runs `run permission pending`, `run recent`, `run workflow recent`, or `run skill events`
- **THEN** the CLI calls the canonical run-control endpoint
- **AND** the output remains lightweight and transcript-free.

## ADDED Requirements

### Requirement: CLI SHALL publish a complete Agent Surface v3
The CLI SHALL expose a `host-bridge.agent-surface.v3` descriptor whose leaf commands and global options exactly match the Rust Clap model and whose workflow entries come from loaded workflow manifests.

#### Scenario: Agent inspects v3 identity
- **WHEN** an agent runs `surface identity --json`
- **THEN** identity reports the v3 schema, CLI version, build fingerprint, and command catalog checksum without connecting to Zotero.

### Requirement: CLI default provider profile SHALL remain request-local
The CLI SHALL resolve `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` only for provider validation and workflow submission and SHALL never persist it in Host Bridge.

#### Scenario: Workflow query runs with an environment default
- **WHEN** the environment default exists and an agent runs workflow list, describe, requirements, or validate
- **THEN** the command ignores the environment default.

## REMOVED Requirements

### Requirement: CLI SHALL publish a complete Agent Surface v2
**Reason**: The public surface now includes global options, workflow catalog entries, and independent provider-profile commands that require the v3 descriptor.
**Migration**: Consumers SHALL read `surface identity` and consume `host-bridge.agent-surface.v3`.
