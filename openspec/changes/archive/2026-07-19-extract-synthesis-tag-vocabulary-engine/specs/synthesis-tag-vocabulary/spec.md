## MODIFIED Requirements

### Requirement: Tag protocol validation is deterministic

Synthesis Tag Vocabulary SHALL validate tag entries through the configured Tag Vocabulary engine against the TagVocab-compatible protocol before committing canonical state.

#### Scenario: Invalid tag format is reported

- **WHEN** an entry tag does not match `^[a-z_]+:[a-zA-Z0-9/_.-]+$`
- **THEN** engine validation SHALL return a structured warning for that tag
- **AND** the warning SHALL identify the failing code and tag value.

#### Scenario: Unknown facet is reported

- **WHEN** an entry facet is not one of `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, or `status`
- **THEN** engine validation SHALL return a structured warning for that tag
- **AND** committing the invalid state SHALL fail inside the existing repository transaction.

#### Scenario: Deprecated replacement is checked

- **WHEN** a deprecated entry declares a replacement tag that is missing from the vocabulary
- **THEN** engine validation SHALL return a warning tied to the deprecated tag.

### Requirement: Tag index projection is rebuildable

Synthesis Tag Vocabulary SHALL use the configured Tag Vocabulary engine to build the rebuildable `tag-index` projection model for lookup, alias, abbrev, validation, and search data.

#### Scenario: Canonical vocabulary change marks projection stale

- **WHEN** a vocabulary transaction commits
- **THEN** the `tag-index` projection SHALL be marked stale in the foundation projection registry.

#### Scenario: Projection rebuild records state

- **WHEN** the Tag Vocabulary engine returns a strictly rebuilt index for the current manifest basis
- **THEN** the projection registry SHALL record schema version, source manifest hash, stale flag, last rebuild time, and diagnostics.

#### Scenario: Projection computation fails

- **WHEN** the configured engine throws, is cancelled, exceeds bounds, or returns a malformed result
- **THEN** the previous projection registry state SHALL remain unchanged.

#### Scenario: Projection cache is deleted

- **WHEN** local projection cache state is missing
- **THEN** the service SHALL be able to rebuild lookup data from canonical SQLite state.
