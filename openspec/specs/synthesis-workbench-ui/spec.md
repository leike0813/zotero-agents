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

#### Scenario: Home visible runtime data changes

- **WHEN** localized runtime status or index task progress visible on Home changes
- **THEN** only the Home subregion whose visible data changed SHALL update
- **AND** hidden diagnostics, log details, and Preferences configuration SHALL NOT enter the Home render signature
- **AND** unrelated Home regions and other Workbench managed regions SHALL retain their DOM identity.

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

Workbench SHALL present semantic conflict approvals for the visible sync transport only. Home SHALL expose a blocked WebDAV Sync as localized conflict status and a `Resolve conflicts` action; the conflict details and actions SHALL remain in a page-local dialog.

#### Scenario: WebDAV conflict is blocked

- **WHEN** WebDAV Sync state is `blocked_conflict`
- **THEN** Home SHALL show localized conflict status and `Resolve conflicts`
- **AND** it SHALL NOT show the asset, reason, hashes, or conflict actions outside the dialog.

#### Scenario: User opens conflict resolution

- **WHEN** the user activates `Resolve conflicts`
- **THEN** Workbench SHALL open a page-local native dialog with the existing conflict asset, reason, base/local/remote hashes, and service-provided conflict actions
- **AND** it SHALL enable only actions permitted by the service projection
- **AND** closing the dialog or pressing Escape SHALL return focus to `Resolve conflicts`
- **AND** the dialog SHALL close automatically when refreshed service state no longer reports a conflict
- **AND** existing Host authorization and permission semantics SHALL remain unchanged.

### Requirement: Workbench exposes manual WebDAV Sync

Workbench SHALL show localized WebDAV Sync runtime status and only the runtime
actions permitted by the service projection. It SHALL preserve the existing
`syncWebDavNow`, `pauseWebDavSync`, `resumeWebDavSync`, and
`retryWebDavSync` Host commands and their permission gates. Sync
configuration SHALL be edited in Zotero Preferences.

#### Scenario: WebDAV Sync is not configured

- **WHEN** WebDAV Sync preferences are incomplete
- **THEN** Workbench SHALL show a localized not-ready runtime status
- **AND** the Home-wide Preferences entry SHALL remain available as the setup path.

#### Scenario: User triggers WebDAV Sync

- **WHEN** the user clicks WebDAV Sync now
- **THEN** Workbench SHALL route the WebDAV command through the Synthesis client.

#### Scenario: WebDAV Sync is idle

- **WHEN** WebDAV Sync has no active or failed runtime work
- **THEN** Workbench SHALL label the status Ready
- **AND** it SHALL NOT label the status Synced.

### Requirement: Synthesis Home SHALL present a focused runtime overview

Synthesis Home SHALL present, in order, a Library Overview with four compact
metrics, the Sync and Semantic Retrieval panels, and Focused Topics. The four
metrics SHALL be registered papers, generated synthesis topics, graph size
(nodes and edges), and open review items. The two service panels SHALL sit side
by side on wide viewports and stack at narrow widths. Metric values SHALL use
the accepted Home surface snapshot or already-loaded domain arrays and SHALL
NOT require opening another Workbench tab.

The Sync and Semantic Retrieval panels SHALL show only localized runtime status,
current index-task progress, missing and failed counts, and permitted actions.
They SHALL NOT show service addresses or paths, model identifiers or dimensions,
publication identifiers, timestamps, raw diagnostics, logs, or expandable
runtime details. Hidden diagnostic and log content and Preferences
configuration SHALL NOT enter the Home render signature.

Synthesis Home SHALL expose one always-visible Preferences entry shared by both
service panels. Connection, endpoint, model, scope, retry-policy, and credential
editing SHALL belong to Zotero Preferences.

State reads and retrieval configuration saves SHALL NOT start index work.

#### Scenario: Home sections render

- **WHEN** Synthesis Home renders
- **THEN** Library Overview, the Sync and Semantic Retrieval panels, and Focused Topics SHALL appear in that order
- **AND** the service panels SHALL use the approved wide or narrow layout for the available width.

#### Scenario: Runtime details stay hidden

- **WHEN** the selected snapshot contains service addresses, paths, models, dimensions, publication identifiers, timestamps, raw diagnostics, or logs
- **THEN** Home SHALL NOT render those details or provide an expandable details control.

