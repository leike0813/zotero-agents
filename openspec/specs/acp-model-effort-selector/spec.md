# acp-model-effort-selector Specification

## Purpose
TBD - created by archiving change split-acp-model-reasoning-effort-selector. Update Purpose after archive.
## Requirements
### Requirement: Raw ACP model IDs SHALL be preserved without suffix folding

ACP chat frontend SHALL present every advertised raw model option as its own
distinct model choice. It SHALL NOT infer, strip, merge or fold suffixes such as
`@low`, `@high`, `@medium`, `:thinking` or provider version markers, and it SHALL
NOT derive a separate reasoning selector from model identifiers.

#### Scenario: Effort-suffixed models remain separate model choices

- **GIVEN** raw models `gpt-5@low`, `gpt-5@medium`, and `gpt-5@high`
- **WHEN** the ACP snapshot is projected for the sidebar
- **THEN** the model selector SHALL contain all three raw identifiers
- **AND** it SHALL NOT collapse them into a single `gpt-5` option.

#### Scenario: Suffixed and versioned models are never normalized

- **GIVEN** raw models such as `some-model:v:thinking` and `model@low`
- **WHEN** the snapshot is projected
- **THEN** each raw identifier SHALL be retained verbatim
- **AND** no reasoning effort value SHALL be inferred from its suffix.

#### Scenario: Display and raw model entries stay one-to-one

- **GIVEN** an ACP state exposes both a display model list and a raw model list
- **WHEN** the projection is built for a backend advertising four distinct raw
  model ids
- **THEN** every display entry SHALL correspond to exactly one raw id carrying
  the same value
- **AND** several raw ids SHALL NOT be merged into one shared model name.

### Requirement: Reasoning state SHALL come only from explicit backend metadata

Reasoning selection SHALL be derived solely from backend-advertised reasoning
metadata such as an explicit `thought_level` selector. Reasoning SHALL NOT be
derived from model identifier variants, and no default reasoning value SHALL be
inferred when the backend advertises none.

#### Scenario: Advertised thought level is the reasoning source

- **WHEN** live session configuration advertises a `thought_level` selector
- **THEN** its advertised choices and current value SHALL be used as reasoning state.

#### Scenario: No advertised reasoning leaves reasoning unset

- **WHEN** the backend advertises no explicit reasoning metadata
- **THEN** the reasoning selection SHALL remain unset
- **AND** the frontend SHALL NOT derive reasoning from model identifier variants.

### Requirement: Frontend selections SHALL map back to raw ACP model IDs

Changing model or reasoning effort SHALL apply the matching ACP model or
configuration value through the control mechanism advertised by the active ACP
session. A backend rejection of a configuration value SHALL remain a visible
failure and SHALL NOT be downgraded into a different effective selection.

#### Scenario: Changing effort maps to advertised config option

- **GIVEN** the active ACP session advertises a `thought_level` config option
- **WHEN** the user selects a reasoning effort
- **THEN** the ACP adapter SHALL call `session/set_config_option` with the
  thought-level config id and selected value.

#### Scenario: Kilo none falls back to the model default

- **GIVEN** the active ACP session rejects a `thought_level` config option value
- **WHEN** the user selects that reasoning value
- **THEN** the frontend SHALL surface the backend rejection
- **AND** it SHALL NOT silently retain or reapply a previous reasoning value as
  the effective selection
- **AND** no backend-specific downgrade to the model default SHALL occur.

#### Scenario: Legacy model variant mapping remains available

- **GIVEN** the active ACP session does not advertise a model config option
- **WHEN** the user selects a raw model
- **THEN** the frontend SHALL apply that raw ACP model id through the existing
  native model control path
- **AND** it SHALL NOT derive a model id from a reasoning value.

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
