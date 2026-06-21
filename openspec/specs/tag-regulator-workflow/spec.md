# tag-regulator-workflow Specification

## Purpose
TBD - created by archiving change add-tag-regulator-workflow. Update Purpose after archive.
## Requirements
### Requirement: Tag regulator capability SHALL be delivered as a decoupled workflow package
The `tag-regulator` capability MUST be implemented as a newly added workflow package and MUST remain decoupled from plugin source business branches.

#### Scenario: Implementation boundary for plugin source and workflow package
- **WHEN** this capability is implemented
- **THEN** `tag-regulator` business behavior SHALL reside in workflow manifest/hooks under `workflows/tag-regulator/**`
- **AND** plugin `src/**` SHALL only use existing generic workflow infrastructure without introducing `tag-regulator`-specific business branches

### Requirement: Tag regulator workflow SHALL process parent items as normalization units
`tag-regulator` workflow MUST treat each selected parent item as one independent normalization unit.

#### Scenario: Parent selection triggers one request per parent
- **WHEN** user selects one or more parent items and triggers `tag-regulator`
- **THEN** system SHALL build one normalization request per parent item
- **AND** each request/apply path SHALL be isolated from other parents

### Requirement: Workflow SHALL construct mixed-input payload for tag-regulator skill
The workflow MUST send `metadata`/`input_tags` as inline input and `valid_tags` as uploaded file input according to skill contract.

#### Scenario: Build request includes required fields
- **WHEN** workflow builds a skillrunner request for a parent item
- **THEN** payload SHALL include `input.metadata`, `input.input_tags`, and upload file key `valid_tags`
- **AND** payload parameter SHALL include runtime options like `infer_tag` and `valid_tags_format`

#### Scenario: Missing controlled vocabulary export fails safely
- **WHEN** workflow cannot resolve or materialize `valid_tags` input
- **THEN** that unit SHALL fail with deterministic diagnostics
- **AND** SHALL NOT mutate parent tags

### Requirement: Workflow SHALL apply tag-regulator result conservatively
The workflow MUST apply `remove_tags` and `add_tags` only when output mutation fields are valid.

#### Scenario: Successful normalization result
- **WHEN** skill returns valid output with mutation fields
- **THEN** workflow SHALL remove tags listed in `remove_tags` and add tags listed in `add_tags`
- **AND** parent tags not listed in mutations SHALL remain unchanged
- **AND** skill output diagnostics such as `error` and `warnings` SHALL be returned for user review without blocking valid mutations.

#### Scenario: Skill reports error with valid mutation payload
- **WHEN** skill returns `error != null`
- **AND** `remove_tags`, `add_tags`, and `suggest_tags` are structurally valid
- **THEN** workflow SHALL still apply the valid tag mutation payload
- **AND** workflow SHALL include the skill error in returned diagnostics.

#### Scenario: Malformed payload
- **WHEN** output schema check fails or required mutation fields are malformed
- **THEN** workflow SHALL skip tag mutation for that parent
- **AND** SHALL emit warnings/diagnostics for user review.

### Requirement: Suggested tags SHALL remain advisory outputs
Tags in `suggest_tags` MUST NOT be written directly to parent items, and SHALL support user-confirmed intake into controlled vocabulary or staged inbox.

#### Scenario: Result-time live reconcile suppresses stale suggestions
- **WHEN** backend returns `suggest_tags`
- **AND** one of those tags has already entered local controlled vocabulary before result application
- **THEN** that tag SHALL NOT appear in the suggest-intake dialog
- **AND** that tag SHALL be treated as result-time `add_tags` input for downstream parent-item mutation

#### Scenario: Result-time live reconcile suppresses stale staged reminders
- **WHEN** backend returns `suggest_tags`
- **AND** one of those tags has already entered local staged inbox before result application
- **THEN** that tag SHALL remain visible in the suggest-intake dialog
- **AND** the workflow SHALL NOT create another staged entry for that tag
- **AND** the workflow SHALL merge the current parent item into that staged record's `parentBindings` before opening the dialog

#### Scenario: Suggest intake dialog supports immediate row actions
- **WHEN** output contains non-empty `suggest_tags`
- **THEN** workflow SHALL open a suggest-intake dialog with row-level `加入` and `拒绝` actions
- **AND** row-level `加入` SHALL write directly to controlled vocabulary on success and remove the row
- **AND** row-level `拒绝` SHALL discard the row immediately

#### Scenario: Suggest intake dialog shows parent binding counts
- **WHEN** the suggest-intake dialog is open
- **THEN** the dialog SHALL render a header row
- **AND** each row SHALL display the current bound-parent count for that suggest tag

#### Scenario: Global actions include join/stage/reject
- **WHEN** suggest-intake dialog is open
- **THEN** global actions SHALL be `全部加入` / `全部暂存` / `全部拒绝`
- **AND** `全部加入` SHALL keep invalid rows visible with diagnostics
- **AND** `全部暂存` SHALL write remaining rows to staged inbox
- **AND** `全部拒绝` SHALL discard all remaining rows

#### Scenario: Staged intake does not mutate parent tags directly
- **WHEN** a suggest tag enters staged inbox through row-level stage, global `全部暂存`, timeout close-policy, or join fallback
- **THEN** the workflow SHALL record deferred parent bindings for future committed backfill
- **AND** the workflow SHALL NOT append that tag to the parent item's tags at staged time

