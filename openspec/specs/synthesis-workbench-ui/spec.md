# synthesis-workbench-ui Specification

## Purpose
Synthesis Workbench presents sidecar cache state, explicit operations, and review queues.

## Requirements
### Requirement: Synthesis Index displays four artifact states and separate rating

The Index SHALL display one availability icon for each paper artifact and a separate numeric-score-derived Rating column.

#### Scenario: Four artifacts are available
- **WHEN** digest, references, citation analysis, and literature score are available
- **THEN** the artifact cell SHALL show four available icons
- **AND** Analyze SHALL be disabled.

#### Scenario: Only score is unavailable
- **WHEN** the three analysis artifacts are available and literature score is missing or invalid
- **THEN** Analyze SHALL execute literature-analysis score-only mode without exposing that mode as a user option.

#### Scenario: Analysis artifact is unavailable
- **WHEN** any digest, references, or citation-analysis artifact is unavailable
- **THEN** Analyze SHALL execute full analysis.

### Requirement: Workbench presents cache state and explicit operations
Synthesis Workbench SHALL present sidecar cache status, explicit operation rows, and bounded review queues instead of background synchronization queues.

#### Scenario: Cache is stale
- **WHEN** reference or graph cache status is stale
- **THEN** Workbench SHALL label it as stale cache
- **AND** it SHALL offer an explicit refresh action without implying Zotero Library is stale.

### Requirement: Workbench reads do not start maintenance
Workbench snapshot reads SHALL NOT start cache refresh, startup reconcile, worker drain, or sidecar mutation.

#### Scenario: User opens Workbench
- **WHEN** Workbench builds the initial snapshot
- **THEN** it SHALL read current sidecar rows and direct source-check summaries only
- **AND** it SHALL NOT enqueue or start maintenance work.

### Requirement: Reference refresh progress uses real stage counts
Workbench SHALL present reference sidecar refresh progress from real stage counts or as indeterminate when totals are not known.

#### Scenario: Reference sidecar refresh runs
- **WHEN** refresh has discovered artifact scan or changed-reference totals
- **THEN** Workbench SHALL show determinate progress for scanned sources, changed artifacts, extracted raw references, canonical matches, or binding candidates
- **AND** it SHALL NOT display an invented percent for a long stage with unknown total.

### Requirement: Workbench separates graph data rebuild from layout rebuild
Workbench SHALL present Citation Graph cache rebuild and Citation Graph layout rebuild as separate operations. Its visible Citation Graph projection SHALL retain library nodes without edges. It SHALL keep an external or unresolved node hidden with no currently visible library source, expose it only through the source's hover neighborhood with one distinct currently visible library source, and admit it to the default projection only with at least two distinct currently visible library sources.

