## MODIFIED Requirements

### Requirement: Synthesis MCP read-only tools handle stale literature projections

Synthesis MCP read-only registry tools SHALL avoid synchronous full rebuilds while serving bounded responses.

#### Scenario: Paper registry projection is missing

- **WHEN** a read-only paper registry request is served without a registry projection
- **THEN** the service SHALL return bounded best-effort rows with diagnostics
- **AND** it SHALL enqueue a background literature rebuild best-effort
- **AND** it SHALL NOT synchronously rebuild canonical registry state.

#### Scenario: Paper registry projection is stale

- **WHEN** a read-only paper registry request observes a stale projection
- **THEN** the service SHALL include bounded diagnostics
- **AND** it SHALL NOT return raw Zotero objects.
