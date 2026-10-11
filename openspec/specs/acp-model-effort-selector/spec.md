# acp-model-effort-selector Specification

## Purpose
TBD - created by archiving change split-acp-model-reasoning-effort-selector. Update Purpose after archive.
## Requirements
### Requirement: Model variants SHALL be folded into display model and effort selectors

When raw ACP model options contain multiple recognized effort variants for the same base model, the ACP chat frontend SHALL show one display model option and a separate reasoning effort selector.

#### Scenario: Recognized suffix variants are folded

- **GIVEN** raw models `gpt-5@low`, `gpt-5@medium`, and `gpt-5@high`
- **WHEN** the ACP snapshot is projected for the sidebar
- **THEN** the display model selector SHALL contain `gpt-5` once
- **AND** the reasoning selector SHALL contain `low`, `medium`, and `high`

#### Scenario: Plain models remain unchanged

- **GIVEN** raw models without multiple recognized effort variants
- **WHEN** the ACP snapshot is projected for the sidebar
- **THEN** the display model selector SHALL show the raw models
- **AND** the reasoning selector SHALL be hidden or unavailable

### Requirement: Frontend selections SHALL map back to raw ACP model IDs

Changing display model or reasoning effort SHALL apply the matching ACP model or
configuration value through the control mechanism advertised by the active ACP
session.

When a Kilo ACP session rejects a `thought_level` config option value with
JSON-RPC invalid parameters (`-32602`) and the error message indicates an
effort-related rejection, the frontend SHALL retain its last confirmed reasoning
selection and leave the session's model-default reasoning configuration in
effect. All other configuration failures SHALL remain visible errors.

#### Scenario: Changing effort maps to advertised config option

- **GIVEN** the active ACP session advertises a `thought_level` config option
- **WHEN** the user selects a reasoning effort
- **THEN** the ACP adapter SHALL call `session/set_config_option` with the
  thought-level config id and selected value.

#### Scenario: Kilo none falls back to the model default

- **GIVEN** the active Kilo ACP session rejects a `thought_level` value with code `-32602` and error message indicating an effort-related rejection
- **WHEN** the user selects a reasoning effort value that triggers the rejection
- **THEN** the frontend SHALL not apply the rejected value to its current selection
- **AND** the current session continues with the model-default reasoning setting.

#### Scenario: Legacy model variant mapping remains available

- **GIVEN** the active ACP session does not advertise a model or thought-level
  config option
- **WHEN** the user changes display model or reasoning effort
- **THEN** the frontend SHALL map the selection to a raw ACP model id and use
  the existing model control path.

### Requirement: Model provider identity SHALL survive projection and persistence

ACP model selections SHALL retain their advertised raw values and provider metadata through runtime, cache and workflow selection. Provider extraction SHALL preserve nested model paths and version suffixes, decode recognized structured values safely, and leave ambiguous values unclassified.

#### Scenario: Nested and structured model values
- **WHEN** a catalog advertises `openrouter/anthropic/claude`, `bedrock/model:0`, or `m:minimax:MiniMax-M2.7:u`
- **THEN** the picker SHALL group them under their actual providers and preserve their original values when selected.

#### Scenario: Opaque grouped catalog
- **WHEN** a provider group advertises an opaque model value
- **THEN** its provider and name SHALL remain available after cache restoration.

### Requirement: ACP panels SHALL share a searchable grouped model picker

Chat and Skills SHALL show ordinary providers collapsed on opening, with expanded favorites above them. Search SHALL filter providers, names and identifiers including favorites, expand matching groups, and restore prior collapse state when cleared. The popup SHALL have a fixed search header, one scrollable list bounded to 420 pixels and the viewport, and keyboard dismissal and selection.

#### Scenario: Search and select a model
- **WHEN** the user searches a provider or model identifier
- **THEN** matching models SHALL be visible and selecting one SHALL close the popup and select its advertised value.

### Requirement: Model favorites SHALL persist per backend

Stars SHALL toggle favorites without selecting a model or closing the popup. Favorites SHALL be shared by Chat and Skills and persist across sessions. Missing catalog entries SHALL remain stored but hidden. Favorite changes SHALL publish only the affected composer and SHALL preserve transcript and unrelated chrome DOM identity.

#### Scenario: Favorite from either ACP panel
- **WHEN** the user stars a model in Chat or Skills
- **THEN** it SHALL appear in the expanded favorites section in both panels for that backend and remain selected independently of the favorite toggle.
