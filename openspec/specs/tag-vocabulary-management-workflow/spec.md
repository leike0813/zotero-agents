# tag-vocabulary-management-workflow Specification

## Purpose
TBD - created by archiving change add-tag-vocabulary-management-workflow. Update Purpose after archive.
## Requirements
### Requirement: Tag manager workflow SHALL provide protocol-aligned CRUD operations
`tag-manager` workflow MUST implement controlled vocabulary CRUD semantics aligned with `reference/Zotero_TagVocab/protocol/operations/*`.

#### Scenario: Create tag with protocol validation
- **WHEN** user creates a new tag entry in the panel
- **THEN** system SHALL validate facet/format/duplicate/abbrev-case constraints before persistence
- **AND** invalid requests SHALL return deterministic validation errors

#### Scenario: Update and rename tag entry
- **WHEN** user edits note/source/deprecated or renames tag value
- **THEN** system SHALL update exactly one existing entry
- **AND** rename collision checks SHALL follow protocol duplicate rules

#### Scenario: Delete supports soft and hard modes
- **WHEN** user chooses delete action
- **THEN** system SHALL support soft-delete (`deprecated=true`) and hard-delete (remove entry)
- **AND** behavior SHALL be explicit in operation result

### Requirement: Controlled vocabulary state SHALL be persisted across sessions
The managed vocabulary MUST be persisted locally and reloaded deterministically.

#### Scenario: Save and reopen
- **WHEN** user saves changes and reopens the manager workflow later
- **THEN** the latest committed vocabulary state SHALL be restored

#### Scenario: Corrupted persisted payload
- **WHEN** persisted vocabulary payload is invalid or unreadable
- **THEN** system SHALL fail safely with deterministic fallback
- **AND** SHALL NOT write partially invalid state back as valid data

### Requirement: Workflow SHALL export controlled tags as plain string arrays
The manager workflow MUST export current controlled tags as `facet:value` string arrays for downstream `tag-regulator` consumption.

#### Scenario: Export strips metadata
- **WHEN** export is triggered
- **THEN** output SHALL contain tag strings only
- **AND** SHALL NOT include note/source/deprecated metadata fields

#### Scenario: Export order is deterministic
- **WHEN** vocabulary content is unchanged across runs
- **THEN** exported array order SHALL remain stable

#### Scenario: Tag regulator may include digest markdown context
- **WHEN** `tag-regulator` builds a SkillRunner request for a parent item with a generated digest note containing a current `digest-markdown` embedded payload attachment
- **THEN** the request SHALL include optional `input.digest_markdown`
- **AND** the request SHALL upload the digest markdown content under the `digest_markdown` upload key
- **AND** the request SHALL keep `valid_tags` as the controlled vocabulary input.

#### Scenario: Tag regulator omits digest markdown when no current payload exists
- **WHEN** the selected parent item has no readable `digest-markdown` embedded payload attachment
- **THEN** the request SHALL omit `input.digest_markdown`
- **AND** request building SHALL continue using metadata, input tags, and valid tags.

### Requirement: Workflow SHALL import controlled vocabulary from protocol-aligned YAML sources
The manager workflow MUST support importing from `tags/tags.yaml`-style full-field YAML sources and apply conflict strategies consistent with `import_tags`.

#### Scenario: Import full-field YAML succeeds
- **WHEN** user selects a valid YAML file containing entries with `tag/facet/source/note/deprecated`
- **THEN** workflow SHALL validate each entry and merge into persisted vocabulary
- **AND** imported state SHALL remain deterministic by facet then tag

#### Scenario: Duplicate handling follows on_duplicate strategy
- **WHEN** imported entries collide with existing tags
- **THEN** `skip` SHALL keep existing entries, `overwrite` SHALL replace existing entries
- **AND** `error` SHALL abort import on first duplicate without mutating persisted state

#### Scenario: Dry-run import is non-destructive
- **WHEN** user enables `dry_run`
- **THEN** workflow SHALL report imported/skipped/overwritten/errors
- **AND** SHALL NOT mutate persisted vocabulary state

### Requirement: Validation and compile semantics SHALL remain deterministic
The workflow domain layer MUST provide deterministic validate/compile style behaviors consistent with protocol intent.

#### Scenario: Validate catches cross-entry issues
- **WHEN** vocabulary contains duplicate/case-duplicate/facet-mismatch issues
- **THEN** validation SHALL report deterministic issue set with stable codes

#### Scenario: Compile emits stable merged ordering
- **WHEN** per-facet entries are merged for export view
- **THEN** merged ordering SHALL be deterministic by facet then tag

