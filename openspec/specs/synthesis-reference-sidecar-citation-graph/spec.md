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

### Requirement: Citation graph cache refresh is visible and bounded

Citation Graph cache SHALL be maintained only by visible operation paths: source-slice incremental refresh, explicit graph cache rebuild, or equivalent scoped debug command.

#### Scenario: Reference sidecar refresh changes references
- **WHEN** Reference Sidecar refresh inserts, stales, canonicalizes, or binds references
- **THEN** Citation Graph cache MAY be refreshed by a separate incremental graph operation
- **AND** Citation Graph cache rows SHALL NOT be rebuilt inside the Reference Sidecar transaction.

#### Scenario: Workflow apply changes one source
- **WHEN** literature-digest workflow apply updates sidecar facts for one source
- **THEN** Citation Graph cache MAY refresh that source slice if graph cache already exists
- **AND** it SHALL NOT bootstrap a missing graph cache.

#### Scenario: Graph cache rebuild runs
- **WHEN** `rebuildCitationGraphCacheNow` runs
- **THEN** it SHALL derive graph nodes, edges, and lightweight metrics from active raw references, effective canonical references, and accepted reference bindings
- **AND** it SHALL mark `citation-graph:library` ready on success.

#### Scenario: Incremental graph refresh runs
- **WHEN** graph-affecting sidecar facts change for known source refs
- **THEN** the incremental graph operation SHALL rewrite affected source edges, source ownership, incoming groups, nodes, and light metrics
- **AND** unrelated source rows SHALL remain readable.

### Requirement: Reference binding status is minimal

Reference binding facts SHALL represent accepted canonical-reference-to-Zotero targets; proposal and review state SHALL be represented separately.

#### Scenario: Legacy accepted bindings are read
- **WHEN** existing binding rows contain previous `auto` or `confirmed` values
- **THEN** active Index and graph code SHALL normalize them to accepted facts
- **AND** automatic or user-confirmed provenance SHALL be represented as evidence, not as separate states.

#### Scenario: Candidate binding is produced
- **WHEN** advanced matching produces a candidate or ambiguous Zotero binding
- **THEN** it SHALL create or update a reference match proposal
- **AND** it SHALL NOT persist that candidate as a binding fact.

### Requirement: Full Registry projection APIs are absent from active paths

Active Reference Sidecar and Citation Graph cache paths SHALL NOT depend on full Registry projection APIs.

#### Scenario: Sidecar main path executes
- **WHEN** Reference Sidecar refresh, Workbench snapshot, Index data source, Graph cache rebuild, or MCP cache diagnostics execute
- **THEN** they SHALL NOT call legacy Registry projection refresh, full-index replacement, or old registry fact listing APIs.

### Requirement: Reference match proposals separate review from facts

Synthesis SHALL store advanced matcher review candidates in `synt_reference_match_proposal`.

#### Scenario: Zotero binding proposal is open
- **WHEN** a candidate Zotero target needs review
- **THEN** the proposal SHALL store source canonical reference, target library/item key, confidence, score, reasons, diagnostics, and basis hash.

#### Scenario: Canonical merge proposal is open
- **WHEN** a canonical dedupe candidate needs review
- **THEN** the proposal SHALL store source canonical reference, target canonical reference, confidence, score, reasons, diagnostics, and basis hash.

### Requirement: Accepted proposals write graph-affecting facts

Accepting a reference match proposal SHALL write the corresponding accepted fact
and mark citation graph cache stale.

#### Scenario: Binding proposal is manually retargeted

- **WHEN** the user applies a manual target decision for a `zotero_binding`
  proposal
- **THEN** Synthesis SHALL write an accepted binding fact to the selected Zotero
  item
- **AND** create an accepted manual audit proposal
- **AND** mark the original proposal `retargeted`.

#### Scenario: Canonical merge proposal is manually retargeted

- **WHEN** the user applies a manual target decision for a `canonical_merge`
  proposal
- **THEN** Synthesis SHALL redirect both the source canonical and original target
  canonical to the selected canonical target
- **AND** create accepted manual audit proposals for both redirects
- **AND** mark the original proposal `retargeted`.

