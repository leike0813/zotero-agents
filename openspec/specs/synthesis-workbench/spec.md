## ADDED Requirements

### Requirement: Production chrome reuses the operational application projection

The production Workbench chrome and progress reads SHALL reuse the environment-neutral operational projection for cache readiness and background jobs while the plugin continues to compose storage, sync, review, canonical maintenance, and other plugin-only state from its existing production owners.

#### Scenario: Production Workbench reads chrome

- **WHEN** the current production Workbench requests chrome or progress
- **THEN** it SHALL continue reading the plugin-owned production repository through the existing `SynthesisClient` composition
- **AND** its observable chrome shape, ordering, refresh scope, and surface DOM identity SHALL remain unchanged.

#### Scenario: Sidecar canary is unavailable

- **WHEN** the sidecar Workbench canary is absent, unavailable, or incompatible
- **THEN** production Workbench behavior SHALL be unaffected
- **AND** no automatic sidecar-to-plugin or plugin-to-sidecar fallback branch SHALL run.
