# agent-cli-self-description Specification

## Purpose
TBD - created by syncing change unify-host-bridge-cli-contracts-and-parameter-errors. Update Purpose after archive.

## Requirements

### Requirement: Published CLI surfaces SHALL be direct projections of runtime authorities
The CLI descriptor SHALL be built from the real Clap command tree and executable capability and command contracts. Runtime surface commands and the offline renderer SHALL use the same Rust descriptor builder.

#### Scenario: Parser or contract changes without rendered output
- **WHEN** a public argument, binding, target, input Schema, result Schema, or recovery rule changes
- **THEN** the runtime descriptor SHALL reflect the change immediately
- **AND** content and publication checks SHALL fail until tracked derivatives match.

#### Scenario: Command contract references an unknown parser argument
- **WHEN** a binding or structured-input declaration names an argument absent from the canonical Clap leaf
- **THEN** descriptor and command-contract validation SHALL fail.

### Requirement: Minimum-core command guidance SHALL render only executable contract facts
Every generated minimum-core command card SHALL be rendered from the Rust runtime descriptor and SHALL NOT obtain command fields from TypeScript AST parsing, handwritten target maps, or generated runtime snapshots.

#### Scenario: Materialized command card is stale
- **WHEN** a generated command card differs from the runtime descriptor
- **THEN** deterministic content validation SHALL fail before merge or publication
- **AND** runtime command execution SHALL remain governed by the parser and executable contracts.

#### Scenario: Parameter contract rejects input
- **WHEN** a generated card describes a schema-bearing input
- **THEN** its failure and recovery section SHALL identify the stable structured error category and direct the agent to `--schema` or `surface describe`
- **AND** all unaffected instructions SHALL retain their baseline meaning and depth.

### Requirement: Capability approval SHALL be selected from the executable contract
Host Bridge SHALL validate capability input before selecting the capability's effect and approval policy from the canonical contract. Capability handlers, CLI metadata, and surface renderers SHALL NOT maintain independent approval classifications.

#### Scenario: Invalid write input arrives
- **WHEN** a write capability receives invalid input
- **THEN** Host Bridge SHALL reject the input before creating an approval request
- **AND** no handler or mutation path SHALL execute.

#### Scenario: Valid capability arrives
- **WHEN** a capability receives valid input
- **THEN** the dispatcher SHALL apply the effect and approval policy declared for that capability
- **AND** the handler SHALL not be able to weaken or bypass the selected policy.