### Requirement: Reference Sidecar Ingestion SHALL Skip Deterministic Invalid Raw References

Synthesis sidecar ingestion SHALL use deterministic invalid-reference filtering
as a fallback for legacy, imported, or direct service inputs that bypass
literature-digest workflow apply.

#### Scenario: Legacy references artifact includes invalid rows
- **WHEN** sidecar ingestion reads references with bare DOI/URL titles, publication-metadata-only titles, author-only titles, empty titles, or no usable content tokens
- **THEN** those rows SHALL NOT create raw reference rows
- **AND** they SHALL NOT create canonical references.

#### Scenario: Warning-only rows are ingested
- **WHEN** sidecar ingestion reads a plausible reference with bibliographic suffix, possible author-prefix noise, missing year/authors, or a short but plausible title
- **THEN** that row SHALL remain eligible for raw/canonical materialization.

#### Scenario: Sidecar ingestion executes
- **WHEN** sidecar ingestion applies the fallback filter
- **THEN** it SHALL NOT call Advanced Reference Matching, clustered dedupe, or review proposal generation.

### Requirement: Cluster Dedupe Fact Changes SHALL Stale Citation Graph Cache

Advanced Reference Matching cluster dedupe SHALL affect Citation Graph only
through accepted redirect facts.

#### Scenario: Cluster redirect is written
- **WHEN** production advanced matching writes a canonical redirect from a
  cluster redirect action
- **THEN** `citation-graph:library` SHALL be marked stale
- **AND** graph data rows SHALL NOT be rebuilt in the same operation.

#### Scenario: Cluster review proposal is written
- **WHEN** production advanced matching writes an open `canonical_merge`
  proposal from a cluster review action
- **THEN** it SHALL NOT create accepted graph edges
- **AND** it SHALL NOT rebuild graph data.

### Requirement: Graph cache consumes accepted sidecar facts only

Citation graph cache rebuild SHALL consume active raw references, effective canonical references, accepted bindings, and accepted canonical redirects.

#### Scenario: Canonical redirect is written by advanced dedupe
- **WHEN** Advanced Reference Matching writes a canonical redirect
- **THEN** citation graph cache SHALL be marked stale
- **AND** graph cache rebuild SHALL later resolve references through the redirect.

#### Scenario: Canonical merge proposal is open
- **WHEN** a `canonical_merge` proposal is open
- **THEN** graph cache rebuild SHALL NOT treat it as an accepted redirect.

### Requirement: Citation Graph cache supports source-slice incremental refresh

Citation Graph cache SHALL support a bounded source-slice refresh that rewrites only affected source outgoing edges, source ownership, incoming groups, related nodes, and light metrics.

#### Scenario: Source slice is refreshed without replacing unrelated rows

- **GIVEN** an existing graph cache has edges from source A and source B
- **WHEN** the graph cache refresh receives only source A as affected
- **THEN** source A graph rows are rebuilt from current active sidecar facts
- **AND** source B graph rows remain present.

### Requirement: Sidecar-changing actions may trigger visible graph incremental refresh

Workflow apply, Reference Sidecar refresh, and Advanced Matching SHALL be allowed to trigger an explicit incremental graph refresh operation after their own sidecar or fact changes complete.

#### Scenario: Incremental graph refresh is a separate operation

- **WHEN** a sidecar-changing operation triggers graph refresh
- **THEN** Citation Graph refresh progress is represented by its own `synt_operation`
- **AND** failure of that graph refresh SHALL NOT roll back the completed sidecar-changing operation.

### Requirement: Graph bootstrap policy is operation-specific

Graph cache missing or failed state SHALL be handled according to the triggering operation.

#### Scenario: Workflow apply skips missing graph bootstrap

- **GIVEN** graph cache is missing or failed
- **WHEN** literature-digest workflow apply updates sidecar facts
- **THEN** it SHALL NOT run a full graph rebuild.

#### Scenario: Explicit heavy operations may bootstrap graph cache

- **GIVEN** graph cache is missing or failed
- **WHEN** Reference Sidecar refresh or Advanced Matching changes graph-affecting facts
- **THEN** it MAY run an explicit full graph rebuild operation.

