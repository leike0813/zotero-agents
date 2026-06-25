## ADDED Requirements

### Requirement: Tag bootstrapper workflow SHALL run without item selection

The built-in literature workbench package SHALL include a core SkillRunner workflow with id `tag-bootstrapper` that can run without a Zotero item selection.

#### Scenario: Workflow is loaded as a core no-selection workflow

- **WHEN** built-in literature workbench workflows are scanned
- **THEN** `tag-bootstrapper` SHALL be loaded
- **AND** its display metadata SHALL mark it as a core workflow
- **AND** its trigger SHALL NOT require selection
- **AND** its request SHALL create a SkillRunner interactive job for skill id `tag-bootstrapper`

### Requirement: Tag bootstrapper request SHALL include current vocabulary context

The workflow build hook SHALL read the current Synthesis tag vocabulary and provide the skill with existing entries and protocol constraints.

#### Scenario: Existing vocabulary is sent to the skill

- **GIVEN** the current vocabulary contains controlled tag entries
- **WHEN** `tag-bootstrapper` builds its SkillRunner request
- **THEN** the request input SHALL include `existing_tags` with tag, facet, and note fields where available
- **AND** the request input SHALL include protocol facets, tag pattern, and max tag length
- **AND** the request parameters SHALL include `tag_note_language`

### Requirement: Tag bootstrapper skill SHALL provide governed add-tag objects

The built-in `tag-bootstrapper` skill package SHALL instruct agents to produce `add_tags` objects that are semantically equivalent to controlled vocabulary suggestions.

#### Scenario: Skill instructions define the runtime contract

- **WHEN** an agent runs the `tag-bootstrapper` skill
- **THEN** `SKILL.md` SHALL require reading `references/tag_standard.md` before generating tags
- **AND** `SKILL.md` SHALL explain the skill purpose, interaction flow, tag generation rules, output contract, and LLM/script responsibility boundary
- **AND** each successful `add_tags` entry SHALL include non-empty `tag` and `note`
- **AND** `facet` MAY be included or derived from the tag prefix

### Requirement: Tag bootstrapper output SHALL be normalized and validated deterministically

The built-in skill package SHALL include deterministic scripts for output normalization and validation.

#### Scenario: Output normalization prepares stable add-tags

- **WHEN** `scripts/normalize_output.py` receives a candidate output JSON file
- **THEN** it SHALL deduplicate `add_tags` by lower-case tag
- **AND** it SHALL fill missing `facet` from the tag prefix when possible
- **AND** it SHALL sort `add_tags` stably
- **AND** it SHALL normalize warnings to strings

#### Scenario: Output validation enforces strict local gates

- **WHEN** `scripts/validate_output.py` receives a normalized output JSON file
- **THEN** it SHALL require top-level `add_tags`, `warnings`, `error`, and `provenance`
- **AND** it SHALL require each `add_tags` item to contain non-empty `tag` and `note`
- **AND** it SHALL reject duplicate returned tags by lower-case tag
- **AND** it SHALL require non-null errors to include non-empty `type` and `message`
- **AND** it SHALL require `provenance.generated_at` to be UTC ISO-8601 ending in `Z`

### Requirement: Tag bootstrapper schema SHALL remain structured-output friendly

The skill output schema SHALL describe the stable output shape without over-constraining nullable error and audit fields that structured-output renderers may rewrite.

#### Scenario: Schema permits audit extension while validation remains strict

- **WHEN** `assets/output.schema.json` is inspected
- **THEN** it SHALL define `add_tags`, `warnings`, `error`, and `provenance`
- **AND** it SHALL allow optional audit fields such as `kind`, `status`, `provenance.input_hash`, and `provenance.model`
- **AND** it SHALL NOT require nested `error.type` or `error.message` at schema level
- **AND** it SHALL NOT require nested `provenance.generated_at` at schema level
- **AND** strict checks for those fields SHALL be performed by `scripts/validate_output.py`

### Requirement: Tag bootstrapper apply hook SHALL write only validated vocabulary additions

The workflow apply hook SHALL treat the formal Synthesis tag vocabulary service as the write boundary.

#### Scenario: Skill result is applied to the formal vocabulary

- **GIVEN** the skill result has `error: null`
- **AND** `add_tags` is an object array with usable `tag` values
- **WHEN** the apply hook runs
- **THEN** it SHALL reload the current formal vocabulary
- **AND** it SHALL skip returned tags that duplicate existing entries by lower-case tag
- **AND** it SHALL skip duplicate returned tags by lower-case tag
- **AND** it SHALL infer a missing facet from the tag prefix
- **AND** it SHALL save existing entries plus accepted additions through `saveTagVocabulary`

#### Scenario: Invalid or failed skill output does not pollute vocabulary

- **WHEN** the skill result has a non-null `error`
- **OR** `add_tags` is malformed
- **OR** Synthesis tag vocabulary validation rejects an addition
- **THEN** the apply hook SHALL NOT partially write invalid vocabulary additions

### Requirement: Tags empty state SHALL expose bootstrap only for a truly empty vocabulary

The Synthesis Workbench tags page SHALL expose tag bootstrapping only when the formal vocabulary has no rows.

#### Scenario: Vocabulary is empty

- **GIVEN** the tags vocabulary contains zero rows
- **WHEN** the tags page renders the vocabulary subview
- **THEN** the empty state SHALL show a bootstrap action
- **AND** clicking the action SHALL send the `runTagBootstrapper` host command

#### Scenario: Filters hide existing vocabulary rows

- **GIVEN** the tags vocabulary contains at least one row
- **AND** current filters hide all visible rows
- **WHEN** the tags page renders the vocabulary subview
- **THEN** the empty state SHALL NOT show the bootstrap action
