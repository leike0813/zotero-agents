# synthesis-workbench-ui Specification

## Purpose
TBD - created by archiving change align-topic-synthesis-detail-ui-with-structured-artifact. Update Purpose after archive.
## Requirements
### Requirement: Structured Topic Detail Uses A Dedicated Shell

The Synthesis Workbench SHALL render structured Topic Detail outside the
generic Workbench sidebar/topbar/content shell. The detail shell SHALL consume
the shared visual theme foundation through mapped `--topic-*` tokens.

#### Scenario: Structured detail is open

- **GIVEN** a structured topic detail DTO is loaded
- **WHEN** the Workbench renders the reader tab
- **THEN** it SHALL render a dedicated full-height topic detail shell
- **AND** it SHALL show only one topic title/topbar
- **AND** its topic-specific surfaces SHALL follow the selected light or dark
  theme.

### Requirement: Markdown Export Remains Secondary

The Workbench SHALL keep canonical Markdown export as a secondary reader view.

#### Scenario: User opens Markdown export

- **WHEN** the user chooses Markdown export from Topic Detail
- **THEN** the Workbench SHALL open the generic Markdown reader
- **AND** it SHALL NOT replace the structured detail contract.

### Requirement: Workbench provides a Tags management page

The Synthesis Workbench SHALL provide a Tags page as the primary user interface for Synthesis KG tag vocabulary management.

#### Scenario: Tags tab is available

- **WHEN** the Workbench renders its top-level navigation
- **THEN** it SHALL include a Tags tab
- **AND** selecting it SHALL render tag vocabulary state from the Synthesis service snapshot.

#### Scenario: Tags page renders management layout

- **WHEN** tag vocabulary state is loaded
- **THEN** the Tags page SHALL render facet filtering, search, a tag list or table, and a tag inspector
- **AND** the inspector SHALL expose canonical tag, facet, note, aliases, abbrev, deprecated state, replacement, usage count, source, last synced, and validation warnings when present.

#### Scenario: Tags page exposes import and validation flows

- **WHEN** the user invokes validate or import actions
- **THEN** the page SHALL reflect validation diagnostics or import merge preview state without silently overwriting canonical vocabulary.

### Requirement: Tags page surfaces projection status

The Synthesis Workbench SHALL expose local tag-index projection status without blocking navigation or reading flows.

#### Scenario: Projection is stale

- **WHEN** the tag-index projection is stale
- **THEN** the Tags page SHALL show stale or rebuilding status
- **AND** it SHALL keep existing vocabulary data visible.

### Requirement: Topics page defaults to graph organization view

The Synthesis Workbench Topics page SHALL default to a graph organization view while preserving List and Grid views.

#### Scenario: Workbench state is initialized

- **WHEN** Synthesis Workbench UI state is created
- **THEN** the Topics view mode SHALL default to `graph`.

#### Scenario: User switches topic views

- **WHEN** the user selects List or Grid
- **THEN** the existing topic rows SHALL remain available in that view.

### Requirement: Topics graph has organization modes and inspector

The Topics graph view SHALL expose Hierarchy, Neighborhood, and Unplaced modes plus a Topic Inspector.

#### Scenario: Hierarchy mode renders topic graph DTO

- **WHEN** Topics graph mode is `Hierarchy`
- **THEN** the Workbench SHALL render topic graph nodes and edges from the Synthesis snapshot.

#### Scenario: Unplaced excludes root topics

- **WHEN** a topic is marked root or top-level
- **THEN** it SHALL NOT appear in Unplaced results solely because it has no parent.

#### Scenario: Inspector shows relation context

- **WHEN** a topic is selected
- **THEN** the Topic Inspector SHALL show parents, children, related relations, paper count, last synthesis time, and suggestion status.

### Requirement: Workbench exposes Concepts management view

The Synthesis Workbench SHALL expose a Concepts tab for search, browsing, and display-text editing.

#### Scenario: Workbench state is initialized

