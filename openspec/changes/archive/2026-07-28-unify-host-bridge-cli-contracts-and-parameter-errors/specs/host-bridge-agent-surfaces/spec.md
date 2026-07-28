## ADDED Requirements

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
