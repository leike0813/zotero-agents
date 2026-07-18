## ADDED Requirements

### Requirement: Tag Vocabulary engine execution is bounded

Synthesis SHALL reject Tag Vocabulary validation or index requests that exceed the engine's production collection and string limits.

#### Scenario: Oversized canonical mutation is attempted

- **WHEN** a canonical Tag mutation would require validation beyond an engine bound
- **THEN** the mutation SHALL fail atomically
- **AND** no Tag Vocabulary repository state SHALL be replaced.

#### Scenario: Explicit index rebuild computes

- **WHEN** a bounded Tag index rebuild runs
- **THEN** repository loading and projection registry writes SHALL remain application-owned
- **AND** engine computation SHALL not perform persistence or Host I/O.