#### Scenario: Preferences entry is available

- **WHEN** Home renders with any Sync or Semantic Retrieval configuration state
- **THEN** one shared Preferences entry SHALL remain visible
- **AND** activating it SHALL open Zotero Preferences.

#### Scenario: Focused Topics stay bounded

- **WHEN** Home renders Focused Topics
- **THEN** it SHALL retain the existing paper-count, update-time, and title ordering
- **AND** it SHALL render at most eight topics.

### Requirement: Synthesis Index SHALL display literature ratings

The Synthesis Index SHALL project and render literature ratings for parent
paper rows without exposing the internal score-only parameter.

#### Scenario: Parent paper has a valid score

- **WHEN** an Index parent row is rendered
- **THEN** it SHALL display the same five-star rating as the Zotero library
- **AND** both projections SHALL read artifact existence and score from the Host Broker readiness owner
- **AND** Index SHALL NOT perform an artifact scan or managed-note payload read
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

#### Scenario: Workbench document is closed after Graph was opened

- **WHEN** the host disposes the Workbench browser and its Graph document
- **THEN** Graph SHALL cancel listeners, observers, animation frames, and timers before browser removal
- **AND** it SHALL dispose the Sigma renderer and its WebGL resources through normal renderer teardown
- **AND** the owning browser/docshell SHALL complete canvas and document disposal
- **AND** on Windows the process lifetime protection SHALL remain in effect throughout delayed native graphics destruction.

### Requirement: Windows hosted graph resources retain their executable module lifetime

Before a hosted Synthesis document can create graphics resources in Windows Zotero, the host SHALL ensure the D3D11 code image remains resident until process termination. That lifetime SHALL survive disposal of tabs, windows and plugin JavaScript owners, while temporary resources acquired solely to establish the protection SHALL be released.

#### Scenario: A Windows Synthesis document is opened

- **WHEN** Windows Zotero opens an embedded Synthesis document or a dedicated Synthesis tab
- **THEN** the native module lifetime protection SHALL succeed before that document can create graph graphics resources
- **AND** D3D11 SHALL remain resident while later native graphics destruction returns through its code.

#### Scenario: The plugin JavaScript owner is disposed

- **GIVEN** the process has successfully established D3D11 lifetime protection
- **WHEN** a tab, window or plugin JavaScript owner is disposed while Zotero continues running
- **THEN** the protected code image SHALL remain resident until process termination
- **AND** graph-owned GPU and document resources SHALL still follow their normal disposal lifecycle.

#### Scenario: Synthesis documents are opened repeatedly

- **WHEN** the same process opens and disposes multiple Synthesis documents
- **THEN** every document SHALL receive the same process lifetime guarantee
- **AND** each protection attempt SHALL release its temporary acquisition resources.

#### Scenario: Native protection initialization fails

- **WHEN** native lifetime protection cannot be established
- **THEN** the host SHALL fail document creation and release resources acquired for that attempt
- **AND** existing embedded content SHALL remain intact
- **AND** a dedicated-tab opening SHALL NOT leave an empty tab
- **AND** a later opening SHALL be able to retry initialization.

#### Scenario: Synthesis is opened on another platform

- **WHEN** the host platform is not Windows
- **THEN** Synthesis SHALL retain its normal rendering and disposal behavior
- **AND** opening it SHALL NOT invoke Windows native module operations.

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

### Requirement: Topic Report SHALL preserve its first rendered content

The Reader SHALL give its component tree stable ownership of the Topic Report frame, outline slot, and scroll-body slot. Imperative Markdown rendering SHALL be confined to descendants of those slots and SHALL rebuild only when report content semantics change. Unrelated Reader updates SHALL retain the report body, outline, actions, and scroll-container identity from the first open.

#### Scenario: Unrelated Reader state changes after first report open

- **WHEN** the user opens the first Topic Report in a plugin session and the Reader subsequently receives the same report with unrelated pending-command or chrome state changes
- **THEN** the visible Markdown body and outline SHALL remain present
- **AND** the report frame and scroll-body DOM identities SHALL remain unchanged
- **AND** the report body SHALL remain scrollable below the toolbar.

### Requirement: Hosted Workbench assets SHALL advance as one revision

The hosted Workbench document, its page stylesheet, and its application bundle SHALL carry the same non-empty UI revision whenever their coordinated rendering behavior changes.