### Requirement: Stale graph cache can be refreshed manually from recorded delta

When `citation-graph:library` is stale, Workbench SHALL be able to trigger a manual source-slice incremental refresh only from stale delta metadata recorded in cache-basis diagnostics.

#### Scenario: Manual stale refresh has recorded delta

- **GIVEN** graph cache basis is stale
- **AND** diagnostics record affected source refs or changed canonical/binding/redirect ids
- **WHEN** `refreshCitationGraphCacheIncrementalNow` runs
- **THEN** it SHALL refresh the affected graph source slices
- **AND** it SHALL NOT run full graph cache rebuild.

#### Scenario: Manual stale refresh has no recorded delta

- **GIVEN** graph cache basis is stale
- **AND** diagnostics do not record an incremental refresh scope
- **WHEN** Workbench renders graph controls
- **THEN** the manual incremental refresh action SHALL be unavailable
- **AND** full graph cache rebuild SHALL remain available as the fallback.

### Requirement: Related-items sync follows explicit sidecar update paths

Literature-digest sidecar apply, Reference Sidecar refresh, and Advanced Matching SHALL be allowed to trigger a visible related-items sync operation after their own fact updates and graph refresh attempts.

#### Scenario: Digest apply triggers scoped related-items sync

- **WHEN** literature-digest apply updates sidecar facts for one source ref
- **THEN** the service SHALL attempt graph incremental refresh for that source ref
- **AND** it SHALL then run related-items sync scoped to that source ref
- **AND** graph refresh failure SHALL NOT block related-items sync.

#### Scenario: Sidecar refresh triggers scoped related-items sync

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** related-items sync SHALL run only for those changed source refs.

#### Scenario: Advanced Matching triggers full related-items sync after graph-affecting facts

- **WHEN** Advanced Matching writes accepted binding or canonical redirect facts
- **THEN** related-items sync SHALL run as a full sync
- **AND** open review proposals alone SHALL NOT require related-items sync.

### Requirement: Related-items sync resolves edges without requiring graph cache

Related-items sync SHALL use graph cache only as an optimization. If graph cache is missing, stale, failed, empty, or refresh fails, it SHALL compute accepted library-to-library citation edges directly from active sidecar facts.

#### Scenario: Graph cache is unavailable

- **GIVEN** active raw references and accepted reference bindings exist
- **AND** Citation Graph cache is missing or failed
- **WHEN** related-items sync runs
- **THEN** it SHALL compute source-to-target library edges from active sidecar facts
- **AND** it SHALL NOT rebuild graph cache.

### Requirement: Sidecar-changing actions defer graph refresh

Workflow apply and Reference Sidecar refresh SHALL mark Citation Graph cache stale with bounded delta metadata instead of automatically running Citation Graph refresh.

#### Scenario: Digest apply defers graph refresh

- **WHEN** literature-digest workflow apply updates sidecar facts for one source
- **THEN** `citation-graph:library` SHALL be marked stale with that source ref
- **AND** the apply path SHALL NOT run graph incremental refresh
- **AND** it SHALL NOT bootstrap a missing graph cache.

#### Scenario: Reference Sidecar refresh defers graph refresh

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** `citation-graph:library` SHALL be marked stale with changed source refs and binding canonical ids
- **AND** Reference Sidecar refresh SHALL NOT run graph incremental refresh or full graph bootstrap.

### Requirement: Manual stale graph refresh runs scoped follow-up sync

Manual Citation Graph stale refresh SHALL consume recorded stale delta metadata, refresh affected graph source slices, and then run related-items sync scoped to the final affected source refs.

#### Scenario: Manual stale refresh succeeds

- **GIVEN** `citation-graph:library` is stale with delta diagnostics
- **WHEN** `refreshCitationGraphCacheIncrementalNow` succeeds
- **THEN** graph rows and complex metrics SHALL be refreshed for the affected source refs
- **AND** related-items sync SHALL run only for the final affected source refs.

#### Scenario: Manual stale refresh fails

