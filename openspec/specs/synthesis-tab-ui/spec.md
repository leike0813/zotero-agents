# synthesis-tab-ui Specification

## Purpose
TBD - created by archiving change add-synthesis-tab-ui. Update Purpose after archive.
## Requirements
### Requirement: Synthesis workbench uses host-owned bridge

The Synthesis UI SHALL use a host-owned bridge for snapshot delivery and action
routing, and its product entry point SHALL be a singleton Zotero main-area tab.

#### Scenario: Web panel initializes

- **WHEN** the Synthesis web panel sends a ready action
- **THEN** the host SHALL send `synthesis:init`
- **AND** the payload SHALL be a DTO snapshot.

#### Scenario: Web panel requests an action

- **WHEN** the web panel sends `synthesis:action`
- **THEN** the host SHALL accept only known action names
- **AND** it SHALL normalize payload before mutating host state.

#### Scenario: Workbench entry opens Zotero tab

- **WHEN** the user invokes any Synthesis Workbench entry point
- **THEN** the host SHALL open or select a Zotero tab with type `synthesis-workbench`
- **AND** repeated invocations SHALL reuse the existing tab rather than opening multiple Workbench dialogs.

### Requirement: Synthesis UI does not access host resources directly

The web panel SHALL NOT access Zotero APIs, local files, canonical assets, or
filesystem paths directly.

#### Scenario: User opens a canonical artifact

- **WHEN** the user invokes an open action in the web panel
- **THEN** the web panel SHALL send a host action
- **AND** the host SHALL read the canonical artifact and send an artifact reader DTO
- **AND** the DTO SHALL include rendered-input Markdown text and metadata without exposing local filesystem paths.

#### Scenario: User opens an assets folder

- **WHEN** the user explicitly invokes an open-folder action
- **THEN** the host MAY open or reveal the folder through Zotero host APIs.

### Requirement: Citation graph explorer uses persisted layout presets

The graph explorer SHALL display host-provided graph slices and persisted
layout preset coordinates.

#### Scenario: User changes layout preset

- **WHEN** a user selects `compact`, `balanced`, or `expanded`
- **THEN** the UI state SHALL switch preset
- **AND** it SHALL NOT run full-graph D3-force simulation in the web panel.

### Requirement: Synthesis workbench has stable MVP views

The Synthesis workbench SHALL expose Overview, Topics, Registry, Citation Graph,
and structured Topic Detail views.

#### Scenario: Topic graph inspector opens topic details

- **WHEN** the Topic Graph view has a selected materialized topic
- **THEN** the inspector SHALL expose an action to open that topic's structured
  Topic Detail view
- **AND** the action SHALL use the host-owned topic artifact command.

#### Scenario: Topic graph relations are visually legible

- **WHEN** the Topic Graph view renders relation edges
- **THEN** relation lines SHALL be visible enough to distinguish graph structure
- **AND** suggested or stale relations MAY remain dashed while retaining adequate
  contrast.

### Requirement: Synthesis Workbench exposes artifact lifecycle controls

The Synthesis Workbench SHALL let users soft delete active topic synthesis
artifacts and purge previously deleted topic artifacts through host-owned
commands.

#### Scenario: User deletes an active artifact

- **WHEN** the user clicks Delete for an artifact row and confirms
- **THEN** the web panel SHALL send a host command for that topic
- **AND** the host SHALL call the Synthesis service delete operation
- **AND** the refreshed snapshot SHALL no longer show the topic in active
  artifacts.

#### Scenario: User purges deleted artifacts

- **WHEN** deleted artifacts exist and the user confirms Purge Deleted
- **THEN** the web panel SHALL send a host command
- **AND** the host SHALL call the Synthesis service purge operation
- **AND** the refreshed snapshot SHALL show no pending deleted artifacts.

#### Scenario: User cancels a lifecycle confirmation

- **WHEN** the user cancels Delete or Purge confirmation
- **THEN** the host SHALL NOT call the Synthesis service mutation.