- **WHEN** Synthesis Workbench UI state is created
- **THEN** Concepts tab state SHALL include search, type/status/topic filters, selected concept, and overlay enabled state.

#### Scenario: Concept detail renders

- **WHEN** a concept is selected
- **THEN** the Workbench SHALL show concept identity, senses, aliases, relations, topic links, projection state, and diagnostics.
- **AND** identity, alias, relation, source, status, and provenance fields SHALL be read-only.

#### Scenario: Display text edit is requested

- **WHEN** the user edits concept display text
- **THEN** the UI SHALL route only `short_definition`, `definition`, `usage_note`, or `editorial_note` through a host command.

### Requirement: Concept overlay links text non-destructively

The Workbench SHALL provide dynamic concept links and bubbles without rewriting source artifacts.

#### Scenario: Overlay renders concept links

- **WHEN** overlay is enabled for reader content
- **THEN** high-confidence unambiguous aliases SHALL render as concept links
- **AND** clicking a link SHALL show a concept bubble without navigation loss.

#### Scenario: Unsafe content is skipped

- **WHEN** content appears inside code, pre, JSON, math, or existing links
- **THEN** concept overlay SHALL NOT link that content.

### Requirement: Synthesis Topic Options Use Bounded Read Path
The Synthesis service SHALL expose a bounded topic-options read path for workflow parameter options, and this path MUST NOT build the full Synthesis Workbench snapshot.

#### Scenario: Updatable topic options are requested
- **WHEN** workflow parameter resolution requests Synthesis topics with the `updatable` filter
- **THEN** the service MUST read only the topic artifact index and persisted artifact state needed to derive topic update intent
- **AND** it MUST NOT load tag vocabulary, Concept KB, Topic Graph, Literature Registry, Citation Graph, Git Sync state, or Workbench UI graph state.

#### Scenario: All topic options are requested
- **WHEN** workflow parameter resolution requests all Synthesis topics
- **THEN** the service MAY use the existing lightweight topic inventory path
- **AND** it MUST NOT require a full Workbench snapshot.

### Requirement: Workbench reads do not trigger rebuilds

Synthesis Workbench snapshot reads and pure UI actions SHALL NOT enqueue
registry, graph, metrics, layout, or Git Sync jobs.

#### Scenario: Workbench opens with stale registry

- **WHEN** the Workbench snapshot reads stale registry state
- **THEN** it SHALL display latest usable data and freshness diagnostics
- **AND** it SHALL NOT enqueue registry rebuild work.

#### Scenario: User changes a local filter

- **WHEN** the user changes a tab, filter, selected row, graph mode, or local
  inspector state
- **THEN** the Workbench SHALL rebuild UI state from cached snapshot input where
  possible
- **AND** it SHALL NOT call maintenance workers.

### Requirement: Workbench displays Synthesis maintenance state

The Workbench SHALL expose freshness, queue, worker, latest usable age, and
recommended explicit actions for Synthesis maintenance domains.

#### Scenario: Registry work is queued

- **WHEN** Paper Registry dirty scopes are queued
- **THEN** Workbench SHALL show queued/running/stale status and pending count.

#### Scenario: Graph layout is stale

- **WHEN** Citation Graph structure is ready but layout is stale
- **THEN** Graph UI SHALL show latest usable graph data
- **AND** expose an explicit or graph-view-triggered layout refresh state.

### Requirement: Workbench Index exposes Literature registry filters

The Synthesis Workbench SHALL present Index as a Literature registry view backed by canonical literature registry projections.

#### Scenario: Literature view is filtered

- **WHEN** the user selects All, Library items, Reference-only, Matched, Ambiguous, Unresolved, Needs cleanup, or Stale
- **THEN** the Workbench SHALL filter rows from the literature registry projection
- **AND** it SHALL preserve existing search behavior.

### Requirement: Workbench Graph reads latest usable citation snapshot

The Workbench Graph view SHALL render the latest usable citation graph snapshot and report stale or missing state without blocking the UI for a rebuild.