### Requirement: Tag manager facet column SHALL be read-only in panel editing
The workflow UI MUST display each entry facet as a non-editable field and SHALL NOT provide direct facet mutation controls in the panel.

#### Scenario: Facet is visible but not editable
- **WHEN** user opens the tag manager panel and views any row
- **THEN** system SHALL show facet value in the facet column
- **AND** system SHALL NOT render facet as a selectable dropdown for row editing

#### Scenario: Save path keeps protocol validation
- **WHEN** user edits other fields and saves
- **THEN** system SHALL keep running existing facet/tag consistency validation
- **AND** invalid facet/tag combinations SHALL still fail deterministically

### Requirement: Tag manager panel SHALL provide sticky table headers
The workflow UI MUST render a visible column header row that remains visible while scrolling the entry list.

#### Scenario: Header remains visible during list scrolling
- **WHEN** the panel contains enough rows to scroll
- **THEN** system SHALL keep the header row visible at the top of the scroll container
- **AND** users SHALL be able to identify each column meaning while browsing lower rows

### Requirement: Export action SHALL produce visible deterministic output
The workflow UI MUST provide user-visible export output and keep the exported content aligned with the protocol export contract.

#### Scenario: Export generates visible result
- **WHEN** user clicks Export
- **THEN** system SHALL render the exported `facet:value` lines in a visible read-only area
- **AND** output SHALL be copy-ready for downstream `tag-regulator` usage

#### Scenario: Export content follows protocol order and shape
- **WHEN** vocabulary content is unchanged
- **THEN** exported content SHALL remain deterministic in order
- **AND** output SHALL include tag strings only without note/source/deprecated metadata

#### Scenario: Export remains copy-first
- **WHEN** user views export result
- **THEN** system SHALL keep the exported text directly copyable
- **AND** downstream usage SHALL not depend on file-download controls

### Requirement: Search input SHALL retain focus during incremental filtering
The workflow UI MUST keep search typing uninterrupted while applying incremental filters.

#### Scenario: Incremental typing does not lose focus
- **WHEN** user types multiple consecutive characters into search input
- **THEN** search input SHALL remain focused after each state update
- **AND** user SHALL continue typing without re-clicking the input

### Requirement: Tag manager SHALL support combinational facet filtering via popup panel
The workflow UI MUST provide a popup filter sub-window containing per-facet multi-select controls that can be combined across all configured facets.

#### Scenario: Filter button opens popup sub-window
- **WHEN** user clicks the filter button in toolbar
- **THEN** system SHALL open an internal popup filter panel
- **AND** panel SHALL contain grouped controls for all configured facets

#### Scenario: Facet options are derived dynamically
- **WHEN** vocabulary entries change
- **THEN** each facet filter control SHALL show options derived from current entries under that facet
- **AND** unavailable values SHALL NOT be listed

#### Scenario: Multi-facet selections combine deterministically
- **WHEN** user selects multiple facet values across different facet controls
- **THEN** system SHALL apply combined filtering to the row list
- **AND** filtering SHALL compose with text search results deterministically

### Requirement: Tag manager facet filter SHALL be facet-only and default to all-enabled
The workflow UI MUST filter rows by facet visibility only, with all configured facets enabled by default.

#### Scenario: Initial filter state shows all facets
- **WHEN** user opens tag manager panel
- **THEN** system SHALL mark all 8 facets as selected/visible
- **AND** rows from all facets SHALL be visible before any manual uncheck

#### Scenario: Unchecked facet is excluded immediately
- **WHEN** user unchecks one or more facet options
- **THEN** rows belonging to unchecked facets SHALL be hidden immediately
- **AND** checked facets SHALL remain visible without extra apply action

### Requirement: Filter popup SHALL use instant interaction and lightweight close behavior
The filter sub-window MUST apply changes in real time and close via outside click or filter-button toggle.

#### Scenario: Popup has no action buttons
- **WHEN** filter popup is opened
- **THEN** system SHALL NOT render `Clear`, `Apply`, or `Delete` actions
- **AND** each checkbox change SHALL take effect immediately

#### Scenario: Popup closes by outside click or button toggle
- **WHEN** user clicks outside popup area or clicks `Filter` button again
- **THEN** system SHALL close popup
- **AND** already-applied filter state SHALL be preserved

### Requirement: Tag manager editing SHALL preserve list scroll position
The workflow UI MUST keep current scroll position stable during inline edits and typing updates.

#### Scenario: Typing in lower rows does not reset scroll
- **WHEN** user edits tag/note/deprecated controls in a scrolled list
- **THEN** list scroll offset SHALL remain at current position after rerender
- **AND** user SHALL NOT be forced back to top

### Requirement: Source column SHALL be read-only and Add-created entries SHALL default to manual
The workflow UI MUST lock source editing, and entries created from the panel `Add` action MUST initialize/persist source as `manual`.

