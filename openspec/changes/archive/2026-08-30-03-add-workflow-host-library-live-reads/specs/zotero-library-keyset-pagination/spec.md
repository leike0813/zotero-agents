## ADDED Requirements

### Requirement: Workflow library cursors SHALL bind canonical criteria and ordering
Every item, collection, traversal, and live-read continuation cursor SHALL be opaque and bind the resolved library, scope, normalized filters, schema, and stable identity ordering. A cursor SHALL NOT claim snapshot consistency across live calls.

#### Scenario: Live data changes between pages
- **WHEN** Zotero data changes after one live page is returned
- **THEN** later pages retain cursor validation and stable ordering semantics but do not claim to represent the earlier point in time

### Requirement: Pagination limits SHALL fail without silent truncation
A caller MAY request a value below the centralized limit but MUST NOT disable or exceed the hard maximum. When continuation remains, a successful page or traversal stop SHALL make that continuation observable rather than reporting complete coverage.

#### Scenario: Requested limit exceeds the hard maximum
- **WHEN** a caller requests an item or collection page beyond its fixed hard maximum
- **THEN** the call fails with `resource_limited` before returning a truncated page
