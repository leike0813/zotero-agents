## ADDED Requirements

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