#### Scenario: Source is displayed but not editable
- **WHEN** panel renders any row
- **THEN** source column SHALL be non-editable
- **AND** system SHALL NOT provide free-form source input control

#### Scenario: Add-created entry uses manual source
- **WHEN** user creates a new row via `Add` in tag-manager
- **THEN** new row source SHALL be `manual`
- **AND** saved entry SHALL keep source as `manual` unless created from non-Add flow (e.g., import)

### Requirement: Facet and Tag columns SHALL follow normalized split-edit layout
The workflow UI MUST place facet before tag, allow facet selection from enumerated options, and display/edit tag suffix only.

#### Scenario: Column order and width are adjusted
- **WHEN** panel renders table layout
- **THEN** facet column SHALL appear before tag column
- **AND** facet column width SHALL be significantly narrower than tag column (target around one-third of prior width)

#### Scenario: Facet display keeps explicit suffix separator
- **WHEN** facet column renders a row
- **THEN** UI SHALL render a half-width colon separator (`:`) beside the facet selector
- **AND** tag column SHALL NOT repeat facet prefix

#### Scenario: Facet dropdown works with bounded options
- **WHEN** user opens facet selector
- **THEN** system SHALL provide only the 8 allowed facet options
- **AND** selected facet SHALL update row facet state deterministically

#### Scenario: Tag suffix edit maps to full stored tag
- **WHEN** user edits visible tag suffix while facet is selected
- **THEN** rendered tag cell SHALL show suffix without repeated facet prefix
- **AND** serialized tag SHALL be persisted as `facet:suffix`

#### Scenario: Facet change rewrites full tag deterministically
- **WHEN** user changes facet selection for a row
- **THEN** system SHALL recompute the full tag using new facet and current visible suffix
- **AND** persisted tag SHALL always match `selectedFacet:suffix` format

### Requirement: Import controls SHALL be grouped and labeled with normalized wording
Import-related controls MUST be visually grouped and provide deterministic duplicate-strategy interaction.

#### Scenario: Import section is visually separated
- **WHEN** panel renders toolbar area
- **THEN** `Import YAML`, `Dry Run`, and `On Duplicate` controls SHALL appear in a dedicated import group
- **AND** group SHALL be visually separated from generic actions

#### Scenario: On Duplicate label and selector behavior
- **WHEN** user interacts with duplicate strategy selector
- **THEN** UI SHALL display label text `On Duplicate:` and selector values such as `Skip/Overwrite/Error`
- **AND** selected value SHALL update import strategy state reliably

### Requirement: Tag manager workflow SHALL suppress workflow execution reminders
The `tag-manager` workflow MUST disable workflow execution reminders (start toast, per-job toasts, end-of-run summary alert) and rely on editor save/discard semantics as the primary completion feedback.

#### Scenario: Save completes without execution reminders
- **WHEN** user saves tag vocabulary edits in the tag manager editor
- **THEN** workflow SHALL persist vocabulary changes
- **AND** workflow runtime SHALL NOT emit start/per-job toasts
- **AND** workflow runtime SHALL NOT show final succeeded/failed summary alert dialog

#### Scenario: Discard/cancel completes without execution reminders
- **WHEN** user closes tag manager editor without saving (clean close or discard on dirty close)
- **THEN** workflow SHALL keep persisted vocabulary unchanged
- **AND** workflow runtime SHALL NOT emit start/per-job toasts
- **AND** workflow runtime SHALL NOT show final succeeded/failed summary alert dialog

### Requirement: Tag manager editor title SHALL be selection-independent
The `tag-manager` editor title MUST be derived from workflow label only and MUST NOT append selected-item title.

#### Scenario: Triggered from any selected item
- **WHEN** user launches `tag-manager` from different selected parents/notes/attachments
- **THEN** editor window title SHALL remain a stable workflow-centric label
- **AND** title SHALL NOT include trigger selection name fragments

### Requirement: Tag vocabulary ingestion SHALL support tag-regulator suggest-tag intake
The vocabulary persistence interface MUST accept selected `suggest_tags` from `tag-regulator` and enforce deterministic source/idempotency rules.

#### Scenario: Suggest-tag intake writes selected entries with fixed source
- **WHEN** `tag-regulator` submits selected `suggest_tags` for intake
- **THEN** vocabulary persistence SHALL write only selected entries
- **AND** each newly written entry SHALL set `source = agent-suggest`

#### Scenario: Suggest-tag intake preserves note field
- **WHEN** selected `suggest_tags` entries include `note`
- **THEN** vocabulary persistence SHALL store the corresponding `note` on inserted entries
- **AND** stored `note` SHALL remain associated with its selected `tag`

