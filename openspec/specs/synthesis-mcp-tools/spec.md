## MODIFIED Requirements

### Requirement: Synthesis MCP reads are bounded SQLite reads

Synthesis MCP tools SHALL read from SQLite-backed Synthesis state and remain
side-effect free.

#### Scenario: Paper registry tool is called

- **WHEN** `synthesis.get_paper_registry` is called
- **THEN** it SHALL execute a bounded SQLite query
- **AND** it SHALL NOT scan Zotero items or canonical JSON assets.

#### Scenario: Citation graph tool is called

- **WHEN** citation graph slice or metrics tools are called
- **THEN** they SHALL query SQLite graph/metrics tables
- **AND** they SHALL not rebuild graph structure, metrics, layout, or JSON
  projections.

#### Scenario: State is stale or missing

- **WHEN** requested Synthesis state is stale or missing
- **THEN** the tool SHALL return bounded diagnostics and recommended explicit
  commands
- **AND** it SHALL NOT enqueue background rebuild work.
