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

#### Scenario: User opens a structured topic artifact

- **WHEN** the user opens a topic artifact from Home or Topics
- **THEN** the Workbench SHALL request a structured topic artifact DTO from the
  host
- **AND** it SHALL render Topic Detail as the primary view instead of defaulting
  to rendered Markdown.

#### Scenario: Legacy Markdown-only topic is encountered

- **WHEN** the host reports that a topic has no structured artifact
- **THEN** the Workbench SHALL show a `needs_recreate` prompt rather than
  opening a Markdown fallback reader
- **AND** it SHALL keep Markdown export actions secondary for structured topics.

#### Scenario: Stale topic row is shown

- **WHEN** a topic row has stale or incomplete state
- **THEN** the Workbench SHALL show an update or complete action derived from
  the host-provided update intent
- **AND** invoking the action SHALL open the workflow submit dialog with
  prefilled topic id, language, update scope, update mode, and update reason.

#### Scenario: Dirty topic row is shown

- **WHEN** a topic row has dirty state that indicates missing current files,
  missing metadata, invalid resolver, or index hash mismatch
- **THEN** the Workbench SHALL present the action as Repair/Rebuild rather than
  a normal section update
- **AND** it SHALL prefill update mode as full replacement unless the host marks
  update as blocked.

#### Scenario: Mirror is missing or degraded

- **WHEN** the Workbench snapshot reports a missing or degraded Zotero mirror
- **AND** canonical synthesis assets are available
- **THEN** the Workbench SHALL expose a `rebuildSynthesisMirror` action
- **AND** the action SHALL be user-triggered rather than performed silently at
  startup.

#### Scenario: Canonical root is missing but shards are recoverable

- **WHEN** the Workbench snapshot reports a missing canonical root
- **AND** sync assessment says valid Zotero shards can recover current assets
- **THEN** the Workbench SHALL expose a `recoverSynthesisFromMirror` action
- **AND** invoking the action SHALL require explicit confirmation before any
  canonical files are restored.

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