#### Scenario: Graph cache is missing
- **WHEN** Graph tab has missing graph cache basis
- **THEN** the primary action SHALL run `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run `manualRecomputeLayout`.

#### Scenario: Stale graph rows remain usable
- **WHEN** Graph tab has a stale graph cache basis
- **AND** cached graph rows are still available
- **THEN** Workbench SHALL render the latest usable graph with a cache diagnostic
- **AND** it SHALL offer `refreshCitationGraphCacheIncrementalNow` when stale delta metadata is available
- **AND** it SHALL NOT replace the graph with the no-data state.

#### Scenario: Graph search is explicit
- **WHEN** a user types in the Graph search control
- **THEN** Workbench SHALL NOT refresh Graph filters until Search is submitted
- **AND** Clear SHALL reset Graph search immediately.

#### Scenario: Graph direction and hover labels are visible
- **WHEN** Citation Graph edges are rendered
- **THEN** Workbench SHALL use directed edge rendering and target-tinted edge color
- **AND** every edge SHALL remain hidden without hover or selection
- **AND** edges incident to the selected node, the pointer-hovered node, or an explicitly selected edge SHALL be visible
- **AND** selected and pointer-hovered neighborhoods SHALL be rendered as a union
- **AND** hovering any visible node while another node is selected SHALL show the hovered node title without changing the selection.

#### Scenario: Selection and pointer hover overlap
- **WHEN** one node is selected and the pointer hovers another node
- **THEN** Workbench SHALL retain both nodes' eligible one-source neighborhoods and incident edges
- **AND** leaving the pointer-hovered node SHALL remove only its transient neighborhood
- **AND** the selected node SHALL continue to own the selection drawer.

#### Scenario: A halo node is pointer-hovered
- **WHEN** the pointer hovers a current-paper or importance-halo node
- **THEN** Workbench SHALL draw both its halo and its title.

#### Scenario: Hover remains stable while pages arrive
- **WHEN** a continuation page for the current Graph query arrives while a visible node is hovered
- **THEN** the hovered node title and its incident edges SHALL remain visible without requiring the pointer to leave and re-enter the node.

#### Scenario: An external node has no visible library source
- **WHEN** an external or unresolved node has no incoming edge from a currently visible library node
- **THEN** Workbench SHALL exclude that node and its edges from both the default and hover-only projections.

#### Scenario: An external node has one visible library source
- **WHEN** exactly one distinct currently visible library node cites an external or unresolved node
- **THEN** Workbench SHALL exclude that external node from the default projection
- **AND** it SHALL materialize the node and its qualifying edge only while the visible library source is hovered or selected.

#### Scenario: An external node has two visible library sources
- **WHEN** at least two distinct currently visible library nodes cite an external or unresolved node
- **THEN** Workbench SHALL retain that external node in the default projection
- **AND** it SHALL retain every qualifying incoming edge from those visible library sources
- **AND** those retained edges SHALL remain interaction-scoped
- **AND** repeated mentions or parallel evidence from one library source SHALL NOT increase the distinct-source count.

#### Scenario: A library node has no visible edge
- **WHEN** a library node has no edge under the current visible projection
- **THEN** Workbench SHALL retain the library node.

#### Scenario: SVG fallback applies the shared projection
- **WHEN** the constrained standalone renderer uses its SVG fallback
- **THEN** zero-source external nodes SHALL be omitted and one-source external nodes SHALL be absent at rest
- **AND** hovering a visible library source SHALL temporarily materialize only its eligible one-source neighbors and incident edges
- **AND** the fallback SHALL render no edge at rest.

#### Scenario: Graph cache is ready but layout is missing
- **WHEN** graph data exists but layout coordinates are missing or dirty
- **THEN** the primary action MAY run `manualRecomputeLayout`
- **AND** it SHALL NOT imply graph data refresh.

### Requirement: Workbench background jobs come from explicit operations
Workbench SHALL show Reference Sidecar and Citation Graph cache jobs from active or recent failed operation rows only.

#### Scenario: Sidecar cache is ready after previous failure
- **WHEN** a previous failed operation row or legacy state file exists
- **AND** the cache basis is ready after a later successful refresh
- **THEN** Workbench SHALL NOT show a failed `Reference sidecar refresh` background job.

### Requirement: Index exposes only minimal sidecar states
Workbench Index SHALL expose artifact coverage and reference binding state without legacy Registry readiness or reference-resolution filters.

#### Scenario: Index filters are rendered
- **WHEN** the Index page is rendered
- **THEN** filters SHALL include scope, artifact coverage, missing artifact, and binding status
- **AND** filters SHALL NOT include legacy `literature_status`, `readiness`, or `resolution_status` states.

### Requirement: Index exposes Advanced Matching review
Workbench Index SHALL include an Advanced Matching review subview for explicit matcher proposals.

#### Scenario: User opens Advanced Matching
- **WHEN** the user switches to the Advanced Matching subview
- **THEN** Workbench SHALL show run/retry actions, operation progress, proposal counts, and proposal filters.

#### Scenario: Proposal row is rendered
- **WHEN** an open reference match proposal is listed
- **THEN** Workbench SHALL show source reference, target, confidence, score or reasons, and Accept/Reject actions.

### Requirement: Advanced matching command is protected
Advanced matching SHALL be a user-confirmed long-running command.

#### Scenario: User starts advanced matching
- **WHEN** the user clicks Run Advanced Matching
- **THEN** Workbench SHALL show a confirmation explaining that the matcher may be slower than refresh
- **AND** the command SHALL start after a busy snapshot has had a chance to render.

### Requirement: Workbench UI renders stable surface containers
Synthesis Workbench UI SHALL keep stable containers for each surface and update only the affected container for surface-local changes.

#### Scenario: Local review decision is queued
- **WHEN** the user queues or cancels a reference review decision
- **THEN** only Review/Index review surfaces and chrome MAY update
- **AND** the Workbench SHALL NOT rebuild the whole DOM.

#### Scenario: Shell-level navigation changes
- **WHEN** the selected top-level tab changes
- **THEN** shell navigation MAY update
- **AND** already mounted unrelated surface containers SHALL NOT be rebuilt because of data refresh elsewhere.

### Requirement: Workbench surfaces expose loading and error states
Each Workbench surface SHALL expose loading, ready, stale, and error states independently.

#### Scenario: Surface read fails
- **WHEN** a surface read fails
- **THEN** the host SHALL send a surface error for that surface
- **AND** other surfaces and chrome SHALL remain usable.

### Requirement: Workbench Review SHALL Render Cluster Canonical Merge Evidence
Workbench review surfaces SHALL continue to use the current proposal model and
SHALL display cluster evidence for canonical merge proposals.

#### Scenario: User reviews canonical merge
- **WHEN** Workbench renders a cluster-derived `canonical_merge` proposal
- **THEN** it SHALL prioritize readable source/target titles and edge/risk
  evidence over internal canonical ids.

### Requirement: Review Center displays reference match proposals
Workbench Review Center SHALL display both Zotero binding and canonical merge proposals.

#### Scenario: Canonical merge proposal is rendered
- **WHEN** Workbench renders a `canonical_merge` proposal
- **THEN** it SHALL show readable source and target reference titles, confidence, score, and reasons
- **AND** it SHALL provide Accept and Reject actions.

### Requirement: Workbench presents semantic conflict approvals

Workbench SHALL present semantic conflict approvals for the visible sync transport only.

#### Scenario: WebDAV conflict is blocked

- **WHEN** WebDAV Sync state is `blocked_conflict`
- **THEN** Workbench SHALL show the conflict asset path, reason, and available hashes
- **AND** it SHALL offer supported conflict actions from the WebDAV Sync state.

### Requirement: Workbench exposes manual WebDAV Sync


Workbench SHALL show WebDAV Sync runtime status and a manual Sync now action
when WebDAV Sync is configured.

#### Scenario: WebDAV Sync is not configured

- **WHEN** WebDAV Sync preferences are incomplete
- **THEN** Workbench SHALL show the configuration status and offer Preferences
  as the setup path.

#### Scenario: User triggers WebDAV Sync

- **WHEN** the user clicks WebDAV Sync now
- **THEN** Workbench SHALL route the WebDAV command through the Synthesis client.

### Requirement: Workbench consolidates visible sync feedback

Synthesis Home SHALL present WebDAV Sync status, actions, diagnostics, and execution feedback in one Sync section.

#### Scenario: Sync action feedback is available

- **WHEN** a WebDAV Sync command is in flight, completed, failed, or has diagnostics
- **THEN** the Home Sync section SHALL render a terminal-style feedback area with compact log lines.

#### Scenario: Home insights render

- **WHEN** Synthesis Home renders Library Insights
- **THEN** it SHALL NOT render a separate Sync insight card outside the Sync section.

#### Scenario: Home shows review item count

- **WHEN** the Home Library Insights section is rendered
- **THEN** it SHALL show a Review items card using snapshot review summary data
- **AND** the count SHALL NOT require opening the Review tab first.

#### Scenario: Sync section is compact

- **WHEN** the Home Sync section is rendered
- **THEN** it SHALL use a compact WebDAV summary row rather than insight cards.

### Requirement: Synthesis Index SHALL display literature ratings

The Synthesis Index SHALL project and render literature ratings for parent
paper rows without exposing the internal score-only parameter.

#### Scenario: Parent paper has a valid score

- **WHEN** an Index parent row is rendered
- **THEN** it SHALL display the same five-star rating as the Zotero library
- **AND** an expanded reference child row SHALL preserve table alignment with an
  empty rating cell.

#### Scenario: Legacy triplet needs a score

- **WHEN** the parent row's literature-analysis mode is `score-only`
- **THEN** the Analyze action SHALL remain enabled
- **AND** the UI SHALL NOT expose a score-only option.

#### Scenario: All four outputs exist

- **WHEN** the parent row's mode is `unavailable`
- **THEN** the Analyze action SHALL be disabled.

### Requirement: Workbench SHALL render a bounded, endpoint-closed Citation Graph interaction topology

After active filters and distinct-source visibility projection, Workbench SHALL collapse parallel raw citation records into one directed visual edge per source-target pair while preserving raw records for details. A selected or pointer-hovered owner SHALL materialize at most 100 deterministically ranked interaction-only neighbors with screen-relative separation from the owner.

#### Scenario: Parallel citation records share endpoints

- **WHEN** multiple filtered citation records have the same source and target
- **THEN** Workbench SHALL render one visual edge whose count is their normalized sum
- **AND** it SHALL NOT leave an interaction-only node visible without an incident visual edge.

#### Scenario: A graph node is selected

- **WHEN** Workbench renders the node detail drawer
- **THEN** it SHALL separately report distinct incoming library source papers and incoming citation records for the current loaded view.

### Requirement: Workbench SHALL describe Citation Graph layout activity truthfully

The host SHALL own layout mutations and SHALL coalesce requests for the same graph hash and algorithm. Rendering and node selection SHALL NOT trigger layout mutation.

#### Scenario: Layout state is not running

- **WHEN** layout state is missing, stale, ready, or failed
- **THEN** Workbench SHALL NOT describe it as refreshing.
