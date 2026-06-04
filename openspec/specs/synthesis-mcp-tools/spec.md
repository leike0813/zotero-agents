## Purpose

Synthesis MCP tools expose cache views and must not start refresh from read calls.
## Requirements
### Requirement: Synthesis MCP registry and graph tools are cache views
Synthesis MCP tools that expose registry, reference, or citation graph data SHALL identify the data as sidecar cache, not Zotero Library truth.

#### Scenario: Paper registry tool is called
- **WHEN** an MCP client reads paper registry data
- **THEN** the response SHALL include cache status or diagnostics
- **AND** it SHALL NOT imply that Zotero Library has been synchronized.

### Requirement: Synthesis MCP reads never start refresh
Synthesis MCP read tools SHALL remain side-effect free.

#### Scenario: Cache is missing
- **WHEN** an MCP client requests missing cache data
- **THEN** the tool SHALL return bounded empty data or diagnostics
- **AND** it SHALL NOT start refresh, enqueue work, or write operation rows.

### Requirement: MCP cache diagnostics do not start work
Synthesis MCP tools SHALL report Reference Sidecar and Citation Graph cache readiness without starting refresh or graph rebuild.

#### Scenario: Graph cache is stale
- **WHEN** an MCP graph read detects stale graph cache basis
- **THEN** it SHALL return diagnostics recommending `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run Reference Sidecar refresh, graph cache rebuild, or layout rebuild.

#### Scenario: Reference sidecar is stale
- **WHEN** an MCP registry/cache read detects stale sidecar cache basis
- **THEN** it SHALL recommend `refreshReferenceSidecarNow`
- **AND** it SHALL NOT read legacy projection state to infer readiness.

### Requirement: MCP diagnostics expose advanced matching state without starting work
Synthesis MCP diagnostics SHALL report advanced reference matching operations and proposal counts without running the matcher.

#### Scenario: Proposal diagnostics are requested
- **WHEN** a read-only MCP or Host Bridge debug command lists reference matching status
- **THEN** it SHALL return bounded proposal counts and recent operation diagnostics
- **AND** it SHALL NOT start advanced matching, refresh sidecar data, or rebuild graph cache.