#### Scenario: Graph snapshot is stale

- **WHEN** the citation graph projection is stale or missing
- **THEN** the Graph view SHALL show projection status and a rebuild command
- **AND** it SHALL NOT synchronously wait for a full rebuild during render.

### Requirement: Cleanup queue actions are bounded

The Workbench SHALL expose cleanup proposal actions limited to approve, reject, and skip.

#### Scenario: User applies cleanup action

- **WHEN** the user triggers approve, reject, or skip for a cleanup proposal
- **THEN** the host command SHALL route to the Synthesis service
- **AND** the refreshed snapshot SHALL show the updated proposal state.

### Requirement: Workbench exposes Synthesis KG operational state

The Workbench SHALL expose Git Sync state and actions without leaking credentials or making raw Git terminology the primary user-facing language.

#### Scenario: Conflict blocks sync

- **WHEN** Git Sync queue state is `blocked_conflict`
- **THEN** the Workbench SHALL render affected canonical asset relative paths and reasons
- **AND** it SHALL expose retry or reviewed action placeholders
- **AND** it SHALL NOT show credentials or unredacted absolute paths.

### Requirement: Workbench exposes Topic Graph review actions

Synthesis Workbench SHALL expose actionable suggested topic graph relations in the Topic Inspector.

#### Scenario: Suggested relation row is reviewed

- **WHEN** the selected topic has suggested relation edges
- **THEN** the Topic Inspector SHALL show review rows with relation, neighbor topic, status, and edge id backed actions
- **AND** Accept/Reject SHALL dispatch host commands with the specific edge id.

### Requirement: Workbench exposes Concept KB review queue actions

Synthesis Workbench SHALL expose a Concept KB Review Queue for proposal-derived ambiguous or low-confidence concept cards.

#### Scenario: Review queue is rendered

- **WHEN** Concept KB snapshot contains open review items
- **THEN** the Concepts tab SHALL render each item with reason, label, confidence, and candidate concept ids.

#### Scenario: Review queue action is dispatched

- **WHEN** the user approves, merges, or rejects a review item
- **THEN** Workbench SHALL dispatch `applyConceptReviewAction` with review id, action, and target concept id when needed.

### Requirement: Workbench shows literature rebuild freshness

Synthesis Workbench SHALL show Literature Registry and Citation Graph job/freshness state.

#### Scenario: Literature projection is stale or missing

- **WHEN** snapshot state reports stale or missing literature projection
- **THEN** Workbench SHALL show freshness status and a rebuild command
- **AND** it SHALL not block rendering while a full rebuild runs.

#### Scenario: Literature rebuild failed retryably

- **WHEN** job state is `failed_retryable`
- **THEN** Workbench SHALL show retry state and expose a retry command.

### Requirement: Workbench routes literature rebuild commands

Synthesis Workbench SHALL route literature rebuild/retry host commands to the Synthesis service.

#### Scenario: Manual rebuild is requested

- **WHEN** the user requests a literature rebuild
- **THEN** Workbench SHALL dispatch a host command that runs the literature background job immediately.

### Requirement: Workbench snapshots avoid full service reads for local UI state

Synthesis Workbench SHALL cache the latest service snapshot input and SHALL use
that cache for local UI state changes.

#### Scenario: A filter changes

- **WHEN** the user changes a Workbench filter, selected tab, selected graph
  element, selected tag, selected concept, overlay state, or review merge target
- **THEN** the Workbench SHALL rebuild the UI snapshot from cached snapshot input
- **AND** it SHALL NOT call the Synthesis service full snapshot reader.

#### Scenario: A host command completes

- **WHEN** a host command mutates canonical data or explicitly requests refresh
- **THEN** the Workbench SHALL refresh cached snapshot input from the Synthesis
  service before rendering the next snapshot.

### Requirement: Workbench startup posts one initial snapshot

Synthesis Workbench SHALL send a single real initial snapshot after the bridge is
ready.

