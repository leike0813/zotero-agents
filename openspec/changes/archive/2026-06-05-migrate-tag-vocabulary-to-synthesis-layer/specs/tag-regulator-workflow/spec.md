## MODIFIED Requirements

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

## ADDED Requirements

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
