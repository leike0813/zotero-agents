## ADDED Requirements

### Requirement: Node runtime SHALL be a development-only oracle after R8

Node application code MAY remain for differential testing but SHALL NOT appear
in manifest v2, installation, supervision, runtime XPI inventory, active or
previous pointers, or fallback routing.

#### Scenario: Node oracle remains in the repository
- **WHEN** build and source inventories inspect retained Node application code
- **THEN** it SHALL be reachable only from development and differential test entrypoints
- **AND** production runtime readiness SHALL accept only `rust-native`
