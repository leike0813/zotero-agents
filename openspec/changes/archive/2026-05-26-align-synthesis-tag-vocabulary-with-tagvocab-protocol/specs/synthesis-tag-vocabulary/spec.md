## ADDED Requirements

### Requirement: Synthesis tag vocabulary follows TagVocab v1

Synthesis Tag Vocabulary SHALL treat Zotero TagVocab v1 as the canonical vocabulary protocol for tag entries, facets, abbreviation registry, and source JSON shape.

#### Scenario: Protocol-native vocabulary imports

- **WHEN** an import payload contains top-level `tags`, `facets`, and `abbrevs`
- **THEN** the service SHALL parse the `tags` array as controlled vocabulary entries
- **AND** the preview SHALL expose non-empty additions or conflicts when valid entries exist.

#### Scenario: Legacy import shapes remain readable

- **WHEN** an import payload contains top-level `entries` or is itself an array
- **THEN** the service SHALL parse it as a compatibility input
- **AND** it SHALL apply the same TagVocab validation rules before commit.

#### Scenario: Canonical vocabulary uses TagVocab field names

- **WHEN** a new tag vocabulary transaction commits
- **THEN** `synthesis/tags/vocabulary.json` SHALL contain a TagVocab-compatible `tags` array
- **AND** it SHALL include protocol metadata sufficient to identify the TagVocab version, facets, updated time, abbreviation registry, and tag count.

#### Scenario: Existing legacy canonical files remain readable

- **WHEN** an existing canonical vocabulary file contains `entries`
- **THEN** the service SHALL load it without data loss
- **AND** subsequent writes SHALL use the TagVocab-compatible canonical shape.

### Requirement: TagVocab validation covers abbreviation casing

Synthesis Tag Vocabulary SHALL validate registered abbreviations according to the TagVocab abbreviation registry.

#### Scenario: Registered abbreviation uses canonical casing

- **WHEN** an entry tag contains a segment whose lowercase form exists in `abbrevs`
- **THEN** the segment SHALL use the registry value casing
- **AND** valid examples such as `ai_task:NER`, `model:DL/CNN`, and `data:LiDAR` SHALL pass when the registry defines those abbreviations.

#### Scenario: Registered abbreviation uses incorrect casing

- **WHEN** an entry tag contains a registered abbreviation segment with non-canonical casing
- **THEN** validation SHALL return a structured `abbrev_case_error`
- **AND** committing the invalid vocabulary SHALL fail.

### Requirement: TagVocab import preserves explicit merge behavior

Synthesis Tag Vocabulary SHALL map TagVocab import semantics into the existing explicit preview/apply workflow.

#### Scenario: Preview is non-mutating

- **WHEN** a Workbench user previews a TagVocab `tags/tags.json` payload
- **THEN** canonical vocabulary files SHALL NOT change.

#### Scenario: Explicit merge commits additions

- **WHEN** the user applies `merge-non-conflicting`
- **THEN** only non-conflicting imported tags SHALL be added to local canonical vocabulary.

#### Scenario: Explicit imported state replaces matching entries

- **WHEN** the user applies `use-imported`
- **THEN** imported entries SHALL replace local entries with the same tag
- **AND** local-only entries SHALL remain present.

### Requirement: Tag-regulator export remains stable

Synthesis Tag Vocabulary SHALL preserve the tag-regulator host contract while using TagVocab canonical storage internally.

#### Scenario: Tag-regulator requests valid tags

- **WHEN** tag-regulator calls the synthesis vocabulary export
- **THEN** the result SHALL be a deterministic array of active canonical tag strings
- **AND** it SHALL omit deprecated entries and management metadata.