#### Scenario: Parent tags are backfilled only after committed success
- **WHEN** a user-approved suggest tag successfully enters committed controlled vocabulary
- **THEN** the workflow SHALL append that tag to the current parent item
- **AND** any staged `parentBindings` for that tag SHALL remain deferred until the committed update succeeds

#### Scenario: Timeout and manual close default to staged intake
- **WHEN** suggest-intake dialog reaches 10-second timeout
- **THEN** system SHALL execute staged intake for all remaining rows and close the dialog
- **AND WHEN** user manually closes the dialog
- **THEN** system SHALL apply the same default staged-intake policy

#### Scenario: Suggest-intake summary is deterministic
- **WHEN** suggest-intake completes
- **THEN** workflow SHALL return deterministic summary fields including `addedDirect`, `staged`, `rejected`, `invalid`, `timedOut`, and `closePolicyApplied`

### Requirement: Tag regulator workflow SHALL expose tag_note_language parameter
`tag-regulator` workflow MUST declare and pass through `tag_note_language` for backend note-language control.

#### Scenario: Build request includes tag_note_language
- **WHEN** workflow executes with user-configured `tag_note_language`
- **THEN** request parameter SHALL include `tag_note_language` with the configured value
- **AND** default value SHALL be `zh-CN` when not overridden

### Requirement: Language option declaration SHALL align with literature-digest workflow
`tag-regulator.tag_note_language` and `literature-digest.language` MUST use the same declared option set and default.

#### Scenario: Both workflows expose same language options
- **WHEN** manifests are loaded
- **THEN** the language options declared by `tag-regulator` and `literature-digest` SHALL be equivalent
- **AND** both defaults SHALL be `zh-CN`

### Requirement: Tag regulator SHALL prefer Synthesis canonical vocabulary

The tag-regulator workflow SHALL use Synthesis KG tag vocabulary as the preferred source for `valid_tags` while retaining the existing prefs-backed vocabulary as fallback.

#### Scenario: Canonical vocabulary is available

- **WHEN** tag-regulator builds a request and Synthesis canonical vocabulary can export active tags
- **THEN** the workflow SHALL materialize `valid_tags` from the Synthesis export
- **AND** it SHALL keep the existing `valid_tags` upload contract unchanged.

#### Scenario: Canonical vocabulary is unavailable

- **WHEN** Synthesis canonical vocabulary export is unavailable or empty
- **THEN** the workflow SHALL fall back to the existing prefs vocabulary resolution path
- **AND** request building SHALL keep existing deterministic missing-vocabulary diagnostics if no fallback is usable.

#### Scenario: Export shape remains compatible

- **WHEN** tag-regulator consumes tags from Synthesis
- **THEN** the generated payload SHALL remain compatible with the existing tag-regulator skill contract.

### Requirement: Tag regulator consumes Synthesis canonical vocabulary first

The tag-regulator workflow SHALL consume Synthesis canonical vocabulary as its
only builtin `valid_tags` source.

#### Scenario: Canonical TagVocab vocabulary is available

- **WHEN** Synthesis canonical vocabulary contains active TagVocab entries
- **THEN** the tag-regulator request builder SHALL use the exported active tag
  strings as `valid_tags`
- **AND** the `valid_tags` payload shape SHALL remain compatible with existing
  tag-regulator skills.

#### Scenario: Canonical vocabulary is unavailable

- **WHEN** Synthesis canonical vocabulary cannot be loaded or exports no active
  tags
- **THEN** request building SHALL fail with deterministic diagnostics
- **AND** the workflow SHALL NOT use the old prefs fallback path.

### Requirement: Tag regulator belongs to literature workbench package

The builtin tag-regulator workflow SHALL be shipped from
`literature-workbench-package`.

#### Scenario: Builtin workflows are scanned

- **WHEN** workflow packages are loaded
- **THEN** workflow id `tag-regulator` SHALL be present
- **AND** its package id SHALL be `literature-workbench-package`.

### Requirement: Tag regulator uses YAML-only valid tags handoff

The tag-regulator workflow SHALL hide valid tag file format from users and use
YAML internally.

#### Scenario: Workflow parameters are inspected

- **WHEN** the tag-regulator workflow manifest is loaded
- **THEN** user-visible parameters SHALL NOT include `valid_tags_format`.

#### Scenario: Skill request is built

- **WHEN** tag-regulator builds a SkillRunner request
- **THEN** it SHALL materialize `valid_tags` as YAML
- **AND** it SHALL send `parameter.valid_tags_format = "yaml"` internally.

### Requirement: Tag regulator writes suggestions through Synthesis

Tag-regulator suggestion intake SHALL mutate Synthesis tag vocabulary state, not
legacy tag vocabulary prefs.

#### Scenario: Suggested tag is accepted

- **WHEN** a user accepts a `suggest_tags` entry
- **THEN** the hook SHALL add it to Synthesis canonical tag vocabulary
- **AND** it SHALL NOT write `tagVocabularyJson`.

#### Scenario: Suggested tag is staged

- **WHEN** a suggested tag is staged or deferred
- **THEN** the hook SHALL persist it through Synthesis staged suggestion APIs
- **AND** it SHALL NOT write `tagVocabularyStagedJson`.

#### Scenario: Suggested tags are staged without clearing unrelated entries

- **WHEN** tag-regulator stages one or more suggested tags during result intake
- **THEN** the hook SHALL upsert those suggestions through Synthesis staged
  suggestion APIs
- **AND** it SHALL NOT clear unrelated staged suggestions as part of normal
  workflow result intake.