- **GIVEN** `citation-graph:library` is stale with delta diagnostics
- **WHEN** `refreshCitationGraphCacheIncrementalNow` fails
- **THEN** the graph cache SHALL remain stale or failed with diagnostics
- **AND** related-items sync SHALL NOT run.

### Requirement: Full graph rebuild does not force full related-items sync

Full Citation Graph rebuild SHALL NOT automatically run full-library related-items sync.

#### Scenario: Graph cache rebuild succeeds

- **WHEN** `rebuildCitationGraphCacheNow` completes
- **THEN** graph cache and metrics MAY become ready
- **AND** full-library related-items sync SHALL remain an explicit/debug operation unless a scoped stale related-items delta is available.

### Requirement: Reference sidecar refresh SHALL reconcile stale canonical references

When a reference artifact refresh marks raw references stale for a source, the system SHALL reconcile affected canonicals after the new active raw references for that same source have been written.

#### Scenario: Safe stale canonical has a successor

- **WHEN** an old canonical loses all active raw references for a source
- **AND** the same source now has an active raw reference with a high-confidence successor canonical
- **AND** the old canonical has no binding, redirect, review proposal, or active citation graph participation
- **THEN** the system SHALL write an old-to-new canonical redirect
- **AND** mark the old canonical stale.

#### Scenario: Protected stale canonical needs review

- **WHEN** an old canonical loses active raw evidence
- **AND** it has a binding, redirect, review proposal, or active citation graph participation
- **THEN** the system SHALL NOT automatically modify the canonical
- **AND** SHALL create a Canonical Revision review proposal.

### Requirement: Stale canonical reconciliation SHALL stay source-scoped

Successor matching SHALL only compare against current active raw references from the same sourceRef that caused the stale transition.

#### Scenario: Similar canonical from another source is ignored

- **WHEN** a stale canonical from source A has no active raw references
- **AND** source B has a similar active raw reference
- **THEN** stale canonical reconciliation SHALL NOT use source B as the successor.

### Requirement: Canonical workbench commands SHALL enforce safe canonical boundaries

Revise Canonicals service commands SHALL validate canonical safety before writing redirects, metadata updates, or archive state.

#### Scenario: User applies pending canonical merges

- **WHEN** pending merge requests are applied
- **THEN** the service SHALL validate source and target effective canonicals
- **AND** SHALL reject self merges, redirect cycles, missing canonicals, and unsafe conflicting Zotero bindings
- **AND** successful requests SHALL create accepted canonical revision merge proposals and canonical redirects.

#### Scenario: User edits metadata

- **WHEN** metadata edit is requested for a canonical row
- **THEN** the service SHALL allow edits only for unbound external canonicals
- **AND** SHALL derive normalized title from the submitted title
- **AND** SHALL mark citation graph and related-item projections stale or cascade active graph display metadata as implemented.

#### Scenario: User archives a canonical

- **WHEN** archive is requested
- **THEN** the service SHALL refuse rows with active raw references, bindings, redirects, related proposals, or graph participation
- **AND** SHALL avoid hard deletion.

### Requirement: Citation roles are best-effort sidecar cache data

Synthesis SHALL derive citation graph roles from literature-analysis
`citation_analysis` artifacts only as a best-effort sidecar cache signal.

#### Scenario: Citation analysis function maps to raw reference role

- **GIVEN** a reference sidecar source has a `references` artifact
- **AND** its `citation_analysis` artifact contains `items[].function` values
  allowed by the literature-analysis runtime
- **WHEN** the source is applied or refreshed
- **THEN** the matching raw reference rows SHALL persist normalized role data
- **AND** citation graph edge rows built from those raw references SHALL expose
  those roles through `rolesJson`.

#### Scenario: Citation role cannot be trusted

- **GIVEN** citation analysis is missing, malformed, cannot be aligned to a raw
  reference, or contains a function outside the literature-analysis allowed set
- **WHEN** raw references are persisted
- **THEN** the raw reference role SHALL be normalized to `unknown`.

#### Scenario: Literature-analysis fallback is normalized for Synthesis

- **GIVEN** the literature-analysis runtime emits `uncategorized`
- **WHEN** Synthesis consumes the citation role
- **THEN** Synthesis SHALL store and display the role as `unknown`.

