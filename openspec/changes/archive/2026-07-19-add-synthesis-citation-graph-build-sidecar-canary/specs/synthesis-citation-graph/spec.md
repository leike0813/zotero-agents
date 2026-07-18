## ADDED Requirements

### Requirement: Unified graph build SHALL have isolated worker parity
The environment-neutral Unified Citation Graph build contract SHALL produce
equivalent strictly rebuilt results in process and through the internal sidecar
canary for wire-bounded full and source-slice requests.

#### Scenario: Full graph fixture is compared
- **WHEN** the same valid full-scope request is executed directly and through the worker canary
- **THEN** nodes, resolved and aggregate edges, ownership, incoming groups, light metrics, and diagnostics SHALL be equivalent

#### Scenario: Source-slice fixture is compared
- **WHEN** the same valid source-slice request is executed directly and through the worker canary
- **THEN** the rebuilt scope and all result collections SHALL be equivalent
