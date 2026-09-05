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
Workbench SHALL present Citation Graph cache rebuild and Citation Graph layout rebuild as separate operations. Its visible Citation Graph projection SHALL retain library nodes without edges. It SHALL keep an external or unresolved node hidden with fewer than two distinct currently visible library sources and admit it to the default projection only with at least two distinct currently visible library sources. Hidden rows SHALL remain available to graph details and SHALL NOT enter visual or layout topology in any interaction state.

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
- **AND** edges incident to the selected node, the pointer-hovered node, or an explicitly selected edge SHALL be visible only when both endpoints belong to the default projection
- **AND** selected and pointer-hovered neighborhoods SHALL be rendered as a union
- **AND** hovering any visible node while another node is selected SHALL show the hovered node title without changing the selection.

#### Scenario: Selection and pointer hover overlap
- **WHEN** one visible node is selected and the pointer hovers another visible node
- **THEN** Workbench SHALL retain both nodes' eligible default-projection incident edges
- **AND** leaving the pointer-hovered node SHALL remove only its transient edge emphasis
- **AND** the selected node SHALL continue to own the selection drawer
- **AND** neither interaction SHALL change the graph topology.

#### Scenario: A halo node is pointer-hovered
- **WHEN** the pointer hovers a current-paper or importance-halo node
- **THEN** Workbench SHALL draw both its halo and its title.

#### Scenario: Hover remains stable while pages arrive
- **WHEN** a continuation page for the current Graph query arrives while a visible node is hovered
- **THEN** the hovered node title and its incident default-projection edges SHALL remain visible without requiring the pointer to leave and re-enter the node.

#### Scenario: An external node has no visible library source
- **WHEN** an external or unresolved node has no incoming edge from a currently visible library node
- **THEN** Workbench SHALL exclude that node and its edges from the visual and layout projections
- **AND** it SHALL retain the underlying rows for details.

#### Scenario: An external node has one visible library source
- **WHEN** exactly one distinct currently visible library node cites an external or unresolved node
- **THEN** Workbench SHALL exclude that external node and its qualifying edges from the visual and layout projections at rest, on hover, and on selection
- **AND** the source-node details SHALL retain the hidden target and citation evidence.

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
- **THEN** external or unresolved nodes with fewer than two distinct visible library sources SHALL remain absent at rest, on hover, and on selection
- **AND** the fallback SHALL render no edge at rest
- **AND** interaction SHALL reveal only incident edges whose endpoints both belong to the default projection.

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

#### Scenario: Citation Graph selection changes
- **WHEN** a node or edge selection changes without a graph content change
- **THEN** Workbench SHALL update only graph interaction presentation and details
- **AND** it SHALL preserve canvas, camera, controls, and layout-region identity.

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

After active filters and distinct-source visibility projection, Workbench SHALL collapse parallel raw citation records into one directed visual edge per source-target pair while preserving raw records for details. Every visual edge SHALL have both endpoints in the default projection, and hover or selection SHALL NOT add nodes or edges to the visual topology.

#### Scenario: Parallel citation records share endpoints

- **WHEN** multiple filtered citation records have the same source and target
- **THEN** Workbench SHALL render one visual edge whose count is their normalized sum
- **AND** it SHALL preserve the raw records for details.

#### Scenario: A graph node is selected

- **WHEN** Workbench renders the node detail drawer
- **THEN** it SHALL separately report distinct incoming library source papers and incoming citation records for the current loaded view
- **AND** it SHALL include supplemental hidden citation targets without adding them to the visual topology.

### Requirement: Workbench SHALL describe Citation Graph layout activity truthfully

The host SHALL own layout mutations and SHALL coalesce requests for the same graph hash and algorithm. Rendering, hovering, selection, and details interaction SHALL NOT trigger layout mutation. The in-graph layout banner SHALL appear only when the current graph has no usable coordinates; after usable coordinates exist, later layout progress SHALL be non-blocking status feedback while the last usable graph remains interactive.

#### Scenario: Layout state is observed

- **WHEN** a layout is already ready or refreshing for the active graph hash and algorithm
- **THEN** rendering and node selection SHALL NOT start another recomputation.

#### Scenario: Layout state is not running

- **WHEN** layout state is missing, stale, ready, or failed
- **THEN** Workbench SHALL NOT describe it as refreshing.

#### Scenario: Selection arrives after layout is ready

- **WHEN** a selection-only surface update arrives after finite graph coordinates are available
- **THEN** Workbench SHALL preserve the rendered graph
- **AND** it SHALL NOT show or recreate the in-graph layout banner.

#### Scenario: Layout recomputes after usable coordinates exist

- **WHEN** an explicit redraw, query change, or graph data change starts a new layout while usable coordinates remain available
- **THEN** Workbench SHALL keep the last usable graph interactive
- **AND** it SHALL report progress through non-blocking status feedback rather than the in-graph layout banner.