#### Scenario: The Workbench handshake completes

- **WHEN** the Workbench bridge handshake completes
- **THEN** the host SHALL post one `synthesis:init` snapshot
- **AND** it SHALL NOT first post a default placeholder snapshot followed by a
  second real snapshot.

### Requirement: Workbench uses optimized chrome icons

Synthesis-related chrome toolbar, menu, and progress window icons SHALL use
small icon assets.

#### Scenario: Small icon URI is resolved

- **WHEN** toolbar, menu, or progress window code resolves play, workbench, or
  sidebar icons
- **THEN** the URI SHALL point to a 32px PNG asset
- **AND** it SHALL NOT point to the retained high-resolution source PNG.

### Requirement: Workbench host commands show asynchronous feedback

Synthesis Workbench SHALL provide immediate non-blocking feedback when a host
command is submitted.

#### Scenario: A user starts an asynchronous host command

- **WHEN** the user clicks a Workbench button that sends a host command
- **THEN** the clicked operation SHALL enter a pending state immediately
- **AND** matching buttons SHALL be disabled while that operation is in flight
- **AND** the UI SHALL expose an accessible busy state for the operation.

#### Scenario: A command completes or fails

- **WHEN** an in-flight host command completes or fails
- **THEN** the Workbench SHALL clear the matching pending state
- **AND** it SHALL show a lightweight completed or failed action summary
- **AND** it SHALL refresh the snapshot when the command can change service data.

### Requirement: Workbench prevents duplicate scoped host commands

Synthesis Workbench SHALL single-flight duplicate host commands that target the
same operation key.

#### Scenario: The same review action is clicked twice

- **WHEN** the same review action is already in flight
- **AND** the user clicks the same command again
- **THEN** the host SHALL NOT call the underlying service a second time
- **AND** the UI SHALL keep the existing pending state visible.

#### Scenario: Different scoped actions are clicked

- **WHEN** two host commands target different review ids, edge ids, or layout
  presets
- **THEN** the Workbench MAY execute them concurrently.

### Requirement: Workbench respects background job states

Synthesis Workbench SHALL disable or de-emphasize actions that are already queued
or running in the service state.

#### Scenario: Literature registry job is queued or running

- **WHEN** the Literature Registry job state is `queued` or `running`
- **THEN** rebuild actions for that job SHALL be disabled
- **AND** the UI SHALL show the queued or running state instead of allowing
  repeated clicks.

#### Scenario: Citation graph layout is pending

- **WHEN** the current layout preset is pending or running
- **THEN** layout recompute for that preset SHALL be disabled
- **AND** graph filters, search, and selection SHALL NOT create layout pending
  operations.

### Requirement: Tags import wizard previews TagVocab payloads

The Synthesis Workbench Tags import wizard SHALL accept Zotero TagVocab `tags/tags.json` payloads and show a meaningful preview before any canonical write.

#### Scenario: User previews TagVocab JSON

- **WHEN** the user pastes a JSON object with top-level `tags`
- **THEN** the Workbench SHALL route it to the Synthesis import preview command
- **AND** the returned snapshot SHALL show additions, unchanged entries, conflicts, or validation warnings instead of an empty item list.

#### Scenario: User applies import explicitly

- **WHEN** the user applies `merge-non-conflicting` or `use-imported`
- **THEN** the Workbench SHALL route the selected action and original payload to the Synthesis import apply command
- **AND** it SHALL rely on the service transaction result to refresh the snapshot.

### Requirement: Workbench review queues use single detailed review cards

Synthesis Workbench SHALL render domain-local human review requests as a single
detailed review card instead of persistent multi-row review lists.

#### Scenario: A domain has no review requests

- **WHEN** a Workbench domain has no open review request
- **THEN** the review panel SHALL NOT be rendered for that domain
- **AND** the main content layout SHALL NOT reserve space for an empty review
  queue.

#### Scenario: A domain has multiple review requests