#### Scenario: A same-version plugin build updates Topic Report rendering

- **WHEN** Zotero opens the Workbench after installing a build with updated Report code or layout
- **THEN** the document SHALL request the matching revised stylesheet and application bundle
- **AND** the first Topic Report SHALL display its body, outline, actions, and scrollable layout without requiring a second open.

### Requirement: Workbench SHALL use the shared page-chrome layer

Synthesis Workbench SHALL take its control, text-scale, spacing and status-badge
tokens, and its panel header, back entry, empty-state and badge patterns, from
the shared page-chrome layer loaded by both page documents. It SHALL NOT keep a
Workbench-private duplicate of those tokens, and its status chips SHALL keep
their semantic variant colors in both themes.

Home overview, service, and Focused Topics cards SHALL use the shared neutral
card treatment and shared page-chrome tokens.

#### Scenario: Workbench renders a status chip

- **WHEN** a Workbench surface renders a badge or status chip in light or dark
  theme
- **THEN** the chip SHALL use a shared semantic variant
- **AND** its colors SHALL NOT be hardcoded outside the shared token definitions.

#### Scenario: A shared token changes

- **WHEN** a control, text-scale, spacing or badge token changes in the shared
  page-chrome layer
- **THEN** Workbench controls and status chips SHALL pick up the change without
  editing a Workbench-private palette.

### Requirement: Workbench surfaces SHALL own one primary content scroll region

The Workbench page root and its main container SHALL NOT scroll. Every surface
SHALL fix its header, filter rows, summary bars and pagination zones outside
scrolling and SHALL expose one primary content scroll region for its primary
content: the Home surface uses the shared `.zs-scroll-region` utility, and a
surface's own table wrapper (such as the Concepts or Tags table wrap) MAY act
as that region under the same model. Secondary bounded sub-panels such as the
inline concept review panel (bounded to 42% of the surface height) or the tag
import popover (45%) MAY keep their own bounded scroll area, but they SHALL
NOT carry primary content, and the primary content SHALL be reachable through
the surface content region rather than a fixed-height nested box.

#### Scenario: Home surface is taller than the viewport

- **WHEN** the Home surface renders more sections than fit the available height
- **THEN** the page and main container SHALL NOT scroll
- **AND** the Home content SHALL scroll inside its own content region.

#### Scenario: Concepts table rows do not fill the grid

- **WHEN** the Concepts surface renders fewer or more rows than its grid tracks
  expect
- **THEN** the table wrapper SHALL size to the surface content region without
  clipping rows
- **AND** the table SHALL scroll as the surface content region, with the review
  panel remaining a bounded secondary area.

#### Scenario: Tags table has a sticky header

- **WHEN** the user scrolls the Tags table
- **THEN** its sticky header SHALL stay pinned inside the table's scroll
  container rather than scrolling out of view.

### Requirement: Workbench secondary views SHALL keep their originating context

Workbench secondary views SHALL render their back entry as the first element of
the shared panel header. While the Reader is open, the sidebar SHALL keep the
tab the Reader was opened from highlighted, and the back entry SHALL return to
that tab.

#### Scenario: User opens the Reader from a tab

- **WHEN** the user opens the Artifact Reader from a Workbench tab
- **THEN** the Reader's back entry SHALL be the first element of its panel
  header
- **AND** the sidebar SHALL keep the originating tab highlighted.

#### Scenario: User returns from a secondary view

- **WHEN** the user activates the back entry of Topic Details or the Artifact
  Reader
- **THEN** the Workbench SHALL return to the tab the view was opened from.

### Requirement: Workbench review areas show only open work

The Topics graph relation review area SHALL list only still-open work: `suggested`
topic graph edges and `open` review items. The Review Center status filter SHALL
apply the same terminal semantics.

#### Scenario: Topics relation review area drops terminal entries

- **WHEN** a topic graph edge is `confirmed` or `rejected`, or a review item is
  `approved` or `rejected`
- **THEN** the Topics graph relation review area SHALL NOT list that entry.

#### Scenario: Review Center Open filter excludes terminal entries

- **WHEN** the Review Center topic graph status filter is `open`
- **THEN** confirmed or rejected edges and approved or rejected review items
  SHALL NOT appear.

#### Scenario: Review Center Accepted and All keep terminal entries