### Requirement: Workbench updates preserve unrelated interaction regions
Workbench SHALL preserve unrelated controls, focus and graph camera when receiving surface or chrome updates. Matching graph continuation pages SHALL accumulate without dropping earlier accepted pages. Stale responses SHALL NOT replace a newer owner or generation.

#### Scenario: Graph continuation arrives during interaction
- **WHEN** multiple current-generation graph pages arrive while a node is hovered
- **THEN** all accepted graph rows remain available and the camera and hover remain stable
- **AND** unrelated chrome controls retain their DOM identity.

### Requirement: Large topic and index lists have bounded rendered windows
Topics and Index SHALL keep mounted rows proportional to the viewport and bounded overscan, while preserving selection by business identity and keyboard focus.

#### Scenario: User scrolls through a large collection
- **WHEN** the user scrolls from the beginning to distant rows
- **THEN** rows outside the rendered window leave the DOM
- **AND** selected items remain selected and filtering operates on the full supplied collection.

### Requirement: Offline exports retain independent interaction
Standalone graph and topic exports SHALL render their supplied envelopes without requiring a live host and SHALL preserve local graph, reader and navigation interactions.

#### Scenario: Export opens without Zotero
- **WHEN** a user opens an exported topic or embedded graph with no host bridge
- **THEN** its local navigation, graph selection and report content remain usable
- **AND** local interactions do not attempt host maintenance.

### Requirement: Workbench uses independent Preact region composition

Workbench SHALL build its hosted page from a thin entry and TypeScript/TSX modules under `src/synthesis`, with stable containers, projections and independently memoized Preact regions. The complete Shell/Chrome, Home, Topics, Concepts, Graph, Registry, Tags, Review Center and Reader surfaces SHALL replace the monolithic page renderer.

#### Scenario: User opens a Workbench surface

- **WHEN** the user navigates to any of the seven tabs or Reader
- **THEN** its component SHALL expose the existing surface actions and content
- **AND** loading, empty and error states SHALL remain explicit rather than replacing the business implementation.

### Requirement: Workbench preserves portable message and refresh boundaries

Workbench SHALL consume shared portable snapshot, surface and message DTOs and use the shared action/payload mapping at transport boundaries. The migration SHALL preserve host message names, payload semantics and shell/chrome/surface refresh ownership.

#### Scenario: A hidden surface response arrives

- **WHEN** the host delivers data for a nonvisible surface
- **THEN** the page SHALL update that surface's owned state without repainting unrelated visible content.

#### Scenario: A stale response arrives

- **WHEN** a response belongs to an older accepted request or graph generation
- **THEN** it SHALL NOT replace the current newer owner state.

### Requirement: Graph retains its imperative surface and interaction channel

Graph SHALL own a persistent Sigma surface, vendor injection, camera and lifecycle cleanup. Matching graph/query-basis continuation pages SHALL merge by row identity; new owners SHALL replace their accumulated window. Hover/selection-only updates SHALL avoid topology reconstruction.

#### Scenario: Chrome or tab visibility changes after Graph mounts

- **WHEN** unrelated chrome changes or the graph is temporarily inactive
- **THEN** the mounted graph surface and camera SHALL remain available for return to that owner
- **AND** final disposal SHALL release graph-owned resources.

### Requirement: Reader and localization use shared bounded content rendering

Workbench SHALL resolve i18n message keys during projection/rendering and SHALL use the shared synthesis Markdown sanitize profile and topic timeline renderer. It SHALL preserve Reader sections, evidence exploration, report actions and digest loading/results without whole-DOM reverse translation.

#### Scenario: A report or digest updates

- **WHEN** the current Reader receives new report content or a digest result
- **THEN** its owned content region SHALL update using shared rendering rules
- **AND** unrelated page controls SHALL retain identity.

### Requirement: Hosted and offline Workbench builds have separate composition

Hosted Workbench, standalone topic export and deep-reading graph export SHALL use separate entries. Offline entries SHALL import only their required graph/reader modules and local interactions, preserve usable export layouts, and keep their consumer asset paths stable. Source and built-in graph templates SHALL be synchronized.

#### Scenario: An offline artifact loads without a host

- **WHEN** a topic export or embedded graph initializes from its supplied envelope
- **THEN** it SHALL render at the available content width using its export layout
- **AND** it SHALL NOT need the complete hosted renderer or a live host bridge.

### Requirement: Migration regression preserves surface parity and rendering evidence

Workbench migration SHALL retain the semantics of existing surface parity gates and diagnostic release-elision checks. Page regression SHALL exercise actual bootstrap, region identity, graph interactions and bounded lists; deleted-page source assertions SHALL be migrated without discarding applicable host semantics.

#### Scenario: Migration acceptance is evaluated

- **WHEN** build, type, component, browser and parity checks are recorded
- **THEN** each result SHALL distinguish passes, failures and unavailable runtime/fixture checks
- **AND** source or parity checks alone SHALL NOT substitute for interaction evidence.
