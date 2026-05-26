# synthesis-tag-vocabulary Specification

## Purpose
TBD - created by archiving change add-synthesis-kg-tag-vocabulary. Update Purpose after archive.
## Requirements
### Requirement: Canonical tag vocabulary files are initialized and persisted

Synthesis Tag Vocabulary SHALL store its canonical state under `synthesis/tags/` using plugin-safe runtime persistence and the Synthesis foundation transaction boundary.

#### Scenario: Empty tag vocabulary store is initialized

- **WHEN** the tag vocabulary service loads against a KG store without tag assets
- **THEN** it SHALL initialize readable canonical assets for vocabulary, aliases, abbrev, protocol, and manifest
- **AND** it SHALL keep the files under `synthesis/tags/`.

#### Scenario: Valid vocabulary transaction commits

- **WHEN** a valid vocabulary update writes one or more tag assets
- **THEN** the service SHALL commit through the foundation canonical transaction helper
- **AND** it SHALL return a receipt with changed relative asset paths.

#### Scenario: Invalid vocabulary transaction is rejected

- **WHEN** a vocabulary update contains invalid protocol data
- **THEN** the service SHALL reject the update
- **AND** it SHALL NOT replace the existing target asset.

### Requirement: Tag protocol validation is deterministic

Synthesis Tag Vocabulary SHALL validate tag entries against the TagVocab-compatible protocol before committing canonical state.

#### Scenario: Invalid tag format is reported

- **WHEN** an entry tag does not match `^[a-z_]+:[a-zA-Z0-9/_.-]+$`
- **THEN** validation SHALL return a structured warning for that tag
- **AND** the warning SHALL identify the failing code and tag value.

#### Scenario: Unknown facet is reported

- **WHEN** an entry facet is not one of `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, or `status`
- **THEN** validation SHALL return a structured warning for that tag
- **AND** committing the invalid state SHALL fail.

#### Scenario: Deprecated replacement is checked

- **WHEN** a deprecated entry declares a replacement tag that is missing from the vocabulary
- **THEN** validation SHALL return a warning tied to the deprecated tag.

### Requirement: Tag vocabulary import uses merge preview on conflicts

Synthesis Tag Vocabulary SHALL import TagVocab-compatible payloads through an explicit preview and apply workflow.

#### Scenario: Preview is non-mutating

- **WHEN** a Workbench user previews an import payload
- **THEN** the preview SHALL expose additions, removals, and conflicts in the UI snapshot
- **AND** canonical tag vocabulary assets SHALL NOT change.

#### Scenario: Explicit import action commits

- **WHEN** the user applies `use-imported` or `merge-non-conflicting`
- **THEN** the service SHALL commit the resulting canonical vocabulary through the foundation transaction boundary
- **AND** a successful commit SHALL be eligible for Git Sync autosync.

#### Scenario: Conflicts are not silently replaced

- **WHEN** the preview contains conflicts and the user has not applied an explicit action
- **THEN** local canonical vocabulary SHALL remain unchanged.

### Requirement: Tag index projection is rebuildable

Synthesis Tag Vocabulary SHALL maintain a rebuildable `tag-index` projection model for lookup, alias, abbrev, validation, and search data.

#### Scenario: Canonical vocabulary change marks projection stale

- **WHEN** a vocabulary transaction commits
- **THEN** the `tag-index` projection SHALL be marked stale in the foundation projection registry.

#### Scenario: Projection rebuild records state

- **WHEN** the tag index projection is rebuilt from canonical files
- **THEN** the projection registry SHALL record schema version, source manifest hash, stale flag, last rebuild time, and diagnostics.

#### Scenario: Projection cache is deleted

- **WHEN** local projection cache state is missing
- **THEN** the service SHALL be able to rebuild lookup data from canonical files.

### Requirement: Tag vocabulary export serves tag-regulator

Synthesis Tag Vocabulary SHALL provide a stable export that tag-regulator can use as `valid_tags`.

#### Scenario: Export strips management metadata

- **WHEN** tag-regulator requests controlled tags
- **THEN** the export SHALL contain active canonical tag strings in deterministic order
- **AND** it SHALL exclude note, source, deprecated, and UI-only metadata.

#### Scenario: Deprecated tags are excluded by default

- **WHEN** canonical vocabulary contains deprecated entries
- **THEN** the default tag-regulator export SHALL omit deprecated tags.

### Requirement: Tag vocabulary diagnostics are sanitized

Synthesis Tag Vocabulary SHALL persist diagnostics without leaking tokens, secrets, or raw absolute runtime paths.

#### Scenario: Failure diagnostics include sensitive input

- **WHEN** validation or persistence failure details contain tokens, secrets, or absolute paths
- **THEN** persisted diagnostics SHALL redact sensitive values
- **AND** diagnostics SHALL retain only safe scope, relative path, hash, code, and concise reason fields.

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