- **WHEN** the Review Center topic graph status filter is `accepted` or `all`
- **THEN** confirmed edges and approved review items SHALL remain visible.

### Requirement: Workbench SHALL bound concept alias lists

The Concepts surface SHALL render at most three alias chips per row and SHALL
summarize further aliases in a single overflow chip that exposes the complete
hidden list.

#### Scenario: A concept has more than three aliases

- **WHEN** a concept row carries more than three aliases
- **THEN** the row SHALL render the first three aliases followed by one `+N`
  overflow chip
- **AND** the overflow chip SHALL expose every hidden alias on hover.

#### Scenario: A concept has three or fewer aliases

- **WHEN** a concept row carries three or fewer aliases
- **THEN** the row SHALL render them all
- **AND** no overflow chip SHALL be rendered.

#### Scenario: Concepts table keeps its layout

- **WHEN** alias chips are bounded
- **THEN** the alias column SHALL NOT grow the row height or push the row
  actions out of the table.

### Requirement: Topic Detail SHALL present actionable discovery candidates

The Workbench Reader/Topic Detail region SHALL present open discovery candidates and separately expose rejected candidates that can be restored. Candidate rows SHALL use the public title when present and fall back to literature identity, SHALL show available bounded evidence metadata, and SHALL dispatch the existing reject or restore Topic command with the candidate hint identity.

#### Scenario: Open discovery candidates are available

- **WHEN** the user opens Topic Detail with open candidates
- **THEN** the discovery section lists at most 20 candidates with Reject actions
- **AND** missing titles fall back to the literature identity without fabricating an empty title

#### Scenario: Rejected discovery candidates are available

- **WHEN** the user views rejected candidates in Topic Detail
- **THEN** each candidate offers Restore through the existing Topic command path

#### Scenario: Discovery command settles

- **WHEN** a reject or restore command finishes and the selected Topic surface refreshes
- **THEN** the Reader reflects the new candidate status without requiring a separate endpoint or local shadow state

### Requirement: Home SHALL keep index maintenance explicit and availability independent

Home SHALL expose the existing `retrievalBuildIndex`,
`retrievalUpdateIndex`, `retrievalRebuildIndex`,
`retrievalCancelIndex`, `retrievalRetryIndex`,
`retrievalContinueIndex`, and `retrievalCleanupIndex` Host
commands with their existing permission gates. The Host SHALL remain
authoritative for pending identity and scope, publication, and source-group
atomic index state. Home SHALL present those facts only as localized
availability, progress, coverage counts, and actions.

Index availability and maintenance status SHALL be independent. A failed
update SHALL NOT by itself mark a previously usable published index as
unavailable. Availability SHALL follow the actual published or suspended index
state. Missing and failed coverage counts SHALL remain separate from index
availability.

#### Scenario: State is read or configuration is saved

- **WHEN** Home reads index state or Preferences saves index configuration
- **THEN** it SHALL NOT enqueue, resume, rebuild, update, or clean up index work.

#### Scenario: Existing index update fails

- **WHEN** an update fails while a previously published index remains usable
- **THEN** Home SHALL continue to label the index as available
- **AND** it SHALL report the maintenance failure separately.

#### Scenario: Index progress changes

- **WHEN** an index operation updates its visible progress
- **THEN** only the indexing progress region SHALL update
- **AND** the library overview, Sync panel, Preferences entry, Focused Topics, and unrelated Workbench regions SHALL retain DOM identity.

### Requirement: Synthesis embedding Preferences SHALL manage saved connections through drafts

Synthesis embedding Preferences SHALL list saved connections and edit one connection in a draft with create, edit, delete, primary selection, and ordered fallback controls. Saving SHALL persist only explicit edits, preserve the current retrieval scope, and SHALL NOT enable, test, activate, or start index work. A preset SHALL fill only a new unsaved draft and SHALL NOT start network work, save, establish a primary/fallback selection, enable, test, activate, or index a connection.

#### Scenario: User selects a preset

- **WHEN** the user selects any of the OpenAI, Ollama, TEI, Cohere, Voyage, or Gemini protocol templates; the LM Studio, vLLM, Xinference, Azure OpenAI, or Jina provider presets; or the `qwen3-embedding:0.6b` or `qwen3-embedding:4b` local templates
- **THEN** a new unsaved draft is filled with the provider's correct name and compatible starting values
- **AND** no request, save, primary/fallback selection, enable, test, activation, or index operation starts
- **AND** no private-network example is inserted

