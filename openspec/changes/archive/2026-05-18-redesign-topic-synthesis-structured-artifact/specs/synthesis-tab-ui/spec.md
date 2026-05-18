# synthesis-tab-ui Delta

## MODIFIED Requirements

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
