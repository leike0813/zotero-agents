## MODIFIED Requirements

### Requirement: CLI errors SHALL expose safe recovery state

Every CLI v3 error envelope SHALL include `retryable`, `stateChange`, `handleConsumption`, and `safeNextActions`, with optional `operationId` and `nextCommand`. `stateChange` and `handleConsumption` SHALL each represent unchanged/unconsumed, changed/consumed, or unknown rather than infer safety from status alone.

#### Scenario: Request outcome is uncertain
- **WHEN** a state-changing request was transmitted but its response was not read
- **THEN** the CLI SHALL report unknown state and handle outcomes
- **AND** SHALL direct the agent to `operation get <operationId>`.

#### Scenario: Read fails before state change
- **WHEN** a read command fails without consuming a handle or mutating state
- **THEN** the error SHALL report unchanged state, unconsumed handle, and a safe retry or inspection action.

#### Scenario: Clap rejects argv
- **WHEN** a command has an unknown or invalid argument
- **THEN** stdout SHALL contain a v3 JSON usage error and the process SHALL exit with code 2
- **AND** help and version output SHALL remain human-readable success paths.

### Requirement: CLI SHALL publish a complete Agent Surface v3
The CLI SHALL expose one `host-bridge.agent-surface.v3` descriptor whose identity, leaf argv, conditional argument relationships, result data contracts, handles, effects, examples, and recovery edges match runtime behavior.

#### Scenario: Agent inspects v3 identity
- **WHEN** an agent runs `surface identity --json`
- **THEN** stdout meta, identity data, embedded descriptor, Host manifest, and release envelope SHALL agree on v3 schema and CLI identity.

#### Scenario: Generated example is validated
- **WHEN** a command card supplies an example
- **THEN** its argv SHALL pass the real Clap parser and invocation schema.

#### Scenario: Agent searches localized intent
- **WHEN** an agent searches a configured non-ASCII intent
- **THEN** Rust and TypeScript search SHALL return the same ordered canonical commands and match reasons.

### Requirement: Agent Surface schemas SHALL describe stable observable contracts
Each command result schema SHALL describe CLI stdout `.data` and SHALL use explicit DTO contracts for handle, paging, workflow, notification, file, and operation results.

#### Scenario: Capability command returns data
- **WHEN** the CLI invokes a capability
- **THEN** the result schema SHALL describe `{capability, approval, data}` without inventing a `result` wrapper.

#### Scenario: Workflow submit succeeds
- **WHEN** workflow submission succeeds
- **THEN** the public DTO SHALL return `workflowRunId`
- **AND** SHALL NOT expose `runId` as an alias.