### Requirement: Synthesis Workbench displays topic artifact freshness

The Synthesis Workbench SHALL display freshness from the Synthesis service
instead of hard-coded values.

#### Scenario: Artifact row uses scanned freshness

- **WHEN** Workbench receives a snapshot
- **THEN** each topic artifact row SHALL show the service-provided freshness
  state
- **AND** `dirty` SHALL be accepted as a valid freshness filter value.

#### Scenario: Workbench refresh scans freshness

- **WHEN** Workbench opens or the user refreshes the snapshot
- **THEN** the host SHALL return a snapshot after the service has scanned active
  topic freshness
- **AND** it SHALL NOT start an agent update workflow automatically.

### Requirement: Synthesis Workbench exposes a dense topic workbench

Topic Detail SHALL render claims, timeline, paper evidence, coverage, and
external literature analysis from the structured topic artifact.

#### Scenario: Topic Detail is rendered

- **WHEN** the structured topic DTO contains claims, timeline events, paper
  evidence, and external literature analysis
- **THEN** the UI SHALL render a research workbench with left-side vertical
  tabs, a primary reading surface, a full-height resizable Evidence Explorer,
  and a bottom horizontal timeline
- **AND** it SHALL show claims, an interactive timeline, evidence summaries,
  coverage/gaps, and external literature analysis.
- **AND** implementation tasks and UI copy SHALL NOT describe this layout as a
  generic three-column topic detail.

#### Scenario: Topic Detail layout follows design tokens

- **WHEN** the Topic Detail view is rendered
- **THEN** the UI SHALL follow the Topic Synthesis Detail design tokens for
  neutral surfaces, text contrast, panel radius, Evidence Explorer sizing, and
  bottom timeline geometry
- **AND** the Evidence Explorer SHALL remain horizontally resizable with a
  bounded width range
- **AND** the bottom timeline SHALL place time coordinates below the baseline.

#### Scenario: Timeline pins use high-contrast states

- **WHEN** timeline markers are displayed
- **THEN** default, selected, and warning pins SHALL use high-contrast fills
  rather than pale or white fills
- **AND** selected marker state SHALL be represented by a darker pin and outer
  ring without reducing contrast against the panel background
- **AND** the pin tip SHALL visually align with the timeline baseline.

#### Scenario: Timeline marker is hovered

- **WHEN** the user hovers a timeline marker
- **THEN** the UI SHALL expose title, year, and evidence summary without changing
  the selected topic state.

#### Scenario: Timeline marker is clicked

- **WHEN** the user clicks a library paper timeline marker
- **THEN** the UI SHALL request the original paper digest from the host using the
  paper evidence digest locator
- **AND** it SHALL open a temporary modal rendering the resolved
  `digest-markdown` payload, related claims, citation context, source freshness,
  and Open Zotero Item action.

#### Scenario: Resolved digest changed since synthesis

- **WHEN** the host reports that the current digest hash differs from the digest
  hash recorded in the structured topic artifact
- **THEN** the modal SHALL still render the current digest when available
- **AND** it SHALL show a stale-source or source-changed warning.

#### Scenario: Resolved digest is unavailable

- **WHEN** the host cannot resolve the original digest payload
- **THEN** the modal SHALL show an unavailable digest state with paper metadata
  and provenance details
- **AND** the Topic Detail view SHALL remain usable.

#### Scenario: External literature is shown

- **WHEN** external literature analysis is present
- **THEN** the UI SHALL render analysis prose, themes, representative references,
  citation contexts, contribution-to-topic notes, and limitations
- **AND** it SHALL NOT render those external references as main timeline markers.

### Requirement: Synthesis topic summaries expose card metrics

Topic artifact rows SHALL include metrics required by the Home and Topics card
views.

#### Scenario: Snapshot normalizes a topic row

- **WHEN** a topic row contains paper count, summary, completion, and update time
- **THEN** the normalized snapshot SHALL preserve those fields
- **AND** filtered topic rows SHALL remain sorted according to the selected
  topic sort.

