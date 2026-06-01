## Purpose

Reference sidecar and citation graph cache are stale-tolerant sidecar data, not synchronized Zotero Library truth.
## Requirements
### Requirement: Reference sidecar does not own Zotero Library facts
Synthesis SHALL treat artifact sidecar rows, raw references, canonical references, redirects, and explicit binding decisions as plugin-owned cache state, not as an independent Zotero Library fact source.

#### Scenario: Paper metadata is displayed
- **WHEN** Workbench or Host Bridge displays Zotero-bound paper metadata
- **THEN** it SHALL read current Zotero Library state for metadata
- **AND** it SHALL use sidecar rows only for artifact/reference/binding cache status.

### Requirement: Canonical references own dedupe, bindings own Zotero targets
Raw references SHALL point to canonical references, canonical-reference redirects SHALL express dedupe/merge, and reference bindings SHALL express canonical-reference-to-Zotero targets.

#### Scenario: New raw references are extracted
- **WHEN** a changed references artifact is processed
- **THEN** each raw reference SHALL get a canonical reference assignment
- **AND** ambiguous canonical merges or Zotero bindings SHALL remain reviewable instead of being silently promoted.

### Requirement: Citation graph is an explicit cache projection
Citation graph nodes, edges, metrics, and layout SHALL be cache projections built from active raw references, effective canonical references, approved binding decisions, and direct Zotero binding checks.

#### Scenario: Graph refresh fails
- **WHEN** an explicit citation graph cache refresh fails
- **THEN** the previous active graph cache SHALL remain readable
- **AND** diagnostics SHALL be stored on the operation.

### Requirement: Graph refresh does not drive topic lifecycle
Citation graph cache refresh SHALL NOT mark topic artifacts stale, enqueue topic discovery, or update topic source-check state.

#### Scenario: Graph cache basis changes
- **WHEN** graph cache is refreshed with new references or bindings
- **THEN** topic create/update and source-check state SHALL remain unchanged
- **AND** graph metrics MAY become available as optional enrichment.

### Requirement: Citation graph cache refresh is explicit
Citation Graph cache SHALL be rebuilt only by an explicit graph cache rebuild operation or equivalent scoped debug command.

#### Scenario: Reference sidecar refresh changes references
- **WHEN** Reference Sidecar refresh inserts, stales, canonicalizes, or binds references
- **THEN** Citation Graph cache SHALL be marked stale
- **AND** Citation Graph cache rows SHALL NOT be rebuilt in the same operation.

#### Scenario: Graph cache rebuild runs
- **WHEN** `rebuildCitationGraphCacheNow` runs
- **THEN** it SHALL derive graph nodes, edges, and lightweight metrics from active raw references, effective canonical references, and accepted reference bindings
- **AND** it SHALL mark `citation-graph:library` ready on success.

### Requirement: Reference binding status is minimal
Reference binding state SHALL use `unbound`, `candidate`, `accepted`, `rejected`, and `stale_target` as the only Index-facing states.

#### Scenario: Legacy accepted bindings are read
- **WHEN** existing binding rows contain previous `auto` or `confirmed` values
- **THEN** active Index and graph code SHALL normalize them to `accepted`
- **AND** automatic or user-confirmed provenance SHALL be represented as evidence, not as separate states.

### Requirement: Full Registry projection APIs are absent from active paths
Active Reference Sidecar and Citation Graph cache paths SHALL NOT depend on full Registry projection APIs.

#### Scenario: Sidecar main path executes
- **WHEN** Reference Sidecar refresh, Workbench snapshot, Index data source, Graph cache rebuild, or MCP cache diagnostics execute
- **THEN** they SHALL NOT call legacy Registry projection refresh, full-index replacement, or old registry fact listing APIs.

