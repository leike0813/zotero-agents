## MODIFIED Requirements

### Requirement: CLI SHALL expose an offline agent control surface

The CLI SHALL expose `surface identity --json`, `surface describe <command> --json`, and `surface search --intent <intent> --json` without loading a Host Bridge profile or connecting to Zotero. The embedded `host-bridge.agent-surface.v1` descriptor SHALL define canonical argv, input/output schema, intent category, endpoint/capability mapping, approval and danger, pagination/file output, typed-handle consumption and return, retryability, state change, and safe recovery for every agent-facing command.

#### Scenario: Agent verifies exact compatibility

- **WHEN** an agent runs `surface identity --json`
- **THEN** the result SHALL include CLI version, build fingerprint, and command catalog checksum
- **AND** generated agent-facing surfaces SHALL carry the same identity.

#### Scenario: Agent selects a command without Host access

- **WHEN** an agent searches an intent or describes a command before connecting to Zotero
- **THEN** the CLI SHALL return the matching machine contract without reading a profile or making a network request.

#### Scenario: Packaged binary differs from generated guidance

- **WHEN** the packaged CLI identity or command descriptor differs from a release manifest or generated reference
- **THEN** release verification SHALL fail even when the CLI SemVer matches.

### Requirement: CLI errors SHALL expose safe recovery state

Every CLI error envelope SHALL include `retryable`, `stateChanged`, `handleConsumed`, and `safeNextActions`, with optional `nextCommand` when one exact recovery command is known. Error recovery fields SHALL reflect operation state rather than infer safety from an HTTP status alone.

#### Scenario: Apply-back state is uncertain

- **WHEN** agent apply-back fails or is interrupted
- **THEN** the agent SHALL be able to run `workflow agent-apply-status <agentRunId>` and inspect an auditable receipt before retrying.

#### Scenario: Read fails before state change

- **WHEN** a read command fails without consuming a handle or mutating state
- **THEN** the error SHALL report `stateChanged: false`, `handleConsumed: false`, and a safe retry or inspection action.

#### Scenario: Mutation outcome requires inspection

- **WHEN** a mutating request fails after state may have changed
- **THEN** the error SHALL not recommend blind retry
- **AND** `safeNextActions` SHALL direct the agent to inspect the relevant status or receipt.
