## MODIFIED Requirements

### Requirement: Production chrome reuses the operational application projection

The production Workbench chrome and progress reads SHALL reuse the native operational projection for cache readiness and explicit background operations. Chrome SHALL remain bounded and read-only and MUST NOT substitute for a requested content surface. Its observable shape, ordering, refresh scope, and surface DOM identity SHALL remain compatible with the fixed baseline.

#### Scenario: Production Workbench reads chrome
- **WHEN** the current production Workbench requests chrome or progress
- **THEN** it reads bounded native repository state through `SynthesisClient`
- **AND** it does not load Topic, Reference, Graph, Tag, Concept, or review content

#### Scenario: Native projection is unavailable
- **WHEN** the native chrome projection is unavailable or incompatible
- **THEN** production reports the stable unavailable state
- **AND** no plugin or Node fallback runs

#### Scenario: Sidecar canary is unavailable
- **WHEN** the production sidecar Workbench canary is absent, unavailable, or incompatible
- **THEN** production reports the stable unavailable state
- **AND** no automatic sidecar-to-plugin or plugin-to-sidecar fallback branch runs

## ADDED Requirements

### Requirement: Every Workbench surface SHALL have a domain projection

Home, Topics, Review, Tags, Concepts, Reader, Index, and Graph SHALL each be produced by its own bounded native application projection. A requested surface MUST NOT fall back to maintenance chrome or a success-shaped placeholder.

#### Scenario: Named surface is opened
- **WHEN** Workbench requests one named surface
- **THEN** Rust reads only that surface's required domain state and requested page/filter
- **AND** hidden surfaces are not loaded or rebuilt

#### Scenario: Surface is not implemented
- **WHEN** a named surface lacks its real domain projection during migration
- **THEN** it reports a stable unavailable state
- **AND** it does not return maintenance chrome as surface content

### Requirement: Workbench reads SHALL preserve native-service semantics

Workbench DTOs SHALL preserve the fixed baseline's stable fields, readiness distinction, ordering, recommended commands, and read-only behavior. Index rows SHALL carry counts by default and load raw references only for an explicit bounded detail/reference scope.

#### Scenario: Index default page is read
- **WHEN** Workbench opens the default Index surface
- **THEN** rows include bounded summary and reference counts
- **AND** full raw-reference arrays are absent until explicitly requested

#### Scenario: Workbench read is compared before and after
- **WHEN** a surface read completes without an explicit mutation
- **THEN** repository facts, cache bases, operations, canonical files, and Host effects remain unchanged

### Requirement: External domain mutations SHALL invalidate their Workbench surfaces

Successful mutations performed through a workflow or another Workbench-external Host consumer SHALL publish the exact affected surface set. The Workbench SHALL mark those surfaces dirty and immediately reload the active surface when it is affected, without refreshing unrelated content surfaces.

#### Scenario: Workflow mutates Tag vocabulary state
- **WHEN** a workflow successfully saves the controlled Tag vocabulary, stages suggestions, or discards staged suggestions
- **THEN** the Host SHALL invalidate the Tags surface
- **AND** an open Tags surface SHALL reload from Synthesis state so staged count, rows, and available actions reflect the committed mutation

#### Scenario: Tags surface is not active
- **WHEN** a successful workflow Tag mutation occurs while another Workbench surface is active
- **THEN** the Tags surface SHALL remain dirty until it is selected
- **AND** Index, Graph, Review, and other unrelated content surfaces SHALL NOT reload solely because of that Tag mutation

#### Scenario: Workflow applies a Topic synthesis result
- **WHEN** a workflow successfully applies a Topic synthesis result with optional Concept or Topic Graph proposals
- **THEN** the Host SHALL invalidate Home, Topics, Concepts, Graph, and Review
- **AND** an active affected surface SHALL reload from the native domain projection

### Requirement: Workbench domain rows SHALL use the public UI DTO

Topic and Concept Workbench surfaces SHALL map native application records to the public UI DTO before crossing the production boundary. Repository column names and serialized JSON columns MUST NOT be exposed as substitutes for public row fields.

#### Scenario: Topic and Concept rows are rendered
- **WHEN** native Topic and Concept state exists and the matching Workbench surfaces are read
- **THEN** Topic rows carry stable `id` values and Concept rows carry snake-case identifiers plus decoded arrays
- **AND** the UI snapshot normalizer retains the rows instead of discarding them as malformed

#### Scenario: Topic readiness metadata is rendered
- **WHEN** native Topic state exists and Home or Topics is read
- **THEN** every Topic row carries typed `freshness`, `source_materials_status`, and `source_materials_percent` values derived from persisted dependency facts
- **AND** missing production fields do not silently become `unknown`, `missing`, or zero in an otherwise successful projection

### Requirement: Topics Graph SHALL project the materialized Topic domain

