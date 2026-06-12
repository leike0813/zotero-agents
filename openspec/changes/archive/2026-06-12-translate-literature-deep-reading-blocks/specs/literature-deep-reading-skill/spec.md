# literature-deep-reading-skill Specification

## ADDED Requirements

### Requirement: Stage 30 SHALL accept block translations

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/block-translations.json` after Stage 20 enrichment.

#### Scenario: Valid block translations are submitted

- **GIVEN** Stage 00 bootstrap views exist
- **AND** Stage 20 Analysis Layer views exist
- **AND** the agent writes a valid `block-translations.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-block-translations --payload runtime/payloads/block-translations.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL write `runtime/views/translation-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-translation.json`
- **AND** it SHALL return `kind: "literature_deep_reading_translated"` and `status: "translated"`
- **AND** it SHALL keep `final_html_available: false`.

### Requirement: Stage 30 SHALL preserve source block structure

The translation view SHALL preserve the source block order and bind translations to stable block ids.

#### Scenario: Translation view is generated

- **GIVEN** the source reading blocks contain translatable body blocks
- **WHEN** Stage 30 is submitted
- **THEN** `translation-view.json` SHALL list translated rows in source block order
- **AND** each row SHALL include block id, section anchor, kind, source markdown, translated markdown, status, and quality notes.

### Requirement: Stage 30 SHALL reject invalid block coverage

The runtime SHALL reject translations that do not match the bootstrap block structure.

#### Scenario: Unknown or duplicated block id is submitted

- **GIVEN** `block-translations.json` contains an unknown block id or repeats the same block id
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Required body block is missing

- **GIVEN** a non-formula block has `translate: true`
- **AND** no translation row is submitted for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: References block is submitted

- **GIVEN** a block is marked `translate: false`
- **AND** the payload contains a translation row for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Formula blocks SHALL be carried over when omitted from payload

Formula blocks SHALL not require agent-authored translation.

#### Scenario: Formula translation is omitted

- **GIVEN** a formula block has `translate: true`
- **AND** the payload does not contain that formula block
- **WHEN** Stage 30 is submitted
- **THEN** `translation-view.json` SHALL include the formula block with `status: "carried_over"`
- **AND** its translated markdown SHALL equal the source markdown.

### Requirement: Table translations SHALL remain table-like

Table block translations SHALL preserve table-like Markdown or HTML structure.

#### Scenario: Table translation is not table-like

- **GIVEN** a table block requires translation
- **AND** the submitted translated markdown is plain paragraph text
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.