#### Scenario: Suggest-tag intake remains idempotent and validates format
- **WHEN** selected tags contain duplicates or invalid formats
- **THEN** existing tags SHALL be skipped without duplicate insertion
- **AND** invalid tags SHALL be rejected with deterministic diagnostics

### Requirement: Tag manager SHALL provide a staged-tags inbox separate from controlled vocabulary
The workflow MUST persist staged tags independently from controlled vocabulary and allow users to review/edit them before promotion.

#### Scenario: Staged tags persist independently
- **WHEN** staged tags are saved
- **THEN** they SHALL be written to a dedicated staged persistence key
- **AND** controlled vocabulary persistence SHALL remain unchanged

#### Scenario: Corrupted staged payload fails safely
- **WHEN** staged payload is invalid JSON or invalid shape
- **THEN** loader SHALL return deterministic fallback state
- **AND** workflow SHALL NOT mutate controlled vocabulary

### Requirement: Tag manager SHALL allow immediate staged-tag actions
The staged inbox UI MUST support immediate actions for promote, discard, and clear-all.

#### Scenario: Promote staged tag to controlled vocabulary
- **WHEN** user clicks `加入受控词表` on a staged row
- **THEN** system SHALL validate the candidate against controlled vocabulary rules
- **AND** valid entry SHALL be persisted into controlled vocabulary
- **AND** promoted staged row SHALL be removed from staged persistence

#### Scenario: Promote rejects invalid tag
- **WHEN** candidate staged tag fails validation
- **THEN** controlled vocabulary SHALL remain unchanged
- **AND** staged row SHALL remain in staged persistence
- **AND** UI SHALL expose deterministic diagnostics

#### Scenario: Discard and clear are immediate
- **WHEN** user clicks row-level `拒绝/废弃`
- **THEN** that staged row SHALL be removed immediately
- **AND WHEN** user clicks `清空` and confirms
- **THEN** all staged rows SHALL be removed immediately

### Requirement: Tag manager bridge SHALL expose staged persistence APIs
The global tag vocabulary bridge MUST provide staged-state read/write APIs for cross-workflow integration.

#### Scenario: Tag-regulator writes remaining suggest tags into staged inbox
- **WHEN** tag-regulator suggest-intake executes staged path (global stage, timeout, or close default)
- **THEN** workflow SHALL persist remaining suggested tags through staged bridge methods
- **AND** persisted staged entries SHALL remain reviewable in Tag Manager staged inbox
- **AND** persisted entries SHALL carry `sourceFlow = tag-regulator-suggest`

### Requirement: Tag manager SHALL be triggerable without selection
The `tag-manager` workflow MUST be explicitly launchable even when Zotero starts with no selected items.

#### Scenario: Launch tag manager with empty selection
- **WHEN** the user triggers `tag-manager` while `getSelectedItems()` is empty
- **THEN** workflow execution SHALL proceed without a `no selection` rejection
- **AND** the tag manager editor SHALL open normally
- **AND** save/discard behavior SHALL remain unchanged from the selected-item path

### Requirement: Legacy tag-manager is no longer builtin

The legacy tag-manager workflow SHALL be deprecated and excluded from builtin
workflow registration.

#### Scenario: Builtin workflows are loaded

- **WHEN** builtin workflow packages are scanned
- **THEN** `tag-manager` SHALL NOT be loaded as a builtin workflow
- **AND** `tag-vocabulary-package` SHALL NOT be required for builtin workflow
  operation.

#### Scenario: Existing prefs-backed vocabulary exists

- **WHEN** old `tagVocabularyJson`, `tagVocabularyStagedJson`, or tag-manager
  GitHub workflow settings exist
- **THEN** this migration SHALL NOT import them into Synthesis automatically
- **AND** Synthesis Tag Vocabulary SHALL remain the canonical tag state.

### Requirement: Legacy staged inbox is replaced by Synthesis Workbench

The staged tag management capabilities formerly owned by `tag-manager` SHALL be
provided by the Synthesis Workbench Tags page instead of the legacy workflow UI.

#### Scenario: User needs staged tag management

- **WHEN** a user needs to review staged tag suggestions
- **THEN** the builtin path SHALL be the Synthesis Workbench Tags Staged subview
- **AND** the legacy `tag-manager` renderer SHALL NOT be reused as the builtin
  staged inbox.

#### Scenario: Old prefs-backed staged data exists

- **WHEN** old `tagVocabularyStagedJson` data exists
- **THEN** the Synthesis Workbench staged inbox SHALL NOT display that prefs
  data
- **AND** it SHALL display only staged suggestions stored by Synthesis.

