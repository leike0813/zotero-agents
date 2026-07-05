## MODIFIED Requirements

### Requirement: CLI exposes synthesis maintenance commands

The CLI SHALL provide read-only synthesis cache/index status and enum-constrained cache invalidation.

#### Scenario: Agent invalidates synthesis cache

- **WHEN** an agent runs `zotero-bridge synthesis cache invalidate --scope <topic|graph|index>`
- **THEN** the CLI SHALL call `POST /bridge/v1/synthesis/cache/invalidate`
- **AND** the response SHALL describe the current effect as default Synthesis service cache invalidation unless a scoped invalidation seam is implemented.
