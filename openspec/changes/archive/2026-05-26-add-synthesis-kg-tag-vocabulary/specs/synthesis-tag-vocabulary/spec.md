## ADDED Requirements

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

Synthesis Tag Vocabulary SHALL import TagVocab-compatible payloads without silently replacing local canonical state.

#### Scenario: Import has no conflicts

- **WHEN** imported entries do not collide with local entries
- **THEN** the service SHALL produce a merge preview that can be committed as non-conflicting additions.

#### Scenario: Import has conflicting entries

- **WHEN** imported entries collide with local entries and contain different metadata
- **THEN** the service SHALL return a merge preview containing conflict records
- **AND** it SHALL NOT replace local canonical state until an explicit merge action is applied.

#### Scenario: Explicit import action commits

- **WHEN** the caller applies keep-local, use-imported, or merge-non-conflicting action
- **THEN** the resulting canonical state SHALL be deterministic
- **AND** the action SHALL be represented in the transaction receipt diagnostics.

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
