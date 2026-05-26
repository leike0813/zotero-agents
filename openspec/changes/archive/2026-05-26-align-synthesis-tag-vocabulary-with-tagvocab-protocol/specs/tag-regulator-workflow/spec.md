## ADDED Requirements

### Requirement: Tag regulator consumes Synthesis canonical vocabulary first

The tag-regulator workflow SHALL continue to prefer Synthesis canonical vocabulary when available, including vocabularies stored in TagVocab-compatible canonical shape.

#### Scenario: Canonical TagVocab vocabulary is available

- **WHEN** Synthesis canonical vocabulary contains active TagVocab entries
- **THEN** the tag-regulator request builder SHALL use the exported active tag strings as `valid_tags`
- **AND** the `valid_tags` payload shape SHALL remain compatible with existing tag-regulator skills.

#### Scenario: Canonical vocabulary is unavailable

- **WHEN** Synthesis canonical vocabulary cannot be loaded
- **THEN** the workflow MAY continue to use the existing prefs fallback path
- **AND** the failure SHALL NOT expose raw canonical metadata or diagnostics in the tag-regulator prompt payload.