#### Scenario: User creates or edits a connection

- **WHEN** the user saves a valid connection draft
- **THEN** only that explicit connection edit persists
- **AND** the selected protocol, raw model identifier, and other user edits remain visible after refresh

#### Scenario: User changes connection order

- **WHEN** the user selects one primary and orders distinct fallbacks
- **THEN** saving persists that explicit order

#### Scenario: User deletes a saved connection

- **WHEN** the user deletes a saved connection
- **THEN** that connection and its encrypted credential are removed
- **AND** the primary becomes unset when the deleted connection was primary
- **AND** the deleted connection is removed from fallbacks while every other fallback retains its relative order

#### Scenario: Explicit selection is invalid

- **WHEN** an explicit primary or fallback selection references an unknown, deleted, or duplicate connection, or selects the primary as its own fallback
- **THEN** saving rejects the selection and retains the existing saved selection

#### Scenario: Connection save completes

- **WHEN** a connection draft is saved
- **THEN** retrieval scope and the existing published index remain unchanged
- **AND** no activation, probe, discovery, or index operation starts

### Requirement: Synthesis embedding Preferences SHALL expose complete connection fields

Preferences SHALL expose protocol, endpoint, model, discovery, authentication, encoding parameters, prefixes, dimensions, encrypted write-only credentials, and scope. Invalid JSON SHALL remain editable. Discovery hints SHALL not set requested output dimensions; a synthetic probe SHALL establish actual dimensions.

#### Scenario: User chooses a protocol

- **WHEN** the user selects OpenAI, Ollama, TEI, Cohere, Voyage, or Gemini
- **THEN** Preferences presents that protocol's supported endpoint, authentication, parameter, discovery, and model controls
- **AND** unsupported generic discovery remains manual

#### Scenario: Parameter JSON is invalid

- **WHEN** a common, query, or document parameter entry is malformed or attempts to override an adapter-owned field
- **THEN** the affected field reports a validation error
- **AND** the draft and all other connection values remain intact

#### Scenario: A credential is configured

- **WHEN** a credential has been saved
- **THEN** Preferences may show only configured state or update metadata and SHALL NOT render the secret value

#### Scenario: Discovery reports a dimensional hint

- **WHEN** discovery or Ollama `show` metadata includes a model dimension
- **THEN** Preferences leaves the output-dimension control unchanged
- **AND** the actual dimension appears only after an explicit synthetic probe

#### Scenario: User selects named-header authentication

- **WHEN** authentication type is set to `header`
- **THEN** Preferences requires a safe header name
- **AND** changing away from `header` does not expose or persist the credential in visible configuration

### Requirement: Synthesis embedding model discovery SHALL be explicit and draft-scoped

Model discovery SHALL start only from an explicit user action and SHALL use the active unsaved draft and available credential. OpenAI, Ollama, TEI, Cohere, and Gemini shall expose only catalog-returned model identifiers. Completed results and explicit partial-results state SHALL remain visible; canceling, dropping, replacing the owner, or a late response SHALL apply nothing to a current or other draft; a discovery failure SHALL retain every field already entered.

#### Scenario: Preferences open or fields change

- **WHEN** the Preferences page opens, a preset fills a draft, or a connection field changes
- **THEN** no model discovery request starts

#### Scenario: Discovery returns partial results

- **WHEN** an explicit discovery request reaches its deadline, page bound, or entry bound after finding models
- **THEN** Preferences shows those models as partial results
- **AND** it does not replace the model field unless the user selects a result

#### Scenario: Discovery fails or is canceled

- **WHEN** discovery fails, is canceled, or completes after its draft owner changes
- **THEN** every entered field remains available for the current owner
- **AND** the stale result is not shown or applied to another draft

### Requirement: Synthesis embedding save-and-test SHALL show version-bound status

Save-and-test SHALL validate before mutation, persist configuration and encrypted credentials with failure rollback, then run the synthetic probe. Verification SHALL bind request-affecting configuration and credential revision, excluding ID, name, and discovery. Changes SHALL invalidate stale success. Failure SHALL retain the draft and show bounded diagnostics; index actions SHALL require a valid tested identity.

#### Scenario: Save-and-test succeeds

- **WHEN** configuration and credential save, then the synthetic query/document probe succeeds
- **THEN** Preferences shows success for that saved configuration version and its reported dimensions and latency