- **WHEN** a Workbench domain has multiple open review requests
- **THEN** the UI SHALL render only the first current review request
- **AND** the card SHALL include enough detail to decide: reason, impact,
  evidence, candidate, conflict, or diagnostics information as applicable.

#### Scenario: A review decision is submitted

- **WHEN** the user submits a review decision
- **THEN** the button SHALL use existing async pending feedback
- **AND** duplicate scoped submissions SHALL remain single-flight
- **AND** the next snapshot SHALL determine whether the next review card is
  shown or the panel closes.

#### Scenario: Tag import is idle

- **WHEN** no tag import draft or preview is open
- **THEN** the Tags tab SHALL show an Import Tags entry point
- **AND** it SHALL NOT render the import textarea by default.

#### Scenario: Motion is reduced

- **WHEN** the user prefers reduced motion
- **THEN** review panel animations SHALL be disabled.

### Requirement: Workbench review actions close the visible review loop

Synthesis Workbench SHALL make review actions feel immediate while preserving
canonical service authority.

#### Scenario: Cleanup proposal is decided

- **WHEN** a Literature Cleanup proposal is approved, rejected, or skipped
- **THEN** the next Workbench snapshot SHALL read proposal status from canonical
  cleanup records
- **AND** the open cleanup review count SHALL no longer depend solely on stale
  registry projection data.

#### Scenario: Cleanup proposal is displayed

- **WHEN** a cleanup review card is shown
- **THEN** the card SHALL prioritize user-readable paper/reference/work titles
  and decision context
- **AND** implementation identifiers such as `proposal_id` SHALL NOT be primary
  card content.

#### Scenario: Topic graph relation is displayed

- **WHEN** a Topic Graph edge or relation proposal requires review
- **THEN** the card title SHALL include readable source topic, relation, and
  target topic text
- **AND** the card SHALL show confidence, evidence/provenance, diagnostics, or
  reason details sufficient for a decision
- **AND** edge/review ids SHALL NOT be primary card content.

#### Scenario: Review action is submitted

- **WHEN** the user clicks a review decision button
- **THEN** the current card SHALL advance optimistically to the next local open
  item without waiting for the backend command to finish
- **AND** duplicate scoped submissions SHALL remain single-flight
- **AND** if the backend command fails, the hidden item SHALL reappear and the
  failure SHALL be surfaced through the existing action status UI.

#### Scenario: Background snapshot arrives

- **WHEN** a background snapshot does not require a user-visible page reset
- **THEN** the Workbench SHALL preserve main content scroll position
- **AND** status/action updates SHALL NOT force the user back to the top of the
  current tab.

### Requirement: Workbench exposes Synthesis KG review and import workflows

Synthesis Workbench SHALL expose the remaining KG workflow decisions without silent defaults.

#### Scenario: Tag import preview is shown

- **WHEN** a tag import draft is previewed
- **THEN** the Tags tab SHALL show additions and conflicts
- **AND** provide explicit apply actions.

#### Scenario: Topic relation review item is shown

- **WHEN** the selected topic has open relation review items
- **THEN** the Topic Inspector SHALL show approve/reject controls for those items.

#### Scenario: Concept merge target is explicit

- **WHEN** a Concept Review item has candidates
- **THEN** the Concepts tab SHALL require a selected merge target before sending merge action.

### Requirement: Workbench storage state describes durable persistence

The Synthesis Workbench SHALL describe durable canonical store status without
presenting Zotero note mirror as the primary recovery path.

#### Scenario: Storage summary is rendered

- **WHEN** the Workbench snapshot is built
- **THEN** storage state SHALL report the durable Synthesis root state
- **AND** it SHALL NOT require Zotero anchor or mirror shard state to consider
  Synthesis storage ready.

#### Scenario: Persistence diagnostics are available

- **WHEN** integrity scan diagnostics are available
- **THEN** the Workbench MAY expose them as persistence diagnostics
- **AND** cleanup actions SHALL remain explicit and report-first.