### Requirement: Topic synthesis creation action is labeled Create Topic

The Synthesis Workbench SHALL label the topic creation command as `Create
Topic`.

#### Scenario: User browses the Topics view

- **WHEN** the Topics view renders the primary creation action
- **THEN** the button label SHALL be `Create Topic`
- **AND** it SHALL invoke the existing host topic synthesis creation command.

### Requirement: Synthesis Workbench refresh preserves active controls

The Synthesis Workbench SHALL preserve active search, filter, and scroll state
when host snapshots refresh existing views.

#### Scenario: Snapshot refresh keeps search input

- **WHEN** the user is typing in a Workbench search or filter field
- **AND** the host sends a snapshot that does not change the active view
- **THEN** the input DOM node and current value SHALL be preserved
- **AND** Workbench actions such as refresh, open, copy, delete, and create
  topic SHALL keep their existing semantics.

#### Scenario: Snapshot refresh keeps scroll position

- **WHEN** the user has scrolled a Workbench list or detail region
- **AND** the host sends a snapshot for the same active view
- **THEN** the region's scroll position SHALL be preserved unless the user
  explicitly navigates to a different view or item.

### Requirement: Synthesis Workbench review center is domain complete

The Review page SHALL show the active review records for each selected review
domain without requiring the user to inspect another tab.

#### Scenario: Reference matching rows expose manual target selection

- **WHEN** an open Reference Matching proposal is shown in the Index review table
- **THEN** the actions SHALL include `Manual target`
- **AND** opening it SHALL show a bounded scrollable target picker with `#` and
  `A-Z` navigation
- **AND** choosing a target SHALL create a pending manual target decision without
  immediately writing storage.

#### Scenario: Index review drawer exposes manual target selection

- **WHEN** an open Reference Matching proposal is shown in the Index review drawer
- **THEN** the card actions SHALL include `Manual target`
- **AND** the picker SHALL use the same target candidates and pending decision
  flow as the Review page table.

### Requirement: Topic details displays structured synthesis artifacts

Topic Details SHALL display the canonical report body directly and avoid the old
persisted Markdown export reader flow.

#### Scenario: User reads and exports the report

- **WHEN** Topic Details displays a topic with `synthesis_report.body`
- **THEN** the Report tab SHALL render that Markdown body
- **AND** it SHALL provide a Copy action that copies the body source
- **AND** it SHALL provide an Export action that prompts for a Host save path
  and writes the body as Markdown
- **AND** Topic Details SHALL NOT show Markdown export or Open folder toolbar
  actions.

### Requirement: Review Index SHALL show Canonical Revision proposals

The Review Center Index tab SHALL include Canonical Revision proposals generated by stale canonical lifecycle reconciliation.

#### Scenario: User reviews protected stale canonical

- **WHEN** a Canonical Revision proposal is open
- **THEN** the Index review table SHALL show its source canonical, optional successor target, blockers, recommended action, and Accept/Reject actions.

### Requirement: Revise Canonicals SHALL not act as stale lifecycle review

Revise Canonicals SHALL identify proposal-managed stale canonical records as managed by Review, and SHALL NOT present a separate review workflow for those records.

#### Scenario: Proposal-managed canonical is shown as review-managed

- **WHEN** a canonical has an open Canonical Revision proposal
- **THEN** Revise Canonicals SHALL show review-managed diagnostics
- **AND** SHALL NOT expose a second stale lifecycle approval action for that canonical.

### Requirement: Index SHALL expose Revise Canonicals as an on-demand workbench

The Synthesis Workbench Index page SHALL expose `Revise Canonicals` beside the existing matching controls and SHALL render it as an Index functional subview rather than a top-level tab.

#### Scenario: User opens and leaves Revise Canonicals

