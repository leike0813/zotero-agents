## ADDED Requirements

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