#### Scenario: Save-and-test fails

- **WHEN** configuration or credential save succeeds but the synthetic probe fails
- **THEN** Preferences reports failure without clearing the draft or claiming a tested identity
- **AND** no index is created or updated

#### Scenario: Configuration persistence fails

- **WHEN** validation or persistence of configuration or the encrypted credential fails
- **THEN** Preferences restores the previous configuration and encrypted credential and sends no synthetic probe

#### Scenario: The tested configuration changes

- **WHEN** the connection draft, its saved configuration, or its credential changes after a successful test
- **THEN** Preferences no longer presents the older test as applying to the new version

#### Scenario: A test finishes late

- **WHEN** a test completes after the selected connection or draft owner changes
- **THEN** Preferences does not mark the newer owner as tested

#### Scenario: An older identical probe finishes late

- **WHEN** two probes for the same request configuration overlap and the newer probe succeeds first
- **THEN** the older completion cannot replace the newer success

#### Scenario: Different connections save concurrently

- **WHEN** configuration or credential writes for different connections overlap
- **THEN** both credential-list entries persist and their probes remain independent

### Requirement: Paper details SHALL identify similarity material

Paper-detail recommendations SHALL display title, concise excerpt and metadata/generated/weak material classification. Candidate cards SHALL remain distinct from adopted Topic sources and provide no direct per-hint adoption action.

#### Scenario: Weak material is used

- **WHEN** a recommendation is based on title-only material
- **THEN** the user can identify that limitation without reading implementation details

### Requirement: Index SHALL expose current-window navigation and filtering

Index SHALL filter and search all parents in the selected library and scope before pagination. Bottom pagination SHALL use icon buttons for first, previous, next and last with an editable page number. Each page SHALL contain at most 100 matching library parents; reference children SHALL NOT consume parent slots. Accurate matching totals SHALL become available when the global query completes.

#### Scenario: User navigates with a local filter

- **WHEN** the user navigates with search or filters active
- **THEN** the filter SHALL be preserved and page boundaries and totals SHALL refer to the matching global parent set.

#### Scenario: Window navigation starts

- **WHEN** a page is requested
- **THEN** duplicate navigation SHALL be disabled during page loading
- **AND** successful navigation SHALL clear preceding expanded state and begin at the top
- **AND** unrelated regions SHALL preserve their DOM identity.

#### Scenario: Index opens while a read is slow

- **WHEN** the user opens Index and the first native scan has yet to return
- **THEN** Index SHALL show a loading state
- **AND** once matching source references are available, Index SHALL display the first batch of summaries while global matching continues.

#### Scenario: The query changes during an in-flight read

- **WHEN** the user changes the effective Index query while a read is in flight
- **THEN** the replacement query SHALL be able to start before the older read finishes
- **AND** older results SHALL NOT replace the replacement query's results.

#### Scenario: Query is progressively counted

- **WHEN** initial matches are ready but global counting is unfinished
- **THEN** the matches SHALL be displayed with a separate animated counting status beside the pagination controls
- **AND** the total-page field SHALL retain its numeric value when known or a static unknown marker otherwise
- **AND** last-page and unknown-page navigation SHALL remain disabled until available.

#### Scenario: Page slices are loading

- **WHEN** the user reaches the end of loaded rows while the current page is unfinished
- **THEN** an animated loading indicator SHALL be visible there
- **AND** empty-result content SHALL appear only after the query establishes emptiness.

#### Scenario: References exceed the page size

- **WHEN** a parent on the current page has more than 100 references
- **THEN** every reference SHALL remain available through lazy loading
- **AND** the parent SHALL consume exactly one page slot.

#### Scenario: Background progress is written during an Index read

- **WHEN** an Index continuation overlaps a commit that only updates operation progress or retrieval state
- **THEN** the Index basis SHALL remain valid.

#### Scenario: A Reference change invalidates an Index continuation

- **WHEN** a commit changes Reference facts covered by the basis of an in-flight read
- **THEN** the continuation SHALL fail with a basis mismatch
- **AND** any accepted rows SHALL remain available for review until retry.

#### Scenario: A query or page fails

- **WHEN** a background query or page read fails
- **THEN** accepted content and any valid known total SHALL remain visible and loading indicators SHALL stop
- **AND** counting failures SHALL be identifiable separately from an unknown total
- **AND** Index SHALL offer a retry from the first page, including after a changed basis.

