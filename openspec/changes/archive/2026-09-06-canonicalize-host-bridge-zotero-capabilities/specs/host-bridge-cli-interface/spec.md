## ADDED Requirements

### Requirement: CLI SHALL execute and observe canonical mutations through their dedicated namespace

The CLI SHALL build canonical mutation DTOs for effect-free mutation.preview and mutation.execute across the closed 23-operation canonical mutation union, generating one valid operation id for each new execute intent and reusing that exact id only to retry or observe the same intent. It SHALL expose mutation get-operation as a read-only command mapped to mutation.get_operation. Observation output SHALL contain only running, settled(result), or unavailable and SHALL omit request payloads, timestamps, scope, and identity-binding details. Canonical mutation identity is shared with Bridge and inbound MCP but is independent of generic HTTP operation commands, request IDs, connections, and scope headers.

#### Scenario: CLI observes a mutation
- **WHEN** a caller invokes zotero-bridge mutation get-operation with a canonical operation id
- **THEN** the CLI SHALL call mutation.get_operation
- **AND** it SHALL not invoke generic operation get, execute, or replay.

#### Scenario: CLI receives expired canonical evidence
- **WHEN** mutation observation or replay reports outcome_unavailable
- **THEN** the CLI SHALL preserve that typed result
- **AND** it SHALL not generate a replacement operation id or retry automatically.

### Requirement: CLI command contracts SHALL validate canonical mutation boundaries

Every canonical mutation CLI leaf SHALL derive its target, closed input/result schema, effect, approval status, and output boundary from the executable command contract. Builders SHALL reject legacy operation aliases, public prepared-plan tokens, expectedRevision, linked-path write input, and undeclared fields before network I/O. Results SHALL be validated as canonical receipt or attempt evidence.

#### Scenario: Removed mutation input is supplied
- **WHEN** a caller provides a legacy operation name, public token, expectedRevision, or linked-path write input
- **THEN** the CLI SHALL fail with a structured usage error before contacting Host Bridge.
