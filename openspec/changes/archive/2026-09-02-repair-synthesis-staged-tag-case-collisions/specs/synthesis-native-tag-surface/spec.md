## ADDED Requirements

### Requirement: Native Tags surface SHALL recover from canonical case collisions

The native Tags surface SHALL preserve its existing public contracts while grouped promotion prevents new case collisions and startup repair restores historical collided aggregates without read-time mutation.

#### Scenario: Grouped promotion is read back through the native surface
- **WHEN** one request promotes staged variants that differ only by case
- **THEN** subsequent vocabulary and Tags workbench reads SHALL return the single winning canonical spelling
- **AND** public request and response DTOs SHALL remain unchanged

#### Scenario: Sidecar opens a historical collided store
- **WHEN** a real sidecar process starts against a store containing canonical case variants
- **THEN** startup SHALL attempt repair before publishing readiness
- **AND** successful repair SHALL allow vocabulary and Tags workbench reads in that process and after a cold reopen

#### Scenario: Startup repair cannot commit
- **WHEN** repair fails for a historical collided store
- **THEN** the sidecar SHALL still publish readiness
- **AND** the public read MAY retain its existing invalid-request failure until a later startup repairs the store
