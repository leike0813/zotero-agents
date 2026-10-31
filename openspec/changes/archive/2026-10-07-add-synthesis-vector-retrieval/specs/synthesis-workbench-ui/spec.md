# Spec Delta

## ADDED Requirements

### Requirement: Home SHALL expose explicit retrieval control

Home SHALL manage multiple embedding connections, selected compatible primary/fallback, pending model/scope and explicit build/rebuild/update controls. It SHALL show active versus pending identity, coverage gaps versus failures, affected scope, progress and latest publication. Configuration alone SHALL not start work and credentials SHALL not appear in snapshots.

#### Scenario: Progress changes

- **WHEN** an index operation updates its progress
- **THEN** only its Home region updates and unrelated workbench managed regions retain DOM identity

### Requirement: Paper details SHALL identify similarity material

Paper-detail recommendations SHALL display title, concise excerpt and metadata/generated/weak material classification. Candidate cards SHALL remain distinct from adopted Topic sources and provide no direct per-hint adoption action.

#### Scenario: Weak material is used

- **WHEN** a recommendation is based on title-only material
- **THEN** the user can identify that limitation without reading implementation details