- **WHEN** the user clicks `Revise Canonicals`
- **THEN** the Index main area SHALL switch to the canonical workbench
- **AND** the normal Index table and Index review drawer SHALL be hidden
- **AND** `Back to Index` SHALL restore the normal Index view without clearing Index filters or drawer state.

### Requirement: Revise Canonicals SHALL show effective canonical rows

Revise Canonicals SHALL display effective projected canonical references with human-readable summaries and diagnostics.

#### Scenario: User inspects canonical rows

- **WHEN** canonical rows are available on the registry surface
- **THEN** the workbench SHALL show title, year, binding, graph state, raw references, redirects, reviews, and action controls
- **AND** bound rows SHALL be projected by Zotero binding target
- **AND** unbound rows SHALL be projected by effective canonical id
- **AND** possible duplicates SHALL be diagnostics, not automatic merge actions.

### Requirement: Revise Canonicals SHALL support pending merge selection

Revise Canonicals SHALL stage merge decisions locally and apply them only through an explicit `Apply pending` action.

#### Scenario: User stages a single merge

- **WHEN** the user clicks `Merge` on one row
- **THEN** that row SHALL become the merge source
- **AND** other eligible rows SHALL expose target selection
- **AND** choosing a target SHALL add a pending merge request without writing storage.

#### Scenario: User stages batch merges

- **WHEN** the user selects multiple rows and clicks `Merge Selected`
- **THEN** selected rows SHALL become merge sources
- **AND** choosing a target SHALL create one pending merge request per source
- **AND** pending source rows SHALL be hidden from the active table until pending state is applied or cleared.

### Requirement: Canonical Details SHALL host metadata edit mode

The Canonical Details area SHALL support a structured edit mode for eligible unbound external canonicals.

#### Scenario: User edits canonical metadata

- **WHEN** the user opens Edit on an eligible row
- **THEN** Canonical Details SHALL show editable title/year/authors/identifiers fields
- **AND** it SHALL show incoming redirect source metadata in a matching readonly comparison panel
- **AND** `Copy to draft` SHALL copy the compared source metadata into the draft
- **AND** dirty drafts SHALL mark the row Edit control until saved or reverted.

### Requirement: Revise Canonicals SHALL preserve Review boundaries

Revise Canonicals SHALL not act as a second approval workflow for Canonical Revision proposals.

#### Scenario: Canonical is managed by Review

- **WHEN** a canonical row has an open Canonical Revision proposal
- **THEN** Revise Canonicals SHALL show the row as Review-managed
- **AND** SHALL NOT expose a second stale lifecycle approve/reject action for that row.

### Requirement: Topic-scoped citation graph UI

The Synthesis Workbench SHALL let users scope the Citation Graph to an existing materialized topic.

#### Scenario: Select topic scope from graph controls

- **GIVEN** the graph snapshot contains topic scope rows
- **WHEN** the user selects a topic in Citation Graph controls
- **THEN** the graph view SHALL display that topic's fixed 1-hop citation subgraph
- **AND** selecting `All topics` SHALL restore the full citation graph.

#### Scenario: Jump from topic details

- **GIVEN** a topic detail page is open
- **WHEN** the user clicks `Open Citation Subgraph`
- **THEN** the workbench SHALL switch to Citation Graph scoped to that topic
- **AND** the graph view SHALL expose `Back to Topic Details`.

### Requirement: Topic scope read model

The graph snapshot SHALL expose topic scope rows built from real topic artifact paper refs and citation graph node ids.

#### Scenario: Missing graph nodes

- **GIVEN** a topic has source paper refs that are absent from the citation graph cache
- **WHEN** the user selects that topic scope
- **THEN** the graph SHALL show an empty scoped state with diagnostics
- **AND** it SHALL NOT fall back to the full graph.

### Requirement: Synthesis Workbench SHALL localize fixed UI through host-provided messages

The Synthesis Workbench page SHALL render user-visible fixed UI text through a
Synthesis i18n message dictionary supplied by the host bridge.

#### Scenario: Host initializes Workbench locale