#### Scenario: A pagination action crosses the page boundary

- **WHEN** a valid first, previous, next, last or positive integer page action is dispatched
- **THEN** the page SHALL forward the existing action payload to the host
- **AND** malformed page numbers SHALL NOT be forwarded.

### Requirement: Topics views SHALL include planned topics

The Topics list and grid SHALL include planned and stale planned topics from the current bounded surface alongside materialized topics. A topic identifier SHALL appear once, with materialized content taking precedence. Planned topics SHALL display planning status without claiming synthesis metrics or changing artifact counts.

#### Scenario: Only planned topics exist

- **WHEN** the current Topics surface contains planned nodes and no synthesis artifacts
- **THEN** list and grid display those topics and permit search and sorting
- **AND** the page does not display the no-topics empty state

#### Scenario: A planned topic is materialized

- **WHEN** the same identifier has a materialized topic artifact
- **THEN** the Topics view displays one materialized entry with its update action
- **AND** Home artifact statistics continue to count artifacts only

### Requirement: Topics views SHALL expose lifecycle-aware workflow actions

The list, grid, and graph inspector SHALL offer Create for active planned topics and Update for eligible materialized topics. Stale planned topics SHALL remain visible with Create disabled. The graph inspector SHALL retain Open beside Update for materialized topics. Grid workflow actions SHALL use accessible icon buttons independent of the card's report-opening control.

#### Scenario: Active planned topic is selected

- **WHEN** the user activates Create from a list row, grid card, or graph inspector
- **THEN** the creation submission window targets that planned topic
- **AND** no report-opening action is dispatched

#### Scenario: Stale planned topic is selected

- **WHEN** a planned topic has stale lifecycle
- **THEN** its Create action is disabled in each view

#### Scenario: Grid workflow action is clicked

- **WHEN** the user activates a grid workflow icon
- **THEN** only the corresponding workflow action is dispatched
- **AND** the control has an accessible localized name and pending feedback

#### Scenario: Unrelated graph state changes

- **WHEN** only graph selection or layout changes while list or grid is active
- **THEN** unchanged topic rows retain their rendered identity

### Requirement: Index SHALL preserve a suspended live query across tab changes

Within one Workbench, an unchanged Index owner SHALL retain its current page, expansion, focus and scroll when another tab is selected. Enumeration SHALL pause after the in-flight batch and resume the same traversal on return. Closing the Workbench or replacing the query SHALL discard its live cursors.

#### Scenario: User leaves before counting completes

- **WHEN** the user leaves Index during a scan and returns without an owner invalidation
- **THEN** cached current-page content SHALL appear immediately without rereading accepted summaries
- **AND** no new batch SHALL start while Index is hidden
- **AND** enumeration SHALL continue from the next unconsumed batch on return.

#### Scenario: A hidden response belongs to a replaced owner

- **WHEN** a response arrives after its library, query, service or data revision was replaced
- **THEN** it SHALL NOT change the current owner's rows or counting state.

#### Scenario: Workbench is closed and reopened

- **WHEN** a valid session cache is available after closing and reopening Workbench
- **THEN** Index SHALL open on its cached first page
- **AND** an incomplete query SHALL begin a new enumeration without replaying a closed traversal's cursor.

### Requirement: Tag tables SHALL render bounded measured windows

Vocabulary and staged Tag tables SHALL mount only viewport rows, bounded overscan and a focused row. Business identity SHALL retain selection, editing and expansion while row height changes preserve the visible anchor. Scrolling SHALL remain local to the page.

#### Scenario: User scrolls a large Tag table

- **WHEN** either Tag table contains at least 1000 rows and the user scrolls to a distant row
- **THEN** mounted rows SHALL remain bounded independently of the total
- **AND** scrolling SHALL NOT dispatch host actions
- **AND** editing, expansion and select-all SHALL retain their existing filtered-set semantics.

### Requirement: Index rating fills SHALL share their outline geometry

Empty, whole and half-filled rating stars SHALL use one geometric outline independent of font glyph metrics while preserving score conversion, missing-rating appearance and accessible rating labels.

#### Scenario: A rating contains a half star

- **WHEN** a parent has a rating requiring a half star
- **THEN** the filled half SHALL align with its outline at supported display scaling.