Successful Topic apply SHALL materialize the committed Topic in the canonical Topic Graph through the Topic Graph application boundary. The Topics surface SHALL include the bounded Topic Graph projection required by its Graph view. Per-Topic projection JSON MUST NOT substitute for canonical Topic Graph nodes, edges, or review facts.

#### Scenario: Applied Topic is opened in Topics Graph
- **WHEN** a Topic apply commits a valid Topic aggregate
- **THEN** the canonical Topic Graph contains one current materialized node for that Topic
- **AND** the Topics surface Graph projection includes that node after apply and cold reopen

#### Scenario: Topic apply carries relation proposals
- **WHEN** a committed Topic includes valid Topic Graph relation proposals
- **THEN** the Topic Graph application ingests them through its validation and review rules
- **AND** a Graph projection failure produces a stable warning without rolling back the committed Topic aggregate

### Requirement: Topic readiness SHALL have one persisted fact source

Topic freshness and source-material readiness SHALL be derived from persisted Topic dependency baseline/current facts owned by the native Topic application. Workbench reads SHALL remain bounded and read-only. Existing Topic rows without a native readiness baseline SHALL be deterministically backfilled when the repository migrates or the Topic is next applied; insufficient evidence SHALL produce explicit dirty/missing reasons rather than fabricated freshness.

#### Scenario: Topic dependencies are unchanged
- **WHEN** the current saved paper set and required digest, references, and citation-analysis dependencies match the persisted baseline
- **THEN** the Topic row reports `fresh` and the derived readiness percentage reflects complete papers
- **AND** reopening the repository preserves the same result without reading a legacy JSON state file

#### Scenario: Existing Topic has incomplete migration evidence
- **WHEN** an existing Topic cannot reconstruct a complete dependency baseline
- **THEN** the native projection reports a deterministic dirty or missing state with structured reasons
- **AND** it does not report `unknown` solely because a public DTO field was omitted

### Requirement: Review SHALL compose bounded public domain projections

The native Review surface SHALL publish Reference content through `registry`, Concept content through `concepts`, Topic Graph content through `topicGraph`, and aggregate counts through `reviews.summary`. It MUST NOT place actionable review rows under parallel domain-specific fields inside `reviews`. Status, kind, confidence, search, cursor, and limit filters SHALL be applied before repository materialization.

#### Scenario: Reference reviews are opened
- **WHEN** the Review Center or Index review subview requests Reference binding, canonical merge, or canonical revision rows
- **THEN** the response contains bounded `registry.matchProposals`, `registry.cleanupProposals`, and only their required canonical and target context
- **AND** proposal fields use the existing public snake-case DTO

#### Scenario: Concept reviews are opened
- **WHEN** the Review Center requests Concept review rows
- **THEN** the response contains bounded `concepts.reviewItems` and the candidate Concept context required by those rows
- **AND** review state is read from canonical facts rather than the stale rebuildable Concept index

#### Scenario: Topic Graph reviews are opened
- **WHEN** the Review Center requests Topic Graph relation review
- **THEN** `topicGraph.edges` contains bounded suggested relations and `topicGraph.reviewItems` contains bounded low-confidence review rows with their endpoint nodes
- **AND** the existing UI can merge both row kinds without reading a second payload shape

#### Scenario: Review action refreshes the active surface
- **WHEN** a review mutation commits or returns a structured diagnostic
- **THEN** the affected Review and domain surfaces are invalidated with their existing scopes
- **AND** an active Review reread reflects the canonical state without rebuilding an unrelated index

### Requirement: Workbench state SHALL remain JSON-safe after optional selections clear

Workbench reducers SHALL omit cleared optional selection properties, and native composition SHALL construct a JSON-safe read state without weakening strict JSON validation. Recovery rendering MUST preserve the primary command failure when a secondary refresh also fails.

#### Scenario: Graph selection is cleared during layout recovery
- **WHEN** a selected graph element is cleared by a topic change, stage click, or layout action
- **THEN** the serialized Workbench state omits `selectedElement`
- **AND** later Graph, Concept, Topic, and Review operations remain callable

### Requirement: Workbench SHALL expose bounded sidecar runtime status

The Workbench top bar SHALL expose a focusable runtime indicator derived from the supervisor lifecycle and bounded health fields. Foreground health observation SHALL be coalesced and stopped when hidden or disposed. Detailed diagnostics or logs MUST NOT be fetched until the user explicitly opens diagnostics.

#### Scenario: Sidecar is ready and computing
- **WHEN** lifecycle is ready and the compute pool has active or queued work
- **THEN** the indicator reports busy and its detail view shows bounded active and queued counts
- **AND** Graph content DOM is not rebuilt solely for the status update

#### Scenario: Compute pool becomes degraded
- **WHEN** the worker pool exhausts its replacement budget
- **THEN** the indicator reports degraded while the supervisor enters bounded recovery
- **AND** no secret, path, log body, or repository state appears in the status DTO