- **WHEN** the host sends `synthesis:init`, `synthesis:snapshot`,
  `synthesis:chrome`, `synthesis:surface`, or `synthesis:surface-error`
- **THEN** the payload MAY include `i18n.locale` and `i18n.messages`
- **AND** the Workbench SHALL apply those messages before rendering the affected
  chrome or surface
- **AND** the i18n envelope SHALL NOT become part of the business snapshot DTO.

#### Scenario: Fixed UI text is rendered

- **WHEN** Workbench renders navigation, tabs, table headers, buttons, status
  labels, placeholders, titles, aria labels, empty states, or loading/error text
- **THEN** it SHALL resolve the displayed text from the Synthesis i18n
  dictionary or the default English fallback.

### Requirement: Synthesis Workbench MUST preserve protocol values while localizing controlled enum labels

Controlled enum labels SHALL display localized text while preserving their original protocol values.

#### Scenario: Controlled enum is known

- **WHEN** a controlled enum value such as `canonical_merge`,
  `reference_matching`, `not_in_graph`, `library_paper`, `external_reference`,
  `low_signal`, `stale_target`, or `manual_target` is displayed
- **THEN** the UI SHALL show the localized label for that domain/value
- **AND** the underlying DTO, action payload, command name, and operation key
  SHALL keep the original value.

#### Scenario: Controlled enum is unknown

- **WHEN** Workbench receives an unknown controlled enum value
- **THEN** it SHALL render a humanized fallback label without throwing
- **AND** it SHALL preserve the original value for protocol/debug purposes.

### Requirement: Synthesis Workbench SHALL keep user and generated content raw

Synthesis localization SHALL NOT translate or rewrite user-provided or
generated research content.

#### Scenario: Research content is rendered

- **WHEN** Workbench renders topic text, literature titles, topic detail prose,
  report markdown, digest markdown, artifact payloads, or diagnostic free text
- **THEN** that content SHALL be rendered in its source language
- **AND** localization helpers SHALL only translate surrounding fixed UI labels
  and fixed prefixes/suffixes.

### Requirement: Temporary backend read failures SHALL be visible diagnostics

The Synthesis Workbench UI SHALL distinguish temporary backend read failures
from genuine empty data states.

#### Scenario: Transient storage busy occurs during surface refresh

- **WHEN** a surface refresh fails with a transient storage-busy diagnostic
- **THEN** the UI SHALL display a refresh/busy diagnostic
- **AND** it SHALL NOT render the normal empty state as if the backend returned no rows.

#### Scenario: No previous surface data exists

- **WHEN** a transient surface error occurs before any last-known-good snapshot exists
- **THEN** the UI SHALL render an explicit diagnostic panel
- **AND** it SHALL explain that data could not be read temporarily.

### Requirement: Synthesis Topic Detail visual hierarchy SHALL remain readable
Synthesis Topic Detail SHALL render left navigation tabs, primary content
cards, and summary hero surfaces with clear visual hierarchy while preserving
the existing host-owned action and data contracts.

#### Scenario: Topic detail left tabs expose active state clearly

- **WHEN** Topic Detail renders left-side section tabs
- **THEN** the active tab SHALL use a high-contrast active treatment that is
  distinguishable from hover and default states
- **AND** the tab state SHALL not depend on rewriting the underlying topic DTO
  or host action payload.

#### Scenario: Topic detail content cards remain readable

- **WHEN** Topic Detail renders claims, findings, debates, outline rows, or
  other structured content cards
- **THEN** the cards SHALL provide enough internal spacing for generated text
  to be readable
- **AND** hover elevation SHALL remain decorative without changing selection,
  navigation, or data state.

#### Scenario: Summary hero is visually separated

- **WHEN** the Synthesis overview or topic summary hero renders above dense
  workbench content
- **THEN** the hero SHALL be visually separated from surrounding sections
- **AND** the separation SHALL use theme-compatible surface, border, and shadow
  styling.

